BEGIN;

-- Keep the existing Auth session UUID internally for access revocation, but do
-- not retain hardware/browser/platform/user-agent identifiers.
CREATE OR REPLACE FUNCTION public.register_library_account_session()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;
  v_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  IF v_session_id IS NULL THEN
    RAISE EXCEPTION 'The current Auth session identifier is missing.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.status = 'active'
  ) THEN
    RETURN 'account_inactive';
  END IF;

  INSERT INTO public.library_device_sessions (
    session_id, user_id, status, first_seen_at, last_seen_at, updated_at
  ) VALUES (
    v_session_id, auth.uid(), 'active', now(), now(), now()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    last_seen_at = now(),
    updated_at = now()
  WHERE public.library_device_sessions.user_id = EXCLUDED.user_id
    AND public.library_device_sessions.status = 'active'
  RETURNING status INTO v_status;

  IF NOT FOUND THEN
    SELECT d.status INTO v_status
    FROM public.library_device_sessions AS d
    WHERE d.session_id = v_session_id AND d.user_id = auth.uid();
  END IF;
  RETURN COALESCE(v_status, 'blocked');
END;
$$;

CREATE OR REPLACE FUNCTION public.heartbeat_library_account_session()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
  v_status TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 'signed_out'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid() AND p.status = 'active'
  ) THEN
    RETURN 'account_inactive';
  END IF;
  v_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  UPDATE public.library_device_sessions AS s
  SET last_seen_at = now(), updated_at = now()
  WHERE s.session_id = v_session_id AND s.user_id = auth.uid()
  RETURNING s.status INTO v_status;
  RETURN COALESCE(v_status, 'untracked');
END;
$$;

CREATE OR REPLACE FUNCTION public.end_library_account_session()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN FALSE; END IF;
  v_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  UPDATE public.library_device_sessions AS s
  SET status = 'signed_out', last_seen_at = now(), updated_at = now()
  WHERE s.session_id = v_session_id
    AND s.user_id = auth.uid()
    AND s.status = 'active';
  RETURN FOUND;
END;
$$;

-- An account sees only its own summary. The active super administrator can see
-- all profile accounts; rows are aggregated so individual sessions are never
-- presented as named devices.
CREATE OR REPLACE FUNCTION public.list_library_account_activity()
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  role TEXT,
  account_status TEXT,
  total_sessions BIGINT,
  active_sessions BIGINT,
  last_seen_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'This account session is not active.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    COALESCE(NULLIF(p.full_name, ''), p.email, 'Library user')::text,
    COALESCE(p.email, '')::text,
    p.role::text,
    p.status::text,
    COUNT(s.session_id),
    COUNT(s.session_id) FILTER (
      WHERE s.status = 'active'
        AND p.status = 'active'
        AND s.last_seen_at >= now() - INTERVAL '2 minutes'
    ),
    MAX(s.last_seen_at)
  FROM public.profiles AS p
  LEFT JOIN public.library_device_sessions AS s ON s.user_id = p.id
  WHERE p.id = auth.uid() OR public.is_super_admin()
  GROUP BY p.id, p.full_name, p.email, p.role, p.status
  ORDER BY (p.id = auth.uid()) DESC, MAX(s.last_seen_at) DESC NULLS LAST, p.email;
END;
$$;

-- Keep sign-in records for recent/history views, while marking a row online
-- only when its account is active and its heartbeat is less than two minutes old.
CREATE OR REPLACE FUNCTION public.list_library_recent_account_sessions()
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  role TEXT,
  account_status TEXT,
  session_status TEXT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_online BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'This account session is not active.';
  END IF;

  RETURN QUERY
  SELECT
    s.session_id,
    s.user_id,
    COALESCE(NULLIF(p.full_name, ''), p.email, 'Library user')::text,
    COALESCE(p.email, '')::text,
    p.role::text,
    p.status::text,
    s.status::text,
    s.first_seen_at,
    s.last_seen_at,
    (s.status = 'active' AND p.status = 'active' AND s.last_seen_at >= now() - INTERVAL '2 minutes')
  FROM public.library_device_sessions AS s
  JOIN public.profiles AS p ON p.id = s.user_id
  WHERE s.user_id = auth.uid() OR public.is_super_admin()
  ORDER BY s.last_seen_at DESC
  LIMIT 100;
END;
$$;

-- The active list is server-filtered to sessions with a fresh heartbeat. Stale
-- and signed-out rows are retained and are still returned by the history RPC.
CREATE OR REPLACE FUNCTION public.list_library_online_account_sessions()
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  role TEXT,
  account_status TEXT,
  session_status TEXT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_online BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'This account session is not active.';
  END IF;

  RETURN QUERY
  SELECT
    s.session_id,
    s.user_id,
    COALESCE(NULLIF(p.full_name, ''), p.email, 'Library user')::text,
    COALESCE(p.email, '')::text,
    p.role::text,
    p.status::text,
    s.status::text,
    s.first_seen_at,
    s.last_seen_at,
    TRUE
  FROM public.library_device_sessions AS s
  JOIN public.profiles AS p ON p.id = s.user_id
  WHERE s.status = 'active'
    AND p.status = 'active'
    AND s.last_seen_at >= now() - INTERVAL '2 minutes'
    AND (s.user_id = auth.uid() OR public.is_super_admin())
  ORDER BY s.last_seen_at DESC
  LIMIT 500;
