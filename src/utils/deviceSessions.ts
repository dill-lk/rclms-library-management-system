import { getSupabase } from './supabaseClient';

export type DeviceSessionAccess = 'active' | 'paused' | 'blocked' | 'signed_out' | 'account_inactive' | 'untracked' | 'unavailable';

function readSessionId(accessToken: string): string | null {
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const base64 = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const claims = JSON.parse(decoded) as { session_id?: string };
    return claims.session_id || null;
  } catch {
    return null;
  }
}

export async function getCurrentAuthSessionId(): Promise<string | null> {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session ? readSessionId(data.session.access_token) : null;
}

function getCurrentDeviceDetails() {
  const userAgent = navigator.userAgent || '';
  const browser = /Edg\//.test(userAgent)
    ? 'Microsoft Edge'
    : /Firefox\//.test(userAgent)
      ? 'Firefox'
      : /Chrome\//.test(userAgent)
        ? 'Chrome'
        : /Safari\//.test(userAgent)
          ? 'Safari'
          : 'Other browser';
  const extendedNavigator = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = extendedNavigator.userAgentData?.platform || navigator.platform || 'Unknown platform';
  const deviceName = `${browser} on ${platform}`;
  return {
    p_device_name: deviceName.slice(0, 120),
    p_browser: browser,
    p_platform: platform.slice(0, 80),
    p_user_agent: userAgent.slice(0, 512),
  };
}

export async function registerCurrentDeviceSession(): Promise<{ status: DeviceSessionAccess; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { status: 'unavailable', error: 'Supabase is not configured.' };
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData.session) return { status: 'unavailable', error: 'No signed-in session was found.' };
  if (!readSessionId(sessionData.session.access_token)) {
    return { status: 'unavailable', error: 'The Auth session did not include a session identifier.' };
  }
  const { data, error } = await supabase.rpc('register_library_device_session', getCurrentDeviceDetails());
  if (error) return { status: 'unavailable', error: error.message };
  return { status: String(data || 'untracked') as DeviceSessionAccess };
}

export async function heartbeatCurrentDeviceSession(): Promise<{ status: DeviceSessionAccess | null; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { status: null };
  const { data, error } = await supabase.rpc('heartbeat_library_device_session');
  if (error) return { status: null, error: error.message };
  return { status: String(data || 'untracked') as DeviceSessionAccess };
}
