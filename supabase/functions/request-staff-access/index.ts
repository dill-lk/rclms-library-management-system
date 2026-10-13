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

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid staff access request." }, 400);
  }

  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const fullName = typeof payload.name === "string" ? payload.name.trim() : "";
  const department = typeof payload.designation === "string" ? payload.designation.trim().slice(0, 120) : "";

  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ message: "Enter a valid email address." }, 400);
  }
  if (fullName.length < 2 || fullName.length > 120) {
    return jsonResponse({ message: "Enter a name between 2 and 120 characters." }, 400);
  }
  if (password.length < 6 || password.length > 128) {
    return jsonResponse({ message: "Password must be between 6 and 128 characters." }, 400);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ message: "Staff access requests are not available right now." }, 503);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "staff",
      department: department || null,
      admin_access_requested: true,
    },
  });

  if (createError || !created.user) {
    const errorText = createError?.message?.toLowerCase() ?? "";
    const duplicate = errorText.includes("already registered")
      || errorText.includes("already been registered")
      || errorText.includes("already exists")
      || errorText.includes("user already");
    return jsonResponse({
      message: duplicate
        ? "An account with this email already exists. Sign in or contact the library administrator."
        : "The staff access request could not be created. Check the details or try again later.",
    }, duplicate ? 409 : 400);
  }

  // The Auth trigger creates this row as role=staff/status=pending and skips
  // public.members. Fail closed if the required migration is not active.
  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, role, status")
    .eq("id", created.user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== "staff" || profile.status !== "pending") {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => undefined);
    return jsonResponse({ message: "Staff access requests are not configured safely yet. Please try again later." }, 503);
  }

  return jsonResponse({
    success: true,
    message: "Your request is pending review by the main administrator. You will not have library-management access until an allowed staff role is approved.",
  }, 201);
});
