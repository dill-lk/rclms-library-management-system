BEGIN;

-- Keep reservation history protected just like circulation and stock-audit history.
-- Existing reservation rows are not changed; the constraint only changes future delete behavior.
ALTER TABLE public.reservations
  DROP CONSTRAINT IF EXISTS reservations_book_id_fkey;
ALTER TABLE public.reservations
  ADD CONSTRAINT reservations_book_id_fkey
  FOREIGN KEY (book_id) REFERENCES public.books(id) ON DELETE RESTRICT;

-- The original FOR ALL policy would also authorize DELETE for assistant librarians.
-- Keep their existing insert/update access, while matching permanent deletion to
-- the app's delete_books permission (active super administrators and librarians).
DROP POLICY IF EXISTS "Staff Manage Books" ON public.books;
DROP POLICY IF EXISTS "Staff Delete Books" ON public.books;
CREATE POLICY "Staff Delete Books"
  ON public.books
  FOR DELETE TO authenticated
  USING (public.current_user_has_role(ARRAY['super_admin', 'librarian']));

-- One RPC processes each selected title independently and returns confirmed outcomes.
-- Each title is locked and rechecked in the same transaction; no reservation or loan
-- history is removed. A stock-audit scan remains protected by its RESTRICT FK to copies.
CREATE OR REPLACE FUNCTION public.permanently_delete_archived_books(p_book_ids uuid[])
RETURNS TABLE(
  deleted_book_id uuid,
  book_title text,
  outcome text,
  linked_copy_count integer,
  message text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_requested_id uuid;
  v_title text;
  v_archived boolean;
  v_copy_count integer;
  v_circulation_count integer;
  v_reservation_count integer;
  v_rows_deleted integer;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.current_user_has_role(ARRAY['super_admin', 'librarian']) THEN
    RAISE EXCEPTION USING
      ERRCODE = '42501',
      MESSAGE = 'Only an active super administrator or librarian may permanently delete archived titles.';
  END IF;

  IF p_book_ids IS NULL THEN
    RETURN;
  END IF;

  FOR v_requested_id IN
    SELECT DISTINCT requested.id
    FROM unnest(p_book_ids) AS requested(id)
    WHERE requested.id IS NOT NULL
    ORDER BY requested.id
  LOOP
    deleted_book_id := v_requested_id;
    v_title := NULL;
    v_archived := NULL;

    SELECT b.title, b.is_archived
      INTO v_title, v_archived
    FROM public.books AS b
    WHERE b.id = v_requested_id
    FOR UPDATE;

    IF NOT FOUND THEN
      book_title := 'Archived record';
      outcome := 'failed';
      linked_copy_count := 0;
      message := 'The record no longer exists; no deletion was made.';
      RETURN NEXT;
      CONTINUE;
    END IF;

    book_title := v_title;
    SELECT count(*)::integer
      INTO v_copy_count
    FROM public.book_copies AS c
    WHERE c.book_id = v_requested_id;
    linked_copy_count := v_copy_count;

    IF NOT v_archived THEN
      outcome := 'blocked';
      message := 'The record is no longer archived. No deletion was made.';
      RETURN NEXT;
      CONTINUE;
    END IF;

    SELECT count(*)::integer
      INTO v_circulation_count
    FROM public.circulation AS c
    WHERE c.book_id = v_requested_id;

    SELECT count(*)::integer
      INTO v_reservation_count
    FROM public.reservations AS r
    WHERE r.book_id = v_requested_id;

    IF v_circulation_count > 0 THEN
      outcome := 'blocked';
      message := format('Deletion blocked by %s linked circulation history record(s). History was preserved.', v_circulation_count);
      RETURN NEXT;
      CONTINUE;
    END IF;

    IF v_reservation_count > 0 THEN
      outcome := 'blocked';
      message := format('Deletion blocked by %s linked reservation record(s). Reservation history was preserved.', v_reservation_count);
      RETURN NEXT;
      CONTINUE;
    END IF;

    BEGIN
      DELETE FROM public.books AS b
      WHERE b.id = v_requested_id
        AND b.is_archived = true;
      GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;

      IF v_rows_deleted = 1 THEN
        outcome := 'deleted';
        message := format('%s linked physical-copy record(s) were removed with the title.', v_copy_count);
      ELSE
        outcome := 'failed';
        message := 'The record changed before deletion could be confirmed. Refresh the archive and try again.';
      END IF;
    EXCEPTION
      WHEN foreign_key_violation THEN
        outcome := 'blocked';
        message := 'A dependent record, such as a circulation entry or stock-audit scan, still references this title or its copies. Nothing for this title was deleted.';
    END;

    RETURN NEXT;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.permanently_delete_archived_books(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.permanently_delete_archived_books(uuid[]) TO authenticated;

COMMIT;
