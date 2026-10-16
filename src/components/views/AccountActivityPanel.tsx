import React, { useCallback, useEffect, useState } from 'react';
import { Clock3, RefreshCw, ShieldCheck, UserRound, Wifi } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { getSupabase } from '../../utils/supabaseClient';

type RecentAccountSession = {
  session_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  role: string;
  account_status: string;
  session_status: string;
  first_seen_at: string;
  last_seen_at: string;
  is_online: boolean;
};

const formatLastSeen = (value: string | null) => {
  if (!value) return 'No recorded sign-ins';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const elapsedMs = Date.now() - date.getTime();
  if (elapsedMs < 0) return date.toLocaleString();
  const minutes = Math.floor(elapsedMs / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  if (minutes < 24 * 60) {
    const hours = Math.floor(minutes / 60);
    return `${hours} hr${hours === 1 ? '' : 's'} ago`;
  }
  return date.toLocaleString();
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown' : date.toLocaleString();
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Account activity could not be loaded. Try refreshing the list.';
};

const SessionState: React.FC<{ session: RecentAccountSession }> = ({ session }) => {
  const label = session.session_status === 'active'
    ? (session.is_online ? 'Online' : 'Offline · heartbeat stale')
    : session.session_status.replace(/_/g, ' ');
  const online = session.session_status === 'active' && session.is_online;
  return (
    <span className={`shrink-0 border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${online ? 'border-emerald-700/30 text-emerald-700 dark:text-emerald-300' : 'border-library-border text-library-muted'}`}>
      {label}
    </span>
  );
};

export const AccountActivityPanel: React.FC = () => {
  const { currentUser, addToast, isSupabaseConfigured } = useLibrary();
  const [onlineSessions, setOnlineSessions] = useState<RecentAccountSession[]>([]);
  const [recentSessions, setRecentSessions] = useState<RecentAccountSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const isSuperAdmin = currentUser.role === 'super_admin';

  const loadActivity = useCallback(async (showSpinner: boolean) => {
    const supabase = getSupabase();
    if (!supabase || !isSupabaseConfigured) {
      setOnlineSessions([]);
      setRecentSessions([]);
      setIsLoading(false);
      setLoadError(isSupabaseConfigured ? 'The configured account service could not be initialized.' : null);
      return;
    }
    if (showSpinner) setIsRefreshing(true);
    try {
      const [onlineResult, historyResult] = await Promise.all([
        supabase.rpc('list_library_online_account_sessions'),
        supabase.rpc('list_library_recent_account_sessions'),
      ]);
      if (onlineResult.error) throw onlineResult.error;
      if (historyResult.error) throw historyResult.error;
      setOnlineSessions((onlineResult.data || []) as RecentAccountSession[]);
      setRecentSessions((historyResult.data || []) as RecentAccountSession[]);
      setLoadError(null);
    } catch (error) {
      const message = getErrorMessage(error);
      setLoadError(message);
      if (showSpinner) addToast({ type: 'error', title: 'Could not refresh account activity', message });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [addToast, isSupabaseConfigured]);

  useEffect(() => {
    void loadActivity(false);
    const interval = window.setInterval(() => void loadActivity(false), 30_000);
    return () => window.clearInterval(interval);
  }, [loadActivity]);

  return (
    <section className="rounded-xl border border-library-border bg-library-surface p-5 sm:p-6 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-library-main">
            <ShieldCheck className="h-4 w-4" /> Account activity
          </h3>
          <p className="mt-1 text-xs leading-5 text-library-muted">
            {isSuperAdmin ? 'View online sign-ins and recent history by account.' : 'View your online sign-in and recent account history.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadActivity(true)}
          disabled={isRefreshing || !isSupabaseConfigured}
          className="inline-flex min-h-9 items-center gap-2 border border-library-border px-3 text-xs font-semibold text-library-main transition hover:bg-library-bg disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh activity
        </button>
      </div>

      {loadError && (onlineSessions.length > 0 || recentSessions.length > 0) && (
        <p role="alert" className="border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-library-main">
          Showing the last successfully retrieved results. {loadError}
        </p>
      )}

      {!isSupabaseConfigured ? (
        <p className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">Live account activity requires the connected Supabase sign-in service.</p>
      ) : isLoading ? (
        <p role="status" className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">Loading account activity…</p>
      ) : loadError && onlineSessions.length === 0 && recentSessions.length === 0 ? (
        <p role="alert" className="border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-library-main">Account activity is unavailable, so no activity is shown. {loadError}</p>
      ) : (
        <>
          <section aria-labelledby="online-signins-heading" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h4 id="online-signins-heading" className="flex items-center gap-2 text-sm font-bold text-library-main">
                <Wifi className="h-4 w-4" /> Online sign-ins
              </h4>
              <span className="border border-library-border px-2.5 py-1 text-xs text-library-muted">
                {onlineSessions.length} active sign-in{onlineSessions.length === 1 ? '' : 's'}
              </span>
            </div>
            {onlineSessions.length ? (
              <div className="space-y-2">
                {onlineSessions.map((session) => (
                  <article key={session.session_id} className="flex flex-col gap-2 border border-emerald-700/25 bg-library-bg p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-library-muted" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-library-main">{session.user_name || 'Library account'}</p>
                        <p className="mt-0.5 truncate text-xs text-library-muted">{session.user_email || 'No email on profile'} · {session.role.replace(/_/g, ' ')}</p>
                        <p className="mt-1 text-[11px] text-library-muted">Last heartbeat {formatLastSeen(session.last_seen_at)}</p>
                      </div>
                    </div>
                    <SessionState session={session} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">No sign-in is online right now. A sign-in leaves this list after two minutes without a heartbeat.</p>
            )}
          </section>

          <section aria-labelledby="recent-account-signins-heading" className="space-y-3 border-t border-library-border pt-4">
            <div className="flex items-center justify-between gap-3">
              <h4 id="recent-account-signins-heading" className="flex items-center gap-2 text-sm font-bold text-library-main">
                <Clock3 className="h-4 w-4" /> Recent sign-ins
              </h4>
              <span className="text-[11px] text-library-muted">Most recent 100</span>
            </div>
            {recentSessions.length ? (
              <div className="space-y-2">
                {recentSessions.map((session) => (
                  <article key={session.session_id} className="flex flex-col gap-2 border border-library-border bg-library-bg p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <UserRound className="mt-0.5 h-4 w-4 shrink-0 text-library-muted" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-library-main">{session.user_name || 'Library account'}</p>
                        <p className="mt-0.5 truncate text-xs text-library-muted">{session.user_email || 'No email on profile'} · {session.role.replace(/_/g, ' ')}</p>
                        <p className="mt-1 text-[11px] leading-5 text-library-muted">Started {formatDate(session.first_seen_at)} · Last active {formatLastSeen(session.last_seen_at)}</p>
                      </div>
                    </div>
                    <SessionState session={session} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">No sign-in history has been recorded yet.</p>
            )}
          </section>
        </>
      )}

      <p className="border-t border-library-border pt-3 text-[11px] leading-5 text-library-muted">
        Online sign-ins require a heartbeat within the last two minutes and refresh about every 30 seconds. Offline or signed-out sign-ins leave the online list but remain in recent account history. Device names, browser/platform details, user-agent strings, and IP addresses are not collected or retained.
      </p>
    </section>
  );
};
