-- Live device/session visibility and reversible per-session access controls.
-- No IP addresses are collected. Existing unexpired Supabase Auth sessions are
-- imported from Auth; their device details stay explicitly unknown until observed by the app.
BEGIN;

CREATE TABLE IF NOT EXISTS public.library_device_sessions (
  session_id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name TEXT NOT NULL DEFAULT 'Unknown device',
  browser TEXT NOT NULL DEFAULT 'Unknown browser',
  platform TEXT NOT NULL DEFAULT 'Unknown platform',
  user_agent TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'blocked', 'signed_out')),
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS library_device_sessions_user_seen_idx
  ON public.library_device_sessions (user_id, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS library_device_sessions_status_seen_idx
  ON public.library_device_sessions (status, last_seen_at DESC);

ALTER TABLE public.library_device_sessions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.library_device_sessions FROM anon, authenticated;

-- Backfill sessions that are still valid and belong to active library accounts.
INSERT INTO public.library_device_sessions (
  session_id, user_id, device_name, browser, platform, user_agent,
  status, first_seen_at, last_seen_at, updated_at
)
SELECT
  s.id,
  s.user_id,
  'Device details unavailable',
  'Unknown browser',
  'Unknown platform',
  COALESCE(s.user_agent, ''),
  'active',
  s.created_at,
  COALESCE(s.refreshed_at AT TIME ZONE 'UTC', s.updated_at, s.created_at),
  now()
FROM auth.sessions AS s
JOIN public.profiles AS p ON p.id = s.user_id
WHERE p.status = 'active'
  AND (s.not_after IS NULL OR s.not_after > now())
  AND s.created_at > now() - INTERVAL '120 days'
ON CONFLICT (session_id) DO NOTHING;

-- Legacy, unregistered sessions remain compatible; once tracked, a paused,
-- blocked, or signed-out session loses all staff/admin policy access.
CREATE OR REPLACE FUNCTION public.is_library_session_active()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN FALSE
    ELSE EXISTS (
      SELECT 1 FROM public.profiles AS p
      WHERE p.id = auth.uid() AND p.status = 'active'
    ) AND COALESCE((
      SELECT d.status = 'active'
      FROM public.library_device_sessions AS d
      WHERE d.session_id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid
        AND d.user_id = auth.uid()
    ), TRUE)
  END;
$$;
REVOKE ALL ON FUNCTION public.is_library_session_active() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_library_session_active() TO authenticated;

-- Gate all role-based writes and staff reads on the current device session.
CREATE OR REPLACE FUNCTION public.current_user_has_role(allowed_roles text[])
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = ANY (allowed_roles)
  ) AND public.is_library_session_active();
$$;

CREATE OR REPLACE FUNCTION public.is_library_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('super_admin', 'librarian', 'assistant_librarian')
  ) AND public.is_library_session_active();
$$;

CREATE OR REPLACE FUNCTION public.is_library_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role IN ('super_admin', 'librarian')
  ) AND public.is_library_session_active();
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles AS p
    WHERE p.id = auth.uid()
      AND p.status = 'active'
      AND p.role = 'super_admin'
  ) AND public.is_library_session_active();
$$;

CREATE OR REPLACE FUNCTION public.register_library_device_session(
  p_device_name TEXT,
  p_browser TEXT,
  p_platform TEXT,
  p_user_agent TEXT DEFAULT ''
)
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
    session_id, user_id, device_name, browser, platform, user_agent,
    status, first_seen_at, last_seen_at, updated_at
  ) VALUES (
    v_session_id, auth.uid(),
    left(COALESCE(NULLIF(btrim(p_device_name), ''), 'Unknown device'), 120),
    left(COALESCE(NULLIF(btrim(p_browser), ''), 'Unknown browser'), 80),
    left(COALESCE(NULLIF(btrim(p_platform), ''), 'Unknown platform'), 80),
    left(COALESCE(p_user_agent, ''), 512),
    'active', now(), now(), now()
  )
  ON CONFLICT (session_id) DO UPDATE SET
    device_name = EXCLUDED.device_name,
    browser = EXCLUDED.browser,
    platform = EXCLUDED.platform,
    user_agent = EXCLUDED.user_agent,
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

CREATE OR REPLACE FUNCTION public.heartbeat_library_device_session()
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
  UPDATE public.library_device_sessions AS d
  SET last_seen_at = now(), updated_at = now()
  WHERE d.session_id = v_session_id AND d.user_id = auth.uid()
  RETURNING d.status INTO v_status;
  RETURN COALESCE(v_status, 'untracked');
