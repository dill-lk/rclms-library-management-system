-- Optional book covers are stored in Supabase Storage, never in Postgres rows.
-- At the 120 KiB per-image ceiling, 7,000 covers use at most about 820 MiB,
-- leaving some of the 1 GiB project storage quota for other files.
BEGIN;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'book-covers',
  'book-covers',
  TRUE,
  122880,
  ARRAY['image/webp']::text[]
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Staff upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Staff delete book covers" ON storage.objects;

CREATE POLICY "Staff upload book covers"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'book-covers'
  AND public.is_library_session_active()
  AND public.current_user_role() IN ('super_admin', 'librarian', 'assistant_librarian')
);

CREATE POLICY "Staff delete book covers"
ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'book-covers'
  AND public.is_library_session_active()
  AND public.current_user_role() IN ('super_admin', 'librarian', 'assistant_librarian')
);

-- Book covers are public read-only objects, but uploads and deletion remain
-- restricted to active catalogue staff. Existing rows and objects are untouched.
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
      language, description, shelf_location, section, tags, cover_url,
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
      nullif(btrim(p_book->>'cover_url'), ''),
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
