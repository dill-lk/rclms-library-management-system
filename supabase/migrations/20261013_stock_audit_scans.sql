BEGIN;

CREATE TABLE IF NOT EXISTS public.stock_audit_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_session_id UUID NOT NULL,
  copy_id UUID NOT NULL REFERENCES public.book_copies(id) ON DELETE RESTRICT,
  barcode TEXT NOT NULL CHECK (length(btrim(barcode)) > 0),
  scanned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  scanned_by_name TEXT,
  scanned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT stock_audit_scans_session_copy_key UNIQUE (audit_session_id, copy_id)
);

CREATE INDEX IF NOT EXISTS idx_stock_audit_scans_session_time
  ON public.stock_audit_scans (audit_session_id, scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_audit_scans_scanned_by
  ON public.stock_audit_scans (scanned_by, scanned_at DESC);

ALTER TABLE public.stock_audit_scans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Stock Audit Staff Read" ON public.stock_audit_scans;
DROP POLICY IF EXISTS "Staff Manage Stock Audit Scans" ON public.stock_audit_scans;
CREATE POLICY "Stock Audit Staff Read"
  ON public.stock_audit_scans
  FOR SELECT TO authenticated
  USING (public.is_library_staff() AND public.is_library_session_active());

REVOKE ALL ON TABLE public.stock_audit_scans FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.stock_audit_scans TO authenticated;

CREATE OR REPLACE FUNCTION public.record_stock_audit_scan(
  p_audit_session_id UUID,
  p_barcode TEXT
)
RETURNS TABLE(copy_id UUID, barcode TEXT, scanned_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_copy_id UUID;
  v_barcode TEXT;
  v_scanned_at TIMESTAMPTZ;
BEGIN
  IF v_user_id IS NULL
     OR NOT public.is_library_staff()
     OR NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'An active library staff session is required to record stock scans.';
  END IF;
  IF p_audit_session_id IS NULL THEN
    RAISE EXCEPTION 'An audit session is required.';
  END IF;
  IF length(btrim(coalesce(p_barcode, ''))) = 0 THEN
    RAISE EXCEPTION 'Enter a copy barcode to scan.';
  END IF;

  SELECT bc.id, bc.barcode
    INTO v_copy_id, v_barcode
  FROM public.book_copies AS bc
  WHERE bc.barcode = btrim(p_barcode)
  LIMIT 1;

  IF v_copy_id IS NULL THEN
    RAISE EXCEPTION 'No registered physical copy matches this barcode.';
  END IF;

  INSERT INTO public.stock_audit_scans AS saved_scan (
    audit_session_id, copy_id, barcode, scanned_by, scanned_by_name, scanned_at
  )
  VALUES (
    p_audit_session_id,
    v_copy_id,
    v_barcode,
    v_user_id,
    (SELECT p.full_name FROM public.profiles AS p WHERE p.id = v_user_id),
    now()
  )
  ON CONFLICT (audit_session_id, copy_id)
  DO UPDATE SET
    barcode = EXCLUDED.barcode,
    scanned_by = EXCLUDED.scanned_by,
    scanned_by_name = EXCLUDED.scanned_by_name,
    scanned_at = now()
  RETURNING saved_scan.scanned_at INTO v_scanned_at;

  copy_id := v_copy_id;
  barcode := v_barcode;
  scanned_at := v_scanned_at;
  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.record_stock_audit_scan(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_stock_audit_scan(UUID, TEXT) TO authenticated;

COMMIT;
