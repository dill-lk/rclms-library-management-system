import React, { useCallback, useEffect, useState } from 'react';
import { Archive, Download, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { getSupabase } from '../../utils/supabaseClient';
import { BetaBadge } from '../common/BetaBadge';

type AuditRow = {
  id: string;
  user_name: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

export const DataSafetyView: React.FC = () => {
  const { currentUser, exportDatabaseJson } = useLibrary();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [exporting, setExporting] = useState(false);
  const isBackupAdmin = currentUser.role === 'super_admin';

  const loadAudit = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    const supabase = getSupabase();
    if (!supabase) {
      setRows([]);
      setLoadError('The connected database is unavailable. Audit history is not loaded from demo data.');
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('audit_logs')
      .select('id,user_name,action,entity,entity_id,details,created_at')
      .order('created_at', { ascending: false })
      .limit(200);
    if (error) {
      setRows([]);
      setLoadError(`Audit history could not be loaded: ${error.message}`);
    } else {
      setRows((data || []) as AuditRow[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void loadAudit(); }, [loadAudit]);

  const handleBackup = async () => {
    if (!isBackupAdmin || exporting) return;
    setExporting(true);
    try {
      const result = await exportDatabaseJson();
      if (result.success) await loadAudit();
    } finally {
      setExporting(false);
    }
  };

  const filtered = rows.filter((row) => {
    const text = `${row.action} ${row.entity} ${row.entity_id || ''} ${row.user_name || ''} ${JSON.stringify(row.details || {})}`.toLowerCase();
    return text.includes(query.trim().toLowerCase());
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-library-border bg-library-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-library-muted"><ShieldCheck className="h-4 w-4" /> Data safety <BetaBadge /></p>
          <h1 className="mt-2 text-2xl font-bold text-library-main">Backups & audit log</h1>
          <p className="mt-1 max-w-2xl text-sm text-library-muted">Staff-only activity history and a verified, local JSON backup of connected library records. Nothing is uploaded to a third-party storage service.</p>
        </div>
        <button type="button" onClick={() => void loadAudit()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-library-border px-3 text-xs font-semibold text-library-main hover:bg-library-bg disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh log</button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-indigo-50 p-2.5 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"><Archive className="h-5 w-5" /></span>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Local database backup</h2>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600 dark:text-slate-400">Downloads the current Supabase records directly to this device, with a record-count manifest and SHA-256 integrity checksum. The JSON is not encrypted and may contain personal information; store it only in an access-restricted location.</p>
            {isBackupAdmin ? (
              <button type="button" onClick={() => void handleBackup()} disabled={exporting} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-700 px-4 text-xs font-bold text-white hover:bg-indigo-600 disabled:cursor-wait disabled:opacity-60"><Download className="h-4 w-4" />{exporting ? 'Preparing verified backup…' : 'Download verified backup'}</button>
            ) : (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/20 dark:text-amber-200">Database backup export is restricted to the super administrator.</p>
            )}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="text-sm font-bold text-slate-900 dark:text-white">Recent staff activity</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Latest 200 audit events visible to authorized library staff.</p></div>
          <label className="relative block w-full sm:max-w-xs"><Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter events…" className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-xs text-slate-800 outline-none focus:border-indigo-300 dark:border-slate-700 dark:bg-slate-800 dark:text-white" /></label>
        </div>
        {loading ? <div className="p-8 text-center text-xs text-slate-500">Loading audit history…</div> : loadError ? <div role="alert" className="p-6 text-sm text-rose-700 dark:text-rose-300">{loadError}</div> : filtered.length === 0 ? <div className="p-8 text-center text-xs text-slate-500">No audit events match this filter.</div> : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {filtered.map((row) => (
              <li key={row.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto] sm:items-start">
                <div><p className="text-xs font-bold text-slate-900 dark:text-white">{row.action.replace(/_/g, ' ')}</p><p className="mt-0.5 text-[10px] text-slate-500">{row.user_name || 'Unknown staff'}</p></div>
                <div className="min-w-0"><p className="truncate text-xs text-slate-700 dark:text-slate-300">{row.entity}{row.entity_id ? ` · ${row.entity_id}` : ''}</p>{row.details && <details className="mt-1"><summary className="cursor-pointer text-[10px] font-semibold text-indigo-700 dark:text-indigo-300">Details</summary><pre className="mt-1 overflow-x-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">{JSON.stringify(row.details, null, 2)}</pre></details>}</div>
                <time className="text-[10px] text-slate-500" dateTime={row.created_at}>{new Date(row.created_at).toLocaleString()}</time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};
