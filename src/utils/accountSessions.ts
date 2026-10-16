import { getSupabase } from './supabaseClient';

export type AccountSessionAccess =
  | 'active'
  | 'paused'
  | 'blocked'
  | 'signed_out'
  | 'account_inactive'
  | 'untracked'
  | 'unavailable';

export async function registerCurrentAccountSession(): Promise<{ status: AccountSessionAccess; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { status: 'unavailable', error: 'Supabase is not configured.' };

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !sessionData.session) {
    return { status: 'unavailable', error: sessionError?.message || 'No signed-in account was found.' };
  }

  const { data, error } = await supabase.rpc('register_library_account_session');
  if (error) return { status: 'unavailable', error: error.message };
  return { status: String(data || 'untracked') as AccountSessionAccess };
}

export async function heartbeatCurrentAccountSession(): Promise<{ status: AccountSessionAccess | null; error?: string }> {
  const supabase = getSupabase();
  if (!supabase) return { status: null };

  const { data, error } = await supabase.rpc('heartbeat_library_account_session');
  if (error) return { status: null, error: error.message };
  return { status: String(data || 'untracked') as AccountSessionAccess };
}
