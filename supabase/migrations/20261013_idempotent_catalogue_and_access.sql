-- RCLMS safety migration
-- Apply this once in the Supabase SQL Editor after the base schema is installed.
-- The read-only query below reports pre-existing duplicate accessions. It does not
-- delete or merge records; reconcile any returned rows manually after review.

SELECT
  upper(btrim(isbn)) AS normalized_accession,
  array_agg(id ORDER BY created_at, id) AS book_ids,
  count(*) AS duplicate_count
FROM public.books
WHERE nullif(btrim(isbn), '') IS NOT NULL
GROUP BY upper(btrim(isbn))
HAVING count(*) > 1
ORDER BY count(*) DESC, upper(btrim(isbn));

SELECT
  user_id,
  array_agg(id ORDER BY created_at, id) AS member_record_ids,
  count(*) AS duplicate_count
FROM public.members
WHERE user_id IS NOT NULL
GROUP BY user_id
HAVING count(*) > 1
ORDER BY count(*) DESC, user_id;

BEGIN;

-- Reversible catalogue removal keeps circulation and copy history intact.
ALTER TABLE public.books
  ADD COLUMN IF NOT EXISTS is_archived BOOLEAN NOT NULL DEFAULT false;

-- These SECURITY DEFINER helpers read the protected profile table without
-- recursively invoking its RLS policies. They grant no data access themselves.
CREATE OR REPLACE FUNCTION public.is_library_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('super_admin', 'librarian', 'assistant_librarian')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_library_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('super_admin', 'librarian')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  );
$$;

-- Replace permissive policies that previously let every authenticated account
-- write all library tables. Catalog reads remain public as in the original app.
DROP POLICY IF EXISTS "Staff Manage Categories" ON public.categories;
DROP POLICY IF EXISTS "Staff Manage Authors" ON public.authors;
DROP POLICY IF EXISTS "Staff Manage Publishers" ON public.publishers;
DROP POLICY IF EXISTS "Staff Manage Books" ON public.books;
DROP POLICY IF EXISTS "Staff Manage Book Copies" ON public.book_copies;
DROP POLICY IF EXISTS "Staff Manage Members" ON public.members;
DROP POLICY IF EXISTS "Staff Manage Circulation" ON public.circulation;
DROP POLICY IF EXISTS "Staff Manage Fines" ON public.fines;
DROP POLICY IF EXISTS "Staff Manage Reservations" ON public.reservations;
DROP POLICY IF EXISTS "Staff Manage Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff Manage Settings" ON public.system_settings;

CREATE POLICY "Staff Manage Categories" ON public.categories FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Authors" ON public.authors FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Publishers" ON public.publishers FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Books" ON public.books FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Book Copies" ON public.book_copies FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Members" ON public.members FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Circulation" ON public.circulation FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Fines" ON public.fines FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Reservations" ON public.reservations FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Audit Logs" ON public.audit_logs FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());
CREATE POLICY "Staff Manage Settings" ON public.system_settings FOR ALL TO authenticated
  USING (public.is_library_staff()) WITH CHECK (public.is_library_staff());

-- Staff can see profiles; users can see and update their own non-privileged data.
-- Public signup is limited to a user's own active student/teacher profile.
DROP POLICY IF EXISTS "Users Read Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Update Own Profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin Manage Profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users Create Own Basic Profile" ON public.profiles;

CREATE POLICY "Users Read Profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_library_admin());
CREATE POLICY "Users Update Own Profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users Create Own Basic Profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = id
    AND role IN ('student', 'teacher')
    AND status = 'active'
  );
CREATE POLICY "Admin Manage Profiles" ON public.profiles FOR ALL TO authenticated
  USING (public.is_library_admin()) WITH CHECK (public.is_library_admin());

-- Self-service registration may create a borrower row only for the signed-in
-- user's matching basic role. Other member data remains staff-only.
DROP POLICY IF EXISTS "Users Read Own Member Record" ON public.members;
DROP POLICY IF EXISTS "Users Create Own Member Record" ON public.members;
CREATE POLICY "Users Read Own Member Record" ON public.members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_library_staff());
CREATE POLICY "Users Create Own Member Record" ON public.members FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND type IN ('student', 'teacher')
    AND EXISTS (
      SELECT 1
      FROM public.profiles AS p
      WHERE p.id = auth.uid()
        AND p.status = 'active'
        AND p.role = public.members.type
    )
  );

