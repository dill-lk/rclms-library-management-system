BEGIN;

-- Pending staff requests are profiles with the non-privileged staff role.
-- Existing Member rows and their House values are intentionally left untouched.
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('active', 'inactive', 'suspended', 'pending'));

-- Reader accounts and staff requests are login profiles, not official Members.
-- Keep the existing profile behavior for student/teacher signups, but never
-- auto-create a Members row from an Auth signup.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  requested_role text := COALESCE(NEW.raw_user_meta_data ->> 'role', 'student');
BEGIN
  IF COALESCE(NEW.raw_user_meta_data ->> 'admin_access_requested', 'false') = 'true' THEN
    INSERT INTO public.profiles (id, email, full_name, role, department, status)
    VALUES (
      NEW.id,
      NEW.email,
      COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
      'staff',
      NULLIF(NEW.raw_user_meta_data ->> 'department', ''),
      'pending'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
  END IF;

  IF requested_role NOT IN ('student', 'teacher') THEN
    requested_role := 'student';
  END IF;

  INSERT INTO public.profiles (
    id, email, full_name, role, admission_no, grade, phone, department
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', split_part(NEW.email, '@', 1)),
    requested_role,
    NEW.raw_user_meta_data ->> 'admission_no',
    NEW.raw_user_meta_data ->> 'grade',
    NEW.raw_user_meta_data ->> 'phone',
    NEW.raw_user_meta_data ->> 'department'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

-- A pending requester may read only their own pending row to receive a clear
-- waiting-for-approval message at sign-in. This grants no library data access.
DROP POLICY IF EXISTS "Users Read Own Pending Staff Request" ON public.profiles;
CREATE POLICY "Users Read Own Pending Staff Request"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = (SELECT auth.uid()) AND role = 'staff' AND status = 'pending');

-- Only the already-active super administrator may approve a different user's
-- pending request, and the only assignable roles are librarian or assistant.
CREATE OR REPLACE FUNCTION public.approve_pending_staff_signup(
  p_profile_id uuid,
  p_assigned_role text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.current_user_has_role(ARRAY['super_admin']::text[]) THEN
    RAISE EXCEPTION 'Only the active super administrator may approve staff access requests.';
  END IF;
  IF p_profile_id IS NULL OR p_profile_id = auth.uid() THEN
    RAISE EXCEPTION 'A super administrator cannot approve their own access request.';
  END IF;
  IF p_assigned_role NOT IN ('librarian', 'assistant_librarian') THEN
    RAISE EXCEPTION 'Choose an allowed library staff role.';
  END IF;

  UPDATE public.profiles
  SET role = p_assigned_role,
      status = 'active',
      updated_at = timezone('utc'::text, now())
  WHERE id = p_profile_id
    AND role = 'staff'
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This pending staff request no longer exists or has already been reviewed.';
  END IF;

  RETURN TRUE;
END;
$$;
REVOKE ALL ON FUNCTION public.approve_pending_staff_signup(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_pending_staff_signup(uuid, text) TO authenticated;

-- Keep profile updates locked to the active super administrator. A request
-- cannot approve itself, be approved by another role, or become a super admin.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF OLD.id IS DISTINCT FROM auth.uid()
     AND NOT public.current_user_has_role(ARRAY['super_admin']::text[]) THEN
    RAISE EXCEPTION 'Only a super administrator may update another profile.';
  END IF;

  IF OLD.id = auth.uid()
     AND (to_jsonb(NEW) - ARRAY['full_name','phone','updated_at'])
         IS DISTINCT FROM (to_jsonb(OLD) - ARRAY['full_name','phone','updated_at']) THEN
    RAISE EXCEPTION 'You may update only your own name and phone number.';
  END IF;

  IF OLD.status = 'pending'
     AND (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status) THEN
    IF OLD.id = auth.uid() THEN
      RAISE EXCEPTION 'A staff access request cannot approve itself.';
    END IF;
    IF NOT public.current_user_has_role(ARRAY['super_admin']::text[]) THEN
      RAISE EXCEPTION 'Only the super administrator may review a staff access request.';
    END IF;
    IF NEW.status = 'active' AND NEW.role NOT IN ('librarian', 'assistant_librarian') THEN
      RAISE EXCEPTION 'A staff request must be approved with an allowed library staff role.';
    END IF;
  END IF;

  IF NEW.role = 'super_admin' AND OLD.role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'Super administrator accounts cannot be created or promoted through profile management.';
  END IF;

  IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
     AND NOT public.current_user_has_role(ARRAY['super_admin']::text[]) THEN
    RAISE EXCEPTION 'Only a super administrator may change a super-administrator account.';
  END IF;

  RETURN NEW;
END;
$$;

COMMIT;