END;
$$;

CREATE OR REPLACE FUNCTION public.end_library_device_session()
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
  UPDATE public.library_device_sessions AS d
  SET status = 'signed_out', last_seen_at = now(), updated_at = now()
  WHERE d.session_id = v_session_id
    AND d.user_id = auth.uid()
    AND d.status = 'active';
  RETURN FOUND;
END;
$$;

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
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Authentication is required.'; END IF;
  IF NOT public.is_library_session_active() THEN
    RAISE EXCEPTION 'This device session is paused, blocked, or signed out.';
  END IF;

  RETURN QUERY
  SELECT d.session_id, d.user_id,
    COALESCE(NULLIF(p.full_name, ''), p.email, 'Library user')::text,
    COALESCE(p.email, '')::text,
    d.device_name, d.browser, d.platform, d.user_agent, d.status,
    d.first_seen_at, d.last_seen_at,
    (d.status = 'active' AND d.last_seen_at >= now() - INTERVAL '2 minutes')
  FROM public.library_device_sessions AS d
  JOIN public.profiles AS p ON p.id = d.user_id
  WHERE d.user_id = auth.uid() OR public.is_library_admin()
  ORDER BY d.last_seen_at DESC
  LIMIT 100;
END;
$$;

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
  IF auth.uid() IS NULL OR NOT public.is_library_admin() THEN
    RAISE EXCEPTION 'Only an active library administrator may manage device sessions.';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('active', 'paused', 'blocked') THEN
    RAISE EXCEPTION 'Session status must be active, paused, or blocked.';
  END IF;
  IF p_session_id = NULLIF(auth.jwt() ->> 'session_id', '')::uuid AND p_status <> 'active' THEN
    RAISE EXCEPTION 'Use Sign Out to end your current device session.';
  END IF;

  UPDATE public.library_device_sessions AS d
  SET status = p_status, updated_at = now()
  WHERE d.session_id = p_session_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'The device session was not found.'; END IF;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.register_library_device_session(TEXT, TEXT, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.heartbeat_library_device_session() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.end_library_device_session() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.list_library_device_sessions() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_library_device_session_status(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.register_library_device_session(TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.heartbeat_library_device_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.end_library_device_session() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_library_device_sessions() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_library_device_session_status(UUID, TEXT) TO authenticated;

-- Own-record policies otherwise bypass role checks; gate their private reads and updates too.
ALTER POLICY "Profiles Read Own Or Staff" ON public.profiles
  USING (
    public.is_library_session_active()
    AND ((id = (SELECT auth.uid())) OR public.current_user_has_role(ARRAY['super_admin', 'librarian', 'assistant_librarian']))
  );
ALTER POLICY "Profiles Update Own Or Admin" ON public.profiles
  USING (
    public.is_library_session_active()
    AND ((id = (SELECT auth.uid())) OR public.current_user_has_role(ARRAY['super_admin']))
  )
  WITH CHECK (
    public.is_library_session_active()
    AND (((id = (SELECT auth.uid())) AND (role = public.current_user_role())) OR public.current_user_has_role(ARRAY['super_admin']))
  );
ALTER POLICY "Members Read Own Or Staff" ON public.members
  USING (
    public.is_library_session_active()
    AND ((user_id = (SELECT auth.uid())) OR public.current_user_has_role(ARRAY['super_admin', 'librarian', 'assistant_librarian']))
  );
ALTER POLICY "Loans Read Own Or Staff" ON public.circulation
  USING (
    public.is_library_session_active()
    AND ((member_id IN (SELECT members.id FROM public.members WHERE members.user_id = (SELECT auth.uid())))
      OR public.current_user_has_role(ARRAY['super_admin', 'librarian', 'assistant_librarian']))
  );
ALTER POLICY "Fines Read Own Or Staff" ON public.fines
  USING (
    public.is_library_session_active()
    AND ((member_id IN (SELECT members.id FROM public.members WHERE members.user_id = (SELECT auth.uid())))
      OR public.current_user_has_role(ARRAY['super_admin', 'librarian', 'assistant_librarian']))
  );
ALTER POLICY "Reservations Read Own Or Staff" ON public.reservations
  USING (
    public.is_library_session_active()
    AND ((member_id IN (SELECT members.id FROM public.members WHERE members.user_id = (SELECT auth.uid())))
      OR public.current_user_has_role(ARRAY['super_admin', 'librarian', 'assistant_librarian']))
  );

COMMIT;
