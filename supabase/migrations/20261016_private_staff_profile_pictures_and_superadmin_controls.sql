-- Remove the legacy permissive policy that let librarians update profile rows
-- directly. Account role/status changes and management are reserved for the
-- active super administrator; staff may still update their own safe fields.
DROP POLICY IF EXISTS "Admin Manage Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Own Or Admin" ON public.profiles;
DROP POLICY IF EXISTS "Profiles Update Own Or Super Admin" ON public.profiles;

CREATE POLICY "Profiles Update Own Or Super Admin"
ON public.profiles
FOR UPDATE TO authenticated
USING (
  public.is_library_session_active()
  AND (id = auth.uid() OR public.is_super_admin())
)
WITH CHECK (
  public.is_library_session_active()
  AND (id = auth.uid() OR public.is_super_admin())
);

-- Keep self-service profile edits narrow. A staff member may update only their
-- own name, phone, and the exact path for their own private profile picture.
-- Only an active super administrator may update another user's profile.
CREATE OR REPLACE FUNCTION public.guard_profile_privilege_changes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Trusted server-side operations use the service role and are checked in the
  -- server function that performs them.
  IF auth.uid() IS NULL THEN RETURN NEW; END IF;

  IF OLD.id IS DISTINCT FROM auth.uid() AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the active super administrator may update another profile.';
  END IF;

  IF OLD.id = auth.uid() THEN
    IF NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status THEN
      RAISE EXCEPTION 'You cannot change your own role or account status.';
    END IF;

    IF (to_jsonb(NEW) - ARRAY['full_name', 'phone', 'updated_at', 'avatar_url'])
       IS DISTINCT FROM
       (to_jsonb(OLD) - ARRAY['full_name', 'phone', 'updated_at', 'avatar_url']) THEN
      RAISE EXCEPTION 'You may update only your own name, phone number, and profile picture.';
    END IF;
  END IF;

  IF NEW.avatar_url IS DISTINCT FROM OLD.avatar_url THEN
    IF OLD.id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Profile pictures may only be changed by their owner.';
    END IF;
    IF OLD.status <> 'active'
       OR OLD.role NOT IN ('super_admin', 'librarian', 'assistant_librarian', 'staff') THEN
      RAISE EXCEPTION 'Only an active staff account may change its profile picture.';
    END IF;
    IF NEW.avatar_url IS NOT NULL
       AND NEW.avatar_url IS DISTINCT FROM (OLD.id::text || '/profile-picture') THEN
      RAISE EXCEPTION 'Profile pictures must use the account''s own private storage path.';
    END IF;
  END IF;

  IF NEW.role = 'super_admin' AND OLD.role IS DISTINCT FROM 'super_admin' THEN
    RAISE EXCEPTION 'A new super administrator cannot be created or promoted through profile management.';
  END IF;
  IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the active super administrator may change a super-administrator account.';
  END IF;

  RETURN NEW;
END;
$$;

-- The project has no existing Storage buckets or object policies. Use one
-- dedicated private bucket, with a small allowlist and a fixed per-user path.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'staff-profile-pictures',
  'staff-profile-pictures',
  FALSE,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']::text[]
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  public = FALSE,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Staff read own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Staff upload own profile picture" ON storage.objects;
DROP POLICY IF EXISTS "Staff replace own profile picture" ON storage.objects;

CREATE POLICY "Staff read own profile picture"
ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'staff-profile-pictures'
  AND name = (auth.uid()::text || '/profile-picture')
  AND public.is_library_session_active()
  AND public.current_user_role() IN ('super_admin', 'librarian', 'assistant_librarian', 'staff')
);

CREATE POLICY "Staff upload own profile picture"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'staff-profile-pictures'
  AND name = (auth.uid()::text || '/profile-picture')
  AND public.is_library_session_active()
  AND public.current_user_role() IN ('super_admin', 'librarian', 'assistant_librarian', 'staff')
);

CREATE POLICY "Staff replace own profile picture"
ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'staff-profile-pictures'
  AND name = (auth.uid()::text || '/profile-picture')
  AND public.is_library_session_active()
  AND public.current_user_role() IN ('super_admin', 'librarian', 'assistant_librarian', 'staff')
)
WITH CHECK (
  bucket_id = 'staff-profile-pictures'
  AND name = (auth.uid()::text || '/profile-picture')
  AND public.is_library_session_active()
  AND public.current_user_role() IN ('super_admin', 'librarian', 'assistant_librarian', 'staff')
);