-- Keep self-service member creation idempotent across tabs and retry attempts.
CREATE OR REPLACE FUNCTION public.guard_single_auth_member()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text, 1));
  IF EXISTS (
    SELECT 1 FROM public.members AS m
    WHERE m.user_id = NEW.user_id AND m.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'This Auth account already has a library member record.';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_single_auth_member ON public.members;
CREATE TRIGGER trg_guard_single_auth_member
BEFORE INSERT OR UPDATE OF user_id ON public.members
FOR EACH ROW EXECUTE FUNCTION public.guard_single_auth_member();

-- Prevent a user from elevating their own profile through the own-profile UPDATE policy.
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

  IF OLD.id IS DISTINCT FROM auth.uid() AND NOT public.is_library_admin() THEN
    RAISE EXCEPTION 'Only a library administrator may update another profile.';
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.status IS DISTINCT FROM OLD.status)
     AND NOT public.is_library_admin() THEN
    RAISE EXCEPTION 'You cannot change your own role or account status.';
  END IF;

  IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
     AND NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only a super administrator may change a super-administrator account.';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_profile_privilege_changes ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_changes();

-- Serialize all book inserts/ISBN changes by normalized accession. This protects
-- older clients too and does not require deleting historical duplicate rows.
CREATE OR REPLACE FUNCTION public.guard_unique_book_accession()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  normalized_accession text;
BEGIN
  normalized_accession := upper(btrim(coalesce(NEW.isbn, '')));
  IF normalized_accession = '' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(normalized_accession, 0));
  IF EXISTS (
    SELECT 1
    FROM public.books AS b
    WHERE upper(btrim(coalesce(b.isbn, ''))) = normalized_accession
      AND b.id IS DISTINCT FROM NEW.id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format('Accession number %s is already in the catalogue.', btrim(NEW.isbn));
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_unique_book_accession ON public.books;
CREATE TRIGGER trg_guard_unique_book_accession
BEFORE INSERT OR UPDATE OF isbn ON public.books
FOR EACH ROW EXECUTE FUNCTION public.guard_unique_book_accession();

-- A single transaction creates the title and all physical copies. Repeated or
-- retried calls with the same accession reuse the existing matching title.
CREATE OR REPLACE FUNCTION public.save_catalogue_book_with_copies(
  p_book jsonb,
  p_copies jsonb
)
RETURNS TABLE(book_id uuid, created boolean, copy_count integer)
LANGUAGE plpgsql
SET search_path = ''
AS $$
DECLARE
  normalized_accession text;
  existing_count integer;
  existing_title text;
  existing_author text;
  created_book_id uuid;
  created_now boolean := false;
  actual_copy_count integer := 0;
BEGIN
  IF NOT public.is_library_staff() THEN
    RAISE EXCEPTION 'Only authorized library staff may add catalogue books.';
  END IF;

  normalized_accession := upper(btrim(coalesce(p_book->>'isbn', '')));
  IF normalized_accession = '' THEN
    RAISE EXCEPTION 'A book accession number is required.';
  END IF;
  IF nullif(btrim(p_book->>'title'), '') IS NULL OR nullif(btrim(p_book->>'author'), '') IS NULL THEN
    RAISE EXCEPTION 'A book title and author are required.';
  END IF;
  IF jsonb_typeof(p_copies) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'Physical copies must be supplied as a JSON array.';
  END IF;
  IF jsonb_array_length(p_copies) < 1 THEN
    RAISE EXCEPTION 'At least one physical copy is required.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_copies) AS c(copy_number integer, parigahana_ankaya text, barcode text)
    WHERE c.copy_number IS NULL OR c.copy_number < 1
       OR nullif(btrim(c.parigahana_ankaya), '') IS NULL
       OR nullif(btrim(c.barcode), '') IS NULL
  ) THEN
    RAISE EXCEPTION 'Every physical copy must have a copy number and unique accession/barcode.';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_copies) AS c(copy_number integer, parigahana_ankaya text, barcode text)
    GROUP BY c.copy_number HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_copies) AS c(copy_number integer, parigahana_ankaya text, barcode text)
    GROUP BY c.parigahana_ankaya HAVING count(*) > 1
  ) OR EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_copies) AS c(copy_number integer, parigahana_ankaya text, barcode text)
    GROUP BY c.barcode HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'The submitted physical copies contain duplicate copy numbers or barcodes.';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(normalized_accession, 0));
  SELECT count(*) INTO existing_count
  FROM public.books AS b
  WHERE upper(btrim(coalesce(b.isbn, ''))) = normalized_accession;

  IF existing_count > 1 THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = format('Accession number %s already has multiple catalogue records. Ask an administrator to review the duplicate report; no record was changed.', btrim(p_book->>'isbn'));
  ELSIF existing_count = 1 THEN
    SELECT b.id, b.title, b.author
      INTO created_book_id, existing_title, existing_author
    FROM public.books AS b
    WHERE upper(btrim(coalesce(b.isbn, ''))) = normalized_accession
    LIMIT 1
    FOR UPDATE;

    IF lower(btrim(coalesce(existing_title, ''))) IS DISTINCT FROM lower(btrim(p_book->>'title'))
       OR lower(btrim(coalesce(existing_author, ''))) IS DISTINCT FROM lower(btrim(p_book->>'author')) THEN
      RAISE EXCEPTION USING
        ERRCODE = '23505',
        MESSAGE = format('Accession number %s is already used by a different title or author.', btrim(p_book->>'isbn'));
    END IF;
  ELSE
    INSERT INTO public.books (
      title, subtitle, author, author_id, category_id, category_name,
      publisher, publisher_id, isbn, ddc_code, publication_year, edition,
      language, description, shelf_location, section, tags,
      total_copies, available_copies
    ) VALUES (
      btrim(p_book->>'title'), nullif(btrim(p_book->>'subtitle'), ''), btrim(p_book->>'author'),
      nullif(p_book->>'author_id', '')::uuid, nullif(p_book->>'category_id', '')::uuid,
      btrim(p_book->>'category_name'), nullif(btrim(p_book->>'publisher'), ''),
      nullif(p_book->>'publisher_id', '')::uuid, btrim(p_book->>'isbn'),
      nullif(btrim(p_book->>'ddc_code'), ''), nullif(p_book->>'publication_year', '')::integer,
      nullif(btrim(p_book->>'edition'), ''), coalesce(nullif(btrim(p_book->>'language'), ''), 'Sinhala'),
      nullif(p_book->>'description', ''), nullif(btrim(p_book->>'shelf_location'), ''),
      nullif(btrim(p_book->>'section'), ''),
      ARRAY(SELECT value FROM jsonb_array_elements_text(coalesce(p_book->'tags', '[]'::jsonb)) AS tags(value)),
      0, 0
    ) RETURNING id INTO created_book_id;
    created_now := true;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_copies) AS c(copy_number integer, parigahana_ankaya text, barcode text)
    JOIN public.book_copies AS existing
      ON existing.parigahana_ankaya = c.parigahana_ankaya
      OR existing.barcode = c.barcode
    WHERE existing.book_id <> created_book_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'One or more copy accessions/barcodes are already assigned to another title.';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_copies) AS c(copy_number integer, parigahana_ankaya text, barcode text)
    JOIN public.book_copies AS existing
      ON existing.book_id = created_book_id AND existing.copy_number = c.copy_number
    WHERE existing.parigahana_ankaya IS DISTINCT FROM c.parigahana_ankaya
       OR existing.barcode IS DISTINCT FROM c.barcode
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23505',
      MESSAGE = 'An existing physical-copy number has a different barcode; no copy was changed.';
  END IF;

  INSERT INTO public.book_copies (
    book_id, copy_number, parigahana_ankaya, barcode, shelf_location, condition, status
  )
  SELECT
    created_book_id, c.copy_number, c.parigahana_ankaya, c.barcode,
    nullif(btrim(c.shelf_location), ''), coalesce(nullif(c.condition, ''), 'new'),
    coalesce(nullif(c.status, ''), 'available')
  FROM jsonb_to_recordset(p_copies) AS c(
    copy_number integer, parigahana_ankaya text, barcode text,
    shelf_location text, condition text, status text
  )
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO actual_copy_count
  FROM public.book_copies AS c
  WHERE c.book_id = created_book_id;

  RETURN QUERY SELECT created_book_id, created_now, actual_copy_count;
END;
$$;

REVOKE ALL ON FUNCTION public.save_catalogue_book_with_copies(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_catalogue_book_with_copies(jsonb, jsonb) TO authenticated;

COMMIT;
