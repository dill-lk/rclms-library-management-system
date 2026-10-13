-- Profile self-service remains strictly limited to the signed-in user's own name and phone.
-- Reader logins are not official membership records; staff remain the only Members readers/writers.

BEGIN;

DROP POLICY IF EXISTS "Members Read Own Or Staff" ON public.members;
DROP POLICY IF EXISTS "Users Read Own Member Record" ON public.members;
DROP POLICY IF EXISTS "Users Create Own Member Record" ON public.members;
DROP POLICY IF EXISTS "Staff Read Members" ON public.members;
CREATE POLICY "Staff Read Members" ON public.members FOR SELECT TO authenticated
  USING (
    public.is_library_session_active()
    AND public.current_user_has_role(ARRAY['super_admin','librarian','assistant_librarian']::text[])
  );

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

  IF (OLD.role = 'super_admin' OR NEW.role = 'super_admin')
     AND NOT public.current_user_has_role(ARRAY['super_admin']::text[]) THEN
    RAISE EXCEPTION 'Only a super administrator may change a super-administrator account.';
  END IF;

  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_guard_profile_privilege_changes ON public.profiles;
CREATE TRIGGER trg_guard_profile_privilege_changes
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.guard_profile_privilege_changes();

-- Keep the audit ledger append-only and readable/writable by active library staff.
DROP POLICY IF EXISTS "Staff Manage Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff Read Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff Write Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff Update Audit Logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Staff Delete Audit Logs" ON public.audit_logs;
CREATE POLICY "Staff Read Audit Logs" ON public.audit_logs FOR SELECT TO authenticated
  USING (
    public.is_library_session_active()
    AND public.current_user_has_role(ARRAY['super_admin','librarian','assistant_librarian']::text[])
  );
CREATE POLICY "Staff Write Audit Logs" ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    public.is_library_session_active()
    AND public.current_user_has_role(ARRAY['super_admin','librarian','assistant_librarian']::text[])
  );

-- Preserve the previous physical-copy condition so a return can be undone without guessing.
ALTER TABLE public.circulation
  ADD COLUMN IF NOT EXISTS pre_return_condition TEXT;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.circulation'::regclass
      AND conname = 'circulation_pre_return_condition_check'
  ) THEN
    ALTER TABLE public.circulation
      ADD CONSTRAINT circulation_pre_return_condition_check
      CHECK (pre_return_condition IS NULL OR pre_return_condition IN ('new','good','fair','damaged','lost'));
  END IF;
END;
$$;
ALTER TABLE public.circulation DROP CONSTRAINT IF EXISTS circulation_status_check;
ALTER TABLE public.circulation ADD CONSTRAINT circulation_status_check
  CHECK (status IN ('active','returned','overdue','lost','cancelled'));

