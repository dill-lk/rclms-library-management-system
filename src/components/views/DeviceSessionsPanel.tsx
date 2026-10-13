import React, { useEffect, useState } from 'react';
import { Ban, Clock3, Laptop, Pause, Play, RefreshCw, ShieldCheck, Wifi, WifiOff } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { getCurrentAuthSessionId } from '../../utils/deviceSessions';
import { getSupabase } from '../../utils/supabaseClient';

type DeviceSession = {
  session_id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  device_name: string;
  browser: string;
  platform: string;
  user_agent: string;
  status: 'active' | 'paused' | 'blocked' | 'signed_out' | string;
  first_seen_at: string;
  last_seen_at: string;
  is_online: boolean;
};

const formatLastSeen = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min${minutes === 1 ? '' : 's'} ago`;
  if (minutes < 24 * 60) return `${Math.floor(minutes / 60)} hr${Math.floor(minutes / 60) === 1 ? '' : 's'} ago`;
  return date.toLocaleString();
};

export const DeviceSessionsPanel: React.FC = () => {
  const { currentUser, addToast, isSupabaseConfigured } = useLibrary();
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingSessionId, setPendingSessionId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadSessions = async (silent: boolean) => {
      const supabase = getSupabase();
      if (!supabase || !isSupabaseConfigured) {
        if (mounted) setIsLoading(false);
        return;
      }
      if (!silent && mounted) setIsRefreshing(true);
      try {
        const [{ data, error }, currentId] = await Promise.all([
          supabase.rpc('list_library_device_sessions'),
          getCurrentAuthSessionId(),
        ]);
        if (error) throw error;
        if (mounted) {
          setSessions((data || []) as DeviceSession[]);
          setCurrentSessionId(currentId);
        }
      } catch (error) {
        if (!silent && mounted) {
          addToast({
            type: 'error',
            title: 'Could not load device sessions',
            message: error instanceof Error ? error.message : 'Try refreshing the list.',
          });
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          setIsRefreshing(false);
        }
      }
    };

    void loadSessions(true);
    const interval = window.setInterval(() => {
      void loadSessions(true);
    }, 30_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [addToast, isSupabaseConfigured]);

  const changeSessionStatus = async (session: DeviceSession, nextStatus: 'active' | 'paused' | 'blocked') => {
    const actionName = nextStatus === 'paused' ? 'pause' : nextStatus === 'blocked' ? 'block' : session.status === 'paused' ? 'resume' : 'unblock';
    const explanation = nextStatus === 'paused'
      ? 'This session will lose library access at its next security check (usually within 30 seconds). You can resume it later.'
      : nextStatus === 'blocked'
        ? 'This blocks this sign-in session. It does not disable the account or prevent a new sign-in; disable the account in Users for that.'
        : 'This restores access for this session if its sign-in is still valid.';
    if (!window.confirm(`Are you sure you want to ${actionName} this session?\n\n${explanation}`)) return;

    const supabase = getSupabase();
    if (!supabase) return;
    setPendingSessionId(session.session_id);
    const { error } = await supabase.rpc('set_library_device_session_status', {
      p_session_id: session.session_id,
      p_status: nextStatus,
    });
    setPendingSessionId(null);
    if (error) {
      addToast({ type: 'error', title: 'Session change failed', message: error.message });
      return;
    }
    addToast({
      type: 'success',
      title: nextStatus === 'active' ? 'Session access restored' : `Session ${nextStatus}`,
      message: `${session.user_name} · ${session.device_name}`,
    });
    const { data, error: listError } = await supabase.rpc('list_library_device_sessions');
    if (!listError) setSessions((data || []) as DeviceSession[]);
  };

  const onlineCount = sessions.filter((session) => session.is_online).length;
  const isAdmin = currentUser.permissions.includes('manage_users');

  return (
    <section className="device-sessions-panel rounded-xl border border-library-border bg-library-surface p-5 sm:p-6 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-library-main">
            <ShieldCheck className="h-4 w-4" /> Devices & session access
          </h3>
          <p className="mt-1 text-xs leading-5 text-library-muted">
            {isAdmin ? 'Review recent sign-ins and pause or block a specific session.' : 'Review the devices signed in to your library account.'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setIsRefreshing(true);
            const supabase = getSupabase();
            if (!supabase) return setIsRefreshing(false);
            Promise.all([supabase.rpc('list_library_device_sessions'), getCurrentAuthSessionId()]).then(([result, currentId]) => {
              if (result.error) throw result.error;
              setSessions((result.data || []) as DeviceSession[]);
              setCurrentSessionId(currentId);
            }).catch((error) => addToast({ type: 'error', title: 'Could not refresh sessions', message: error instanceof Error ? error.message : 'Try again.' })).finally(() => setIsRefreshing(false));
          }}
          disabled={isRefreshing || !isSupabaseConfigured}
          className="inline-flex min-h-9 items-center gap-2 border border-library-border px-3 text-xs font-semibold text-library-main transition hover:bg-library-bg disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin' : ''}`} /> Refresh list
        </button>
      </div>

      {!isSupabaseConfigured ? (
        <p className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">Live device management requires the connected Supabase sign-in service.</p>
      ) : isLoading ? (
        <p role="status" className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">Loading device sessions…</p>
      ) : sessions.length === 0 ? (
        <p className="border border-library-border bg-library-bg p-3 text-xs text-library-muted">No sign-in sessions were returned for this account.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 text-xs text-library-muted">
            <span className="inline-flex items-center gap-1.5 border border-library-border px-2.5 py-1">
              <Wifi className="h-3.5 w-3.5" /> {onlineCount} online now
            </span>
            <span>{sessions.length} recent session{sessions.length === 1 ? '' : 's'}</span>
          </div>
          <div className="space-y-2">
            {sessions.map((session) => {
              const isCurrent = session.session_id === currentSessionId;
              const isPending = pendingSessionId === session.session_id;
              const displayDevice = session.device_name === 'Previously signed-in device'
                ? `${session.browser} · ${session.platform}`
                : session.device_name;
              const statusText = session.status === 'active'
                ? session.is_online ? 'Online now' : 'Session allowed · idle'
                : session.status === 'signed_out' ? 'Signed out' : session.status[0].toUpperCase() + session.status.slice(1);
              return (
                <article key={session.session_id} className="flex flex-col gap-3 border border-library-border bg-library-bg p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <Laptop className="mt-0.5 h-4 w-4 shrink-0 text-library-muted" />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-library-main">{displayDevice || 'Unknown device'}</p>
                        {isCurrent && <span className="border border-library-border px-1.5 py-0.5 text-[10px] font-semibold text-library-main">This device</span>}
                      </div>
                      {isAdmin && <p className="mt-0.5 truncate text-xs text-library-muted">{session.user_name} · {session.user_email}</p>}
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-library-muted">
                        <span className="inline-flex items-center gap-1.5">{session.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}{statusText}</span>
                        <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3 w-3" />Last seen {formatLastSeen(session.last_seen_at)}</span>
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      {isCurrent ? (
                        <span className="text-[11px] text-library-muted">Use Sign Out to end this session</span>
                      ) : session.status === 'active' ? (
                        <>
                          <button type="button" disabled={isPending} onClick={() => void changeSessionStatus(session, 'paused')} className="inline-flex min-h-8 items-center gap-1.5 border border-library-border px-2.5 text-[11px] font-semibold text-library-main hover:bg-library-surface disabled:opacity-50">
                            <Pause className="h-3.5 w-3.5" /> Pause
                          </button>
                          <button type="button" disabled={isPending} onClick={() => void changeSessionStatus(session, 'blocked')} className="inline-flex min-h-8 items-center gap-1.5 border border-library-border px-2.5 text-[11px] font-semibold text-library-main hover:bg-library-surface disabled:opacity-50">
                            <Ban className="h-3.5 w-3.5" /> Block
                          </button>
                        </>
                      ) : session.status === 'paused' || session.status === 'blocked' ? (
                        <button type="button" disabled={isPending} onClick={() => void changeSessionStatus(session, 'active')} className="inline-flex min-h-8 items-center gap-1.5 border border-library-border px-2.5 text-[11px] font-semibold text-library-main hover:bg-library-surface disabled:opacity-50">
                          <Play className="h-3.5 w-3.5" /> {session.status === 'paused' ? 'Resume' : 'Unblock'}
                        </button>
                      ) : null}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </>
      )}

      <p className="border-t border-library-border pt-3 text-[11px] leading-5 text-library-muted">
        Online status updates about every 30 seconds. Pause or Block applies to this sign-in session, not every future sign-in; disable an account in Users to stop all sign-ins. The app stores browser/device details but no IP address.
      </p>
    </section>
  );
};
