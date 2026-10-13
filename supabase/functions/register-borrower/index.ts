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

const isBorrowerRole = (role: unknown): role is "student" | "teacher" =>
  role === "student" || role === "teacher";

const findUserByEmail = async (admin: ReturnType<typeof createClient>, email: string) => {
  for (let page = 1; page <= 10; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.toLowerCase() === email);
    if (match) return match;
    if (data.users.length < 1000) break;
  }
  return null;
};

Deno.serve(async (request: Request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST") return jsonResponse({ message: "Method not allowed." }, 405);

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ message: "Invalid registration request." }, 400);
  }

  const role = payload.role;
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload.password === "string" ? payload.password : "";
  const fullName = typeof payload.name === "string" ? payload.name.trim() : "";
  const admissionNo = typeof payload.admissionNo === "string" ? payload.admissionNo.trim().slice(0, 80) : "";
  const grade = typeof payload.grade === "string" ? payload.grade.trim().slice(0, 80) : "";
  const department = typeof payload.designation === "string" ? payload.designation.trim().slice(0, 120) : "";

  if (!isBorrowerRole(role)) return jsonResponse({ message: "Only student and teacher accounts can register here." }, 400);
  if (!email || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return jsonResponse({ message: "Enter a valid email address." }, 400);
  }
  if (fullName.length < 2 || fullName.length > 120) return jsonResponse({ message: "Enter a name between 2 and 120 characters." }, 400);
  if (password.length < 6 || password.length > 128) return jsonResponse({ message: "Password must be between 6 and 128 characters." }, 400);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return jsonResponse({ message: "Registration service is not configured." }, 503);

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const userMetadata = {
    full_name: fullName,
    role,
    admission_no: admissionNo || null,
    grade: role === "student" ? grade || null : null,
    department: role === "teacher" ? department || null : null,
  };

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: userMetadata,
  });

  if (!createError && created.user) {
    return jsonResponse({ success: true, message: "Reader account created." }, 201);
  }

  const errorText = createError?.message?.toLowerCase() ?? "";
  const duplicate = errorText.includes("already registered") || errorText.includes("already been registered") || errorText.includes("already exists") || errorText.includes("user already");
  if (!duplicate) {
    return jsonResponse({ message: "The account could not be created. Check the details or try again later." }, 400);
  }

  try {
    const existing = await findUserByEmail(admin, email);
    if (!existing) return jsonResponse({ message: "An account with this email already exists. Sign in or reset its password." }, 409);

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("role, status")
      .eq("id", existing.id)
      .maybeSingle();
    if (profileError) return jsonResponse({ message: "The existing account could not be checked safely. Contact library staff." }, 503);

    const existingRole = profile?.role ?? existing.user_metadata?.role;
    if (!isBorrowerRole(existingRole) || existingRole !== role) {
      return jsonResponse({ message: "This email is already associated with a different library account. Contact library staff." }, 409);
    }
    if (profile?.status && profile.status !== "active") {
      return jsonResponse({ message: "This library account is inactive. Contact library staff." }, 403);
    }

    const { error: confirmError } = await admin.auth.admin.updateUserById(existing.id, { email_confirm: true });
    if (confirmError) return jsonResponse({ message: "This reader account could not be confirmed. Try again later." }, 503);

    return jsonResponse({ success: true, message: "Reader account confirmed. Sign in with its existing password." });
  } catch {
    return jsonResponse({ message: "The existing account could not be checked safely. Try again later." }, 503);
  }
});
