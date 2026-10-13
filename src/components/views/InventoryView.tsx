import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { BetaBadge } from '../common/BetaBadge';
import {
  AlertTriangle,
  Barcode as BarcodeIcon,
  Boxes,
  CheckCircle2,
  Download,
  LoaderCircle,
  RefreshCw,
  Search,
} from 'lucide-react';

const SESSION_STORAGE_KEY = 'rclms.stock-audit.session';
const PAGE_SIZE = 100;

const makeSessionId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (character) => {
    const random = Math.floor(Math.random() * 16);
    return (character === 'x' ? random : (random & 0x3) | 0x8).toString(16);
  });
};

const csvCell = (value: unknown): string => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const InventoryView: React.FC = () => {
  const {
    books,
    currentUser,
    isSupabaseConfigured,
    addToast,
    loadInventoryAuditScans,
    recordInventoryBarcode,
  } = useLibrary();

  const [auditSessionId, setAuditSessionId] = useState(() => {
    try {
      return window.sessionStorage.getItem(SESSION_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });
  const [scans, setScans] = useState<Array<{ copyId: string; barcode: string; scannedAt: string }>>([]);
  const [scanBarcode, setScanBarcode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const scanInputRef = useRef<HTMLInputElement>(null);

  const copies = useMemo(
    () => books.filter((book) => !book.isArchived).flatMap((book) =>
      (book.copies || []).map((copy) => ({ book, copy }))
    ),
    [books],
  );
  const scansByCopy = useMemo(() => new Map(scans.map((scan) => [scan.copyId, scan])), [scans]);
  const filteredCopies = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return copies;
    return copies.filter(({ book, copy }) => [
      book.title,
      book.isbn,
      book.section,
      book.shelfLocation,
      copy.barcode,
      copy.shelfLocation,
      copy.status,
    ].some((value) => String(value || '').toLowerCase().includes(query)));
  }, [copies, searchQuery]);
  const visibleCopies = filteredCopies.slice(0, visibleCount);
  const verifiedCount = copies.reduce((count, { copy }) => count + (scansByCopy.has(copy.copyId) ? 1 : 0), 0);
  const notYetScanned = Math.max(0, copies.length - verifiedCount);
  const reconciliationPercent = copies.length ? Math.round((verifiedCount / copies.length) * 100) : 0;

  useEffect(() => {
    if (!auditSessionId || !isSupabaseConfigured) {
      setScans([]);
      return;
    }
    let active = true;
    setIsLoading(true);
    void loadInventoryAuditScans(auditSessionId)
      .then((result) => {
        if (!active) return;
        if (result.success) setScans(result.scans);
        else {
          setScans([]);
          addToast({ type: 'error', title: 'Could not load audit session', message: result.message });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => { active = false; };
    // The session identifier and deployment configuration define the fetch; the context action is stable in purpose.
  }, [auditSessionId, isSupabaseConfigured]);

  useEffect(() => setVisibleCount(PAGE_SIZE), [searchQuery]);

  const startNewSession = () => {
    if (!isSupabaseConfigured) {
      addToast({ type: 'error', title: 'Database required', message: 'Stock Audit is not simulated; connect the library database before scanning.' });
      return;
    }
    const sessionId = makeSessionId();
    try {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, sessionId);
    } catch {
      // The database remains authoritative; session storage only remembers the active session in this tab.
    }
    setAuditSessionId(sessionId);
    setScans([]);
    setSearchQuery('');
    addToast({ type: 'success', title: 'Audit session started', message: 'Scans will be verified against registered physical copies and saved as you scan.' });
  };

  const handleScan = async (event: React.FormEvent) => {
    event.preventDefault();
    const barcode = scanBarcode.trim();
    if (!barcode || !auditSessionId || isSaving) return;
    setIsSaving(true);
    const result = await recordInventoryBarcode(auditSessionId, barcode);
    setIsSaving(false);
    setScanBarcode('');
    scanInputRef.current?.focus();
    if (!result.success || !result.scan) {
      addToast({ type: 'error', title: 'Scan not recorded', message: result.message });
      return;
    }
    const alreadyScanned = scansByCopy.has(result.scan.copyId);
    setScans((previous) => [result.scan!, ...previous.filter((scan) => scan.copyId !== result.scan!.copyId)]);
    const matched = copies.find(({ copy }) => copy.copyId === result.scan!.copyId);
    addToast({
      type: 'success',
      title: alreadyScanned ? 'Scan refreshed' : 'Copy verified',
      message: matched ? `${matched.book.title} · ${result.scan.barcode}${alreadyScanned ? ' (already counted in this session)' : ''}` : `Barcode ${result.scan.barcode} saved to the audit session.`,
    });
  };

  const exportAudit = () => {
    const headers = ['Title', 'ISBN', 'Barcode', 'Shelf', 'Copy status', 'Audit status', 'Last scanned'];
    const rows = copies.map(({ book, copy }) => {
      const scan = scansByCopy.get(copy.copyId);
      return [book.title, book.isbn, copy.barcode, copy.shelfLocation || book.shelfLocation, copy.status, scan ? 'Verified' : 'Not yet scanned', scan?.scannedAt || '']
        .map(csvCell)
        .join(',');
    });
    const blob = new Blob([[headers.map(csvCell).join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `RCLMS_Stock_Audit_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const isLibraryStaff = ['super_admin', 'librarian', 'assistant_librarian'].includes(currentUser.role);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold text-gray-900 dark:text-white">
              <Boxes className="h-5 w-5 text-maroon-800 dark:text-gold-400" />
              Stock Audit <BetaBadge />
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Scan registered physical-copy barcodes. Each verified copy is saved to the database for this audit session.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={exportAudit}
              disabled={!copies.length}
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-gray-200"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            <button
              type="button"
              onClick={startNewSession}
              disabled={!isSupabaseConfigured || !isLibraryStaff}
              className="inline-flex items-center gap-2 rounded-xl bg-maroon-800 px-4 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-maroon-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <RefreshCw className="h-4 w-4" /> {auditSessionId ? 'New audit session' : 'Start audit session'}
            </button>
          </div>
        </div>
        {!isSupabaseConfigured && (
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
            Stock Audit requires the connected library database. Demo/local inventory rows are not shown or counted as verified.
          </div>
        )}
        {auditSessionId && (
          <p className="mt-3 font-mono text-[10px] text-gray-500 dark:text-gray-400">
            Session {auditSessionId.slice(0, 8)} · {isLoading ? 'Loading saved scans…' : `${scans.length} saved scan${scans.length === 1 ? '' : 's'}`}
          </p>
        )}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label="Registered copies" value={copies.length} icon={<Boxes className="h-4 w-4" />} tone="maroon" />
        <Metric label="Verified this session" value={verifiedCount} icon={<CheckCircle2 className="h-4 w-4" />} tone="green" />
        <Metric label="Not yet scanned" value={notYetScanned} icon={<AlertTriangle className="h-4 w-4" />} tone={notYetScanned ? 'amber' : 'green'} />
        <Metric label="Reconciliation" value={`${reconciliationPercent}%`} icon={<BarcodeIcon className="h-4 w-4" />} tone="blue" />
      </section>

      {auditSessionId && (
        <section className="rounded-2xl border border-maroon-200 bg-maroon-50/70 p-4 dark:border-maroon-800 dark:bg-maroon-950/30">
          <div className="mb-3 flex items-center gap-3">
            <span className="rounded-xl bg-maroon-800 p-2 text-gold-300"><BarcodeIcon className="h-5 w-5" /></span>
            <div>
              <h3 className="text-sm font-bold text-maroon-900 dark:text-gold-300">Barcode scanner</h3>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">A handheld scanner can type the barcode and press Enter. Unknown codes are rejected.</p>
            </div>
          </div>
          <form onSubmit={handleScan} className="flex flex-col gap-2 sm:flex-row">
            <input
              ref={scanInputRef}
              type="text"
              value={scanBarcode}
              onChange={(event) => setScanBarcode(event.target.value)}
              placeholder="Scan or enter a registered copy barcode"
              autoComplete="off"
              autoFocus
              disabled={isSaving || isLoading || !isSupabaseConfigured}
              className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 py-2.5 font-mono text-sm text-gray-900 outline-none focus:border-maroon-700 focus:ring-2 focus:ring-maroon-700/20 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
            <button type="submit" disabled={!scanBarcode.trim() || isSaving || isLoading} className="inline-flex items-center justify-center gap-2 rounded-xl bg-maroon-800 px-5 py-2.5 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {isSaving ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              {isSaving ? 'Saving…' : 'Verify and save'}
            </button>
          </form>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Physical-copy audit ledger</h3>
            <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">Only catalogue copy records are listed; “not yet scanned” does not claim an item is missing.</p>
          </div>
          <label className="relative block w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search title, barcode, shelf…" className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-xs text-gray-900 outline-none focus:border-maroon-700 dark:border-slate-700 dark:bg-slate-800 dark:text-white" />
          </label>
        </div>
        {!copies.length ? (
          <div className="p-10 text-center">
            <Boxes className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />
            <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">No registered physical copies</p>
            <p className="mx-auto mt-1 max-w-lg text-xs text-gray-500 dark:text-gray-400">Add copy-level records and barcodes in the catalogue before starting an audit. The screen will not substitute demo inventory.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 dark:bg-slate-800/70 dark:text-gray-400">
                <tr>
                  <th className="px-4 py-3">Title &amp; barcode</th>
                  <th className="px-3 py-3">Shelf / section</th>
                  <th className="px-3 py-3">Copy status</th>
                  <th className="px-3 py-3">Audit</th>
                  <th className="px-4 py-3 text-right">Last scan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                {visibleCopies.map(({ book, copy }) => {
                  const scan = scansByCopy.get(copy.copyId);
                  return (
                    <tr key={copy.copyId} className="text-gray-800 dark:text-gray-200">
                      <td className="px-4 py-3"><p className="font-semibold">{book.title}</p><p className="mt-1 font-mono text-[10px] text-gray-500">{copy.barcode || 'No barcode'}</p></td>
                      <td className="px-3 py-3"><p className="font-mono">{copy.shelfLocation || book.shelfLocation || 'Not assigned'}</p><p className="mt-1 text-[10px] text-gray-500">{book.section || '—'}</p></td>
                      <td className="px-3 py-3 capitalize">{copy.status.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3">{scan ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200"><CheckCircle2 className="h-3 w-3" />Verified</span> : <span className="text-[10px] text-gray-500">Not yet scanned</span>}</td>
                      <td className="px-4 py-3 text-right text-[10px] text-gray-500">{scan ? new Date(scan.scannedAt).toLocaleString() : '—'}</td>
                    </tr>
                  );
                })}
                {!visibleCopies.length && <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-500">No registered copies match this search.</td></tr>}
              </tbody>
            </table>
          </div>
        )}
        {visibleCopies.length < filteredCopies.length && (
          <div className="border-t border-gray-100 p-3 text-center dark:border-slate-800">
            <button type="button" onClick={() => setVisibleCount((count) => count + PAGE_SIZE)} className="rounded-lg px-4 py-2 text-xs font-semibold text-maroon-800 hover:bg-gray-50 dark:text-gold-400 dark:hover:bg-slate-800">Show more copies ({filteredCopies.length - visibleCopies.length} remaining)</button>
          </div>
        )}
      </section>
    </div>
  );
};

const Metric: React.FC<{ label: string; value: string | number; icon: React.ReactNode; tone: 'maroon' | 'green' | 'amber' | 'blue' }> = ({ label, value, icon, tone }) => {
  const tones = {
    maroon: 'border-maroon-200 text-maroon-800 dark:border-maroon-900 dark:text-gold-300',
    green: 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300',
    amber: 'border-amber-200 text-amber-700 dark:border-amber-900 dark:text-amber-300',
    blue: 'border-sky-200 text-sky-700 dark:border-sky-900 dark:text-sky-300',
  };
  return (
    <div className={`rounded-2xl border bg-white p-4 shadow-xs dark:bg-slate-900 ${tones[tone]}`}>
      <div className="flex items-center justify-between gap-2"><span className="text-[10px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</span>{icon}</div>
      <p className="mt-2 text-2xl font-extrabold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
};