-- Undo is permitted only for the same staff member, on a transaction completed within five minutes.
-- The loan row is retained; issue undo marks it cancelled, and return undo reopens it.
CREATE OR REPLACE FUNCTION public.undo_recent_circulation_action(p_loan_id UUID, p_action TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v public.circulation%ROWTYPE;
  v_copy_status TEXT;
  v_user_name TEXT;
  v_rows INTEGER;
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.is_library_session_active()
     OR NOT public.current_user_has_role(ARRAY['super_admin','librarian','assistant_librarian']::text[]) THEN
    RAISE EXCEPTION 'Active library staff access is required to undo a circulation action.';
  END IF;

  SELECT * INTO v
  FROM public.circulation
  WHERE id = p_loan_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The circulation record no longer exists.';
  END IF;

  SELECT p.full_name INTO v_user_name FROM public.profiles AS p WHERE p.id = auth.uid();

  IF p_action = 'issue' THEN
    IF v.status NOT IN ('active','overdue')
       OR v.return_date IS NOT NULL
       OR v.issued_by IS DISTINCT FROM auth.uid()
       OR v.created_at < timezone('utc'::text, now()) - INTERVAL '5 minutes' THEN
      RAISE EXCEPTION 'Only your own issue from the last five minutes can be undone.';
    END IF;

    UPDATE public.book_copies SET status = 'available', updated_at = timezone('utc'::text, now())
    WHERE id = v.copy_id AND status = 'borrowed';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows <> 1 THEN
      RAISE EXCEPTION 'The copy is no longer in the expected borrowed state.';
    END IF;

    UPDATE public.books
    SET available_copies = LEAST(total_copies, available_copies + 1),
        total_borrows = GREATEST(total_borrows - 1, 0),
        updated_at = timezone('utc'::text, now())
    WHERE id = v.book_id;

    UPDATE public.circulation
    SET status = 'cancelled',
        notes = concat_ws(' | ', NULLIF(notes, ''), 'Issue undone by ' || COALESCE(v_user_name, 'staff')),
        updated_at = timezone('utc'::text, now())
    WHERE id = v.id;

    INSERT INTO public.audit_logs (user_id, user_name, action, entity, entity_id, details)
    VALUES (auth.uid(), v_user_name, 'issue_undone', 'circulation', v.id::text,
      jsonb_build_object('barcode', v.parigahana_ankaya, 'book_title', v.book_title));
    RETURN TRUE;
  ELSIF p_action = 'return' THEN
    IF v.status <> 'returned'
       OR v.return_date IS DISTINCT FROM CURRENT_DATE
       OR v.received_by IS DISTINCT FROM auth.uid()
       OR v.updated_at < timezone('utc'::text, now()) - INTERVAL '5 minutes'
       OR v.pre_return_condition IS NULL THEN
      RAISE EXCEPTION 'Only your own return from the last five minutes can be undone.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.fines AS f
      WHERE f.loan_id = v.id
        AND (f.paid_amount > 0 OR f.status IN ('paid','partially_paid'))
    ) THEN
      RAISE EXCEPTION 'A return with a collected fine cannot be undone.';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.circulation AS c
      WHERE c.copy_id = v.copy_id AND c.id <> v.id AND c.status IN ('active','overdue')
    ) THEN
      RAISE EXCEPTION 'This copy has already been issued again; the return cannot be undone.';
    END IF;

    SELECT status INTO v_copy_status
    FROM public.book_copies
    WHERE id = v.copy_id
    FOR UPDATE;
    IF v_copy_status IS NULL OR v_copy_status NOT IN ('available','damaged') THEN
      RAISE EXCEPTION 'The returned copy is no longer in a reversible state.';
    END IF;

    UPDATE public.fines
    SET status = 'waived', paid_amount = 0, date_paid = NULL,
        reason = concat_ws(' | ', reason, 'Voided because return was undone'),
        updated_at = timezone('utc'::text, now())
    WHERE loan_id = v.id AND status IN ('unpaid','partially_paid');

    UPDATE public.book_copies
    SET status = 'borrowed', condition = v.pre_return_condition,
        updated_at = timezone('utc'::text, now())
    WHERE id = v.copy_id;

    IF v_copy_status = 'available' THEN
      UPDATE public.books
      SET available_copies = GREATEST(available_copies - 1, 0),
          updated_at = timezone('utc'::text, now())
      WHERE id = v.book_id;
    END IF;

    UPDATE public.circulation
    SET status = 'active', return_date = NULL, fine_amount = 0, fine_status = 'none',
        received_by = NULL,
        notes = concat_ws(' | ', NULLIF(notes, ''), 'Return undone by ' || COALESCE(v_user_name, 'staff')),
        updated_at = timezone('utc'::text, now())
    WHERE id = v.id;

    INSERT INTO public.audit_logs (user_id, user_name, action, entity, entity_id, details)
    VALUES (auth.uid(), v_user_name, 'return_undone', 'circulation', v.id::text,
      jsonb_build_object('barcode', v.parigahana_ankaya, 'book_title', v.book_title));
    RETURN TRUE;
  ELSE
    RAISE EXCEPTION 'Unsupported circulation action.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.undo_recent_circulation_action(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_recent_circulation_action(UUID, TEXT) TO authenticated;

COMMIT;
