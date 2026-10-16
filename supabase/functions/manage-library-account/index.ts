import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const isUuid = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ success: false, message: "Method not allowed." }, 405);

  const authorization = request.headers.get("Authorization") || "";
  const token = authorization.replace(/^Bearer\s+/i, "").trim();
  if (!token || token === authorization) {
    return jsonResponse({ success: false, message: "Sign in with an active administrator account." }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ success: false, message: "Invalid account-management request." }, 400);
  }

  const action = payload.action;
  const targetUserId = typeof payload.targetUserId === "string" ? payload.targetUserId : "";
  if (!isUuid(targetUserId)) {
    return jsonResponse({ success: false, message: "The selected account could not be verified." }, 400);
  }
  if (action !== "set_password" && action !== "set_status") {
    return jsonResponse({ success: false, message: "Choose a supported account action." }, 400);
  }
  if (action === "set_password") {
    const password = typeof payload.password === "string" ? payload.password : "";
    if (password.length < 8 || password.length > 128) {
      return jsonResponse({ success: false, message: "Passwords must be between 8 and 128 characters." }, 400);
    }
  }
  if (action === "set_status" && payload.status !== "active" && payload.status !== "suspended") {
    return jsonResponse({ success: false, message: "Choose Active or Suspended for this account." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ success: false, message: "Secure account management is not configured on the server." }, 503);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: authenticated, error: authError } = await userClient.auth.getUser(token);
  if (authError || !authenticated.user) {
    return jsonResponse({ success: false, message: "Sign in again with an active administrator account." }, 401);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: actor, error: actorError } = await admin
    .from("profiles")
    .select("id, full_name, role, status")
    .eq("id", authenticated.user.id)
    .maybeSingle();
  if (actorError || !actor || actor.role !== "super_admin" || actor.status !== "active") {
    return jsonResponse({ success: false, message: "Only the active super administrator can manage accounts." }, 403);
  }

  const { data: sessionIsActive, error: sessionError } = await userClient.rpc("is_library_session_active");
  if (sessionError || sessionIsActive !== true) {
    return jsonResponse({ success: false, message: "This administrator sign-in session is not active." }, 403);
  }
  if (targetUserId === authenticated.user.id) {
    return jsonResponse({ success: false, message: "Use My Account to change your own password. The main administrator account cannot be suspended here." }, 400);
  }

  const { data: target, error: targetError } = await admin
    .from("profiles")
    .select("id, email, full_name, role, status")
    .eq("id", targetUserId)
    .maybeSingle();
  if (targetError || !target) {
    return jsonResponse({ success: false, message: "The selected account was not found." }, 404);
  }
  if (target.status === "pending") {
    return jsonResponse({ success: false, message: "Pending staff requests must be handled through the approval workflow." }, 409);
  }

  if (action === "set_status") {
    const nextStatus = payload.status as "active" | "suspended";
    if (target.role === "super_admin") {
      return jsonResponse({ success: false, message: "Super administrator accounts are protected from suspension." }, 403);
    }
    if (target.status === nextStatus) {
      return jsonResponse({ success: true, message: `This account is already ${nextStatus}.`, status: nextStatus });
    }

    const { error: sessionsError } = await admin
      .from("library_device_sessions")
      .update({ status: "signed_out", last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq("user_id", targetUserId)
      .in("status", ["active", "paused", "blocked"]);
    if (sessionsError) {
      console.error("Could not terminate the account's active library sessions:", sessionsError.message);
      return jsonResponse({ success: false, message: "Account access was not changed because existing sign-ins could not be safely closed." }, 503);
    }

    if (nextStatus === "suspended") {
      const { error: profileError } = await admin.from("profiles").update({ status: "suspended" }).eq("id", targetUserId);
      if (profileError) {
        console.error("Could not suspend the library profile:", profileError.message);
        return jsonResponse({ success: false, message: "The account could not be suspended. Try again." }, 500);
      }
      const { error: banError } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "876000h" });
      if (banError) {
        await admin.from("profiles").update({ status: target.status }).eq("id", targetUserId);
        console.error("Could not ban the Auth account:", banError.message);
        return jsonResponse({ success: false, message: "The sign-in service could not suspend this account. Its profile status was restored." }, 502);
      }
    } else {
      const { error: unbanError } = await admin.auth.admin.updateUserById(targetUserId, { ban_duration: "none" });
      if (unbanError) {
        console.error("Could not reactivate the Auth account:", unbanError.message);
        return jsonResponse({ success: false, message: "The sign-in service could not reactivate this account. Try again." }, 502);
      }
      const { error: profileError } = await admin.from("profiles").update({ status: "active" }).eq("id", targetUserId);
      if (profileError) {
        await admin.auth.admin.updateUserById(targetUserId, { ban_duration: target.status === "suspended" ? "876000h" : "none" });
        console.error("Could not reactivate the library profile:", profileError.message);
        return jsonResponse({ success: false, message: "The account profile could not be reactivated. The sign-in ban was restored." }, 500);
      }
    }

    const { error: auditError } = await admin.from("audit_logs").insert({
      user_id: authenticated.user.id,
      user_name: actor.full_name || authenticated.user.email || "Super administrator",
      action: nextStatus === "suspended" ? "account_suspended" : "account_reactivated",
      entity: "profiles",
      entity_id: targetUserId,
      details: { email: target.email, previousStatus: target.status, status: nextStatus },
    });
    if (auditError) console.error("Account status changed, but its audit event could not be saved:", auditError.message);

    return jsonResponse({
      success: true,
      status: nextStatus,
      message: nextStatus === "suspended"
        ? "The account is suspended, new sign-ins are blocked, and active library sign-ins were ended."
        : "The account is active again. The user must sign in again; previous sessions remain ended.",
    });
  }

  const password = payload.password as string;
  const { error: passwordError } = await admin.auth.admin.updateUserById(targetUserId, { password });
  if (passwordError) {
    console.error("Could not reset the account password:", passwordError.message);
    return jsonResponse({ success: false, message: "The password could not be changed. Check the password requirements and try again." }, 400);
  }

  const { error: sessionsError } = await admin
    .from("library_device_sessions")
    .update({ status: "signed_out", last_seen_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", targetUserId)
    .in("status", ["active", "paused", "blocked"]);
  const sessionWarning = sessionsError
    ? " The password changed, but existing library sessions could not be ended; suspend the account temporarily if access must stop immediately."
    : " Existing library sessions were ended, so the user must sign in with the new password.";
  if (sessionsError) console.error("Password changed, but existing sessions could not be ended:", sessionsError.message);

  const { error: auditError } = await admin.from("audit_logs").insert({
    user_id: authenticated.user.id,
    user_name: actor.full_name || authenticated.user.email || "Super administrator",
    action: "account_password_reset",
    entity: "profiles",
    entity_id: targetUserId,
    details: { email: target.email, activeSessionsEnded: !sessionsError },
  });
  if (auditError) console.error("Password changed, but its audit event could not be saved:", auditError.message);

  return jsonResponse({ success: true, message: `Password changed for ${target.email}.${sessionWarning}` });
});