END;
$$;

-- After a self-service password change, preserve the newly reauthenticated
-- current sign-in and end other tracked sign-ins for that account.
CREATE OR REPLACE FUNCTION public.sign_out_other_library_account_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_session_id UUID;
  v_ended INTEGER;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'An active authenticated account is required.';
  END IF;
  v_session_id := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  UPDATE public.library_device_sessions AS s
  SET status = 'signed_out', last_seen_at = now(), updated_at = now()
  WHERE s.user_id = auth.uid()
    AND s.session_id IS DISTINCT FROM v_session_id
    AND s.status IN ('active', 'paused', 'blocked');
  GET DIAGNOSTICS v_ended = ROW_COUNT;
  RETURN v_ended;
END;
$$;

-- Compatibility wrappers for already-open older app clients. All supplied
-- device metadata is deliberately ignored and never persisted.
CREATE OR REPLACE FUNCTION public.register_library_device_session(
  p_device_name TEXT DEFAULT NULL,
  p_browser TEXT DEFAULT NULL,
  p_platform TEXT DEFAULT NULL,
  p_user_agent TEXT DEFAULT ''
)
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT public.register_library_account_session(); $$;

CREATE OR REPLACE FUNCTION public.heartbeat_library_device_session()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT public.heartbeat_library_account_session(); $$;

CREATE OR REPLACE FUNCTION public.end_library_device_session()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$ SELECT public.end_library_account_session(); $$;

CREATE OR REPLACE FUNCTION public.list_library_device_sessions()
RETURNS TABLE (
  session_id UUID,
  user_id UUID,
  user_name TEXT,
  user_email TEXT,
  device_name TEXT,
  browser TEXT,
  platform TEXT,
  user_agent TEXT,
  status TEXT,
  first_seen_at TIMESTAMPTZ,
  last_seen_at TIMESTAMPTZ,
  is_online BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'An active authenticated account is required.';
  END IF;
  RETURN QUERY
  SELECT s.session_id, s.user_id,
    COALESCE(NULLIF(p.full_name, ''), p.email, 'Library user')::text,
    COALESCE(p.email, '')::text,
    'Account sign-in'::text,
    'Not collected'::text,
    'Not collected'::text,
    ''::text,
    s.status,
    s.first_seen_at,
    s.last_seen_at,
    (s.status = 'active' AND p.status = 'active' AND s.last_seen_at >= now() - INTERVAL '2 minutes')
  FROM public.library_device_sessions AS s
  JOIN public.profiles AS p ON p.id = s.user_id
  WHERE s.user_id = auth.uid() OR public.is_super_admin()
  ORDER BY s.last_seen_at DESC
  LIMIT 100;
END;
$$;

-- Per-account status controls and the server-side account manager are the
-- supported controls. Tighten the legacy per-session RPC to super admins only.
CREATE OR REPLACE FUNCTION public.set_library_device_session_status(
  p_session_id UUID,
  p_status TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_super_admin() THEN
    RAISE EXCEPTION 'Only the active super administrator may manage account sessions.';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('active', 'paused', 'blocked') THEN
    RAISE EXCEPTION 'Session status must be active, paused, or blocked.';
  END IF;
  IF p_session_id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid AND p_status <> 'active' THEN
    RAISE EXCEPTION 'Use Sign Out to end your current account session.';
  END IF;
  UPDATE public.library_device_sessions AS s
  SET status = p_status, updated_at = now()
  WHERE s.session_id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'The account session was not found.'; END IF;
  RETURN TRUE;
END;
$$;

-- Remove previously retained device/browser details as well as any future
-- storage of those details. Session IDs remain solely for account access control.
ALTER TABLE public.library_device_sessions
  DROP COLUMN IF EXISTS device_name,
  DROP COLUMN IF EXISTS browser,
  DROP COLUMN IF EXISTS platform,
  DROP COLUMN IF EXISTS user_agent;
COMMENT ON TABLE public.library_device_sessions IS
  'Internal Auth session identifiers linked to account IDs for access control. Does not store device, browser, platform, user-agent, or IP metadata.';

REVOKE ALL ON FUNCTION public.register_library_account_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.heartbeat_library_account_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_library_account_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_library_account_activity() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_library_recent_account_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_library_online_account_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sign_out_other_library_account_sessions() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_library_account_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_library_account_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_library_account_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_library_account_activity() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_library_recent_account_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_library_online_account_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.sign_out_other_library_account_sessions() TO authenticated;

REVOKE ALL ON FUNCTION public.register_library_device_session(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.heartbeat_library_device_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.end_library_device_session() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_library_device_sessions() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_library_device_session_status(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_library_device_session(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_library_device_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_library_device_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_library_device_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_library_device_session_status(UUID, TEXT) TO authenticated;

COMMIT;
