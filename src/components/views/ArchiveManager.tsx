import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  CircleAlert,
  LoaderCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import type { ArchivedBookDeleteResult } from '../../context/LibraryContext';
import type { Book } from '../../types';

const formatDate = (date: string) => {
  if (!date) return 'Not recorded';
  const parsed = new Date(`${date.slice(0, 10)}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleDateString();
};

const copyCount = (book: Book) => book.copies.length;

export const ArchiveManager: React.FC = () => {
  const {
    books,
    circulation,
    reservations,
    currentUser,
    isSupabaseConfigured,
    refreshAllData,
    permanentlyDeleteArchivedBooks,
  } = useLibrary();
  const [query, setQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [results, setResults] = useState<ArchivedBookDeleteResult[] | null>(null);

  const canDelete = currentUser.permissions.includes('delete_books');
  const archivedBooks = useMemo(() => books.filter((book) => Boolean(book.isArchived)), [books]);
  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    if (!normalizedQuery) return archivedBooks;
    return archivedBooks.filter((book) => [
      book.title,
      book.author,
      book.isbn,
      book.category,
      book.publisher,
      book.section,
      book.shelfLocation,
      String(book.publicationYear || ''),
    ].some((value) => value.toLocaleLowerCase().includes(normalizedQuery)));
  }, [archivedBooks, query]);

  const circulationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    circulation.forEach((record) => counts.set(record.bookId, (counts.get(record.bookId) || 0) + 1));
    return counts;
  }, [circulation]);
  const reservationCounts = useMemo(() => {
    const counts = new Map<string, number>();
    reservations.forEach((record) => counts.set(record.bookId, (counts.get(record.bookId) || 0) + 1));
    return counts;
  }, [reservations]);

  const selectedBooks = useMemo(() => archivedBooks.filter((book) => selectedIds.includes(book.id)), [archivedBooks, selectedIds]);
  const selectedCount = selectedBooks.length;
  const allVisibleSelected = filteredBooks.length > 0 && filteredBooks.every((book) => selectedIds.includes(book.id));
  const selectedCopyCount = selectedBooks.reduce((total, book) => total + copyCount(book), 0);
  const confirmationMatches = confirmationText.trim() === 'DELETE';

  const toggleBook = (bookId: string) => {
    setSelectedIds((current) => current.includes(bookId) ? current.filter((id) => id !== bookId) : [...current, bookId]);
    setResults(null);
  };

  const toggleVisible = () => {
    setSelectedIds((current) => allVisibleSelected
      ? current.filter((id) => !filteredBooks.some((book) => book.id === id))
      : [...new Set([...current, ...filteredBooks.map((book) => book.id)])]);
    setResults(null);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshAllData();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleOpenConfirmation = () => {
    setConfirmationText('');
    setResults(null);
    setIsConfirmOpen(true);
  };

  const handleDeleteSelected = async () => {
    if (!confirmationMatches || selectedCount === 0 || !canDelete || isDeleting) return;
    setIsDeleting(true);
    try {
      const outcome = await permanentlyDeleteArchivedBooks(selectedBooks.map((book) => book.id));
      setResults(outcome);
      setSelectedIds(outcome.filter((item) => item.outcome !== 'deleted').map((item) => item.bookId));
    } catch {
      setResults(selectedBooks.map((book) => ({
        bookId: book.id,
        title: book.title,
        outcome: 'failed',
        copyCount: copyCount(book),
        message: 'No deletion result was confirmed. Refresh the archive before retrying.',
      })));
    } finally {
      setIsDeleting(false);
      setConfirmationText('');
    }
  };

  const closeConfirmation = () => {
    if (isDeleting) return;
    setIsConfirmOpen(false);
    setConfirmationText('');
    setResults(null);
  };

  const blockedHistoryCount = (bookId: string) => (circulationCounts.get(bookId) || 0) + (reservationCounts.get(bookId) || 0);

  return (
    <section aria-labelledby="archive-manager-title" className="space-y-4 rounded-3xl border border-neutral-200 bg-white p-5 shadow-xs dark:border-neutral-800 dark:bg-[#14171F] sm:p-6">
      <header className="flex flex-col gap-4 border-b border-neutral-100 pb-4 dark:border-neutral-800 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><Archive className="h-5 w-5" /></span>
          <div>
            <h3 id="archive-manager-title" className="text-base font-bold text-neutral-950 dark:text-white">Archive Manager</h3>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-neutral-600 dark:text-neutral-400">Review archived catalogue titles and their copy details. Permanent deletion removes a title and its physical-copy records; linked circulation, reservation, or stock-audit history is protected.</p>
          </div>
        </div>
        <button type="button" onClick={handleRefresh} disabled={isRefreshing} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">
          {isRefreshing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh archive
        </button>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Archived titles</p><p className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{archivedBooks.length}</p></div>
        <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Physical copies</p><p className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{archivedBooks.reduce((total, book) => total + copyCount(book), 0)}</p></div>
        <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Showing</p><p className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{filteredBooks.length}</p></div>
        <div className="rounded-2xl bg-neutral-50 p-3 dark:bg-neutral-900"><p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Selected</p><p className="mt-1 text-xl font-bold text-neutral-950 dark:text-white">{selectedCount}</p></div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">Search archived titles</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, author, ISBN, category, location…" className="min-h-10 w-full rounded-xl border border-neutral-300 bg-white pl-9 pr-3 text-xs text-neutral-900 placeholder:text-neutral-400 focus:border-red-700 focus:outline-none focus:ring-2 focus:ring-red-700/15 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          {canDelete ? <>
            <button type="button" onClick={toggleVisible} disabled={filteredBooks.length === 0} className="min-h-10 rounded-xl border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">{allVisibleSelected ? 'Clear visible' : 'Select visible'}</button>
            <button type="button" onClick={() => setSelectedIds([])} disabled={selectedCount === 0} className="min-h-10 rounded-xl border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Clear selection</button>
            <button type="button" onClick={handleOpenConfirmation} disabled={selectedCount === 0} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-3.5 text-xs font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 className="h-4 w-4" />Delete selected{selectedCount ? ` (${selectedCount})` : ''}</button>
          </> : <span className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-100 px-3 py-2 text-[11px] font-semibold text-neutral-600 dark:bg-neutral-900 dark:text-neutral-400"><ShieldCheck className="h-4 w-4" />View-only — deletion permission required</span>}
        </div>
      </div>

      {isSupabaseConfigured && <p className="text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">Records shown are loaded from the library database. The deletion action rechecks archival status and dependent history in the database before each title is removed.</p>}

      <div className="overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead className="bg-neutral-50 text-[10px] uppercase tracking-wide text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
              <tr>
                {canDelete && <th scope="col" className="w-10 px-3 py-3"><span className="sr-only">Select</span></th>}
                <th scope="col" className="px-3 py-3">Title / author</th>
                <th scope="col" className="px-3 py-3">Accession / ISBN</th>
                <th scope="col" className="px-3 py-3">Category / edition</th>
                <th scope="col" className="px-3 py-3">Copies</th>
                <th scope="col" className="px-3 py-3">Linked history</th>
                <th scope="col" className="px-3 py-3">Added</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {filteredBooks.map((book) => {
                const circulationCount = circulationCounts.get(book.id) || 0;
                const reservationCount = reservationCounts.get(book.id) || 0;
                const hasKnownHistory = circulationCount + reservationCount > 0;
                return (
                  <tr key={book.id} className="align-top hover:bg-neutral-50/70 dark:hover:bg-neutral-900/50">
                    {canDelete && <td className="px-3 py-3.5"><input type="checkbox" aria-label={`Select ${book.title}`} checked={selectedIds.includes(book.id)} onChange={() => toggleBook(book.id)} className="h-4 w-4 rounded border-neutral-300 text-red-700 focus:ring-red-700" /></td>}
                    <td className="px-3 py-3.5"><p className="max-w-[320px] font-bold text-neutral-950 dark:text-white">{book.title}</p><p className="mt-1 text-neutral-500">{book.author || 'Author not recorded'}{book.publicationYear ? ` · ${book.publicationYear}` : ''}</p><p className="mt-1 text-[10px] text-neutral-400">{book.language || 'Language not recorded'}{book.section ? ` · ${book.section}` : ''}{book.shelfLocation ? ` · ${book.shelfLocation}` : ''}</p></td>
                    <td className="px-3 py-3.5"><p className="font-mono text-neutral-700 dark:text-neutral-200">{book.isbn || 'Not recorded'}</p><p className="mt-1 text-neutral-500">Record ID: <span className="font-mono">{book.id.slice(0, 8)}</span></p></td>
                    <td className="px-3 py-3.5"><p className="font-medium text-neutral-800 dark:text-neutral-200">{book.category || 'Category not recorded'}</p><p className="mt-1 text-neutral-500">{book.edition || 'Edition not recorded'}{book.publisher ? ` · ${book.publisher}` : ''}</p></td>
                    <td className="px-3 py-3.5"><p className="font-bold text-neutral-900 dark:text-white">{copyCount(book)}</p><p className="mt-1 text-neutral-500">{book.availableCopies} available · {book.totalBorrows} recorded borrows</p></td>
                    <td className="px-3 py-3.5">{hasKnownHistory
                      ? <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"><CircleAlert className="h-3.5 w-3.5" />Protected</span>
                      : <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" />No history shown</span>}
                      <p className="mt-1 text-[10px] text-neutral-500">{circulationCount} loan{circulationCount === 1 ? '' : 's'} · {reservationCount} reservation{reservationCount === 1 ? '' : 's'}</p>
                    </td>
                    <td className="whitespace-nowrap px-3 py-3.5 text-neutral-600 dark:text-neutral-300">{formatDate(book.addedDate)}</td>
                  </tr>
                );
              })}
              {filteredBooks.length === 0 && <tr><td colSpan={canDelete ? 7 : 6} className="px-4 py-12 text-center"><Archive className="mx-auto h-7 w-7 text-neutral-300 dark:text-neutral-600" /><p className="mt-3 font-semibold text-neutral-800 dark:text-neutral-200">{archivedBooks.length ? 'No archived titles match this search' : 'No archived titles'}</p><p className="mt-1 text-xs text-neutral-500">{archivedBooks.length ? 'Try another title, author, ISBN, category, or location.' : 'When catalogue titles are archived, they will appear here.'}</p></td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {!canDelete && <p className="text-[11px] leading-5 text-neutral-500 dark:text-neutral-400">You can review archive contents. Only accounts with the existing delete-books permission can select permanent deletions.</p>}

      {isConfirmOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) closeConfirmation(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="archive-delete-title" className="w-full max-w-2xl overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-[#14171F]">
            <header className="flex items-start justify-between gap-4 border-b border-neutral-100 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6">
              <div className="flex items-start gap-3"><span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"><Trash2 className="h-5 w-5" /></span><div><p className="text-[10px] font-bold uppercase tracking-[0.14em] text-neutral-500">Permanent action</p><h3 id="archive-delete-title" className="mt-1 text-lg font-bold text-neutral-950 dark:text-white">{results ? 'Deletion results' : `Delete ${selectedCount} archived title${selectedCount === 1 ? '' : 's'} permanently?`}</h3></div></div>
              <button type="button" disabled={isDeleting} onClick={closeConfirmation} aria-label="Close confirmation" className="rounded-xl p-2 text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900 disabled:opacity-50 dark:hover:bg-neutral-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
            </header>

            {results ? <>
              <div className="max-h-[60vh] space-y-3 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">{results.filter((item) => item.outcome === 'deleted').length} deleted</span>
                  <span className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">{results.filter((item) => item.outcome === 'blocked').length} blocked</span>
                  <span className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300">{results.filter((item) => item.outcome === 'failed').length} not confirmed</span>
                </div>
                <ul className="space-y-2">
                  {results.map((item) => <li key={item.bookId} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-700"><p className="font-bold text-neutral-900 dark:text-white">{item.title}</p><p className={`mt-1 text-xs font-semibold ${item.outcome === 'deleted' ? 'text-emerald-700 dark:text-emerald-300' : item.outcome === 'blocked' ? 'text-amber-800 dark:text-amber-300' : 'text-rose-700 dark:text-rose-300'}`}>{item.outcome === 'deleted' ? 'Deleted' : item.outcome === 'blocked' ? 'Blocked — no deletion made for this title' : 'Not confirmed'}</p><p className="mt-1 text-[11px] leading-5 text-neutral-600 dark:text-neutral-400">{item.message}</p></li>)}
                </ul>
              </div>
              <footer className="flex justify-end border-t border-neutral-100 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900 sm:px-6"><button type="button" onClick={closeConfirmation} className="min-h-10 rounded-xl bg-neutral-900 px-5 text-xs font-bold text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200">Close</button></footer>
            </> : <>
              <div className="max-h-[60vh] space-y-4 overflow-y-auto px-5 py-5 sm:px-6">
                <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div className="text-sm leading-5"><p className="font-bold">This cannot be undone.</p><p className="mt-1 text-xs leading-5">The selected {selectedCount} title{selectedCount === 1 ? '' : 's'} and {selectedCopyCount} linked physical-copy record{selectedCopyCount === 1 ? '' : 's'} will be permanently removed if the database confirms they have no protected history. Loan history, reservations, and stock-audit scans are preserved; any dependent record blocks that title’s deletion.</p></div></div>
                <div><p className="mb-2 text-xs font-bold text-neutral-800 dark:text-neutral-200">Selected records</p><ul className="max-h-52 space-y-1.5 overflow-y-auto rounded-xl border border-neutral-200 p-2 dark:border-neutral-700">{selectedBooks.map((book) => <li key={book.id} className="flex items-start justify-between gap-3 rounded-lg px-2 py-1.5 text-xs"><span className="min-w-0"><span className="block truncate font-semibold text-neutral-900 dark:text-white">{book.title}</span><span className="block truncate text-[10px] text-neutral-500">{book.author || 'Author not recorded'} · {book.isbn || 'No ISBN'} · {copyCount(book)} copies</span></span>{blockedHistoryCount(book.id) > 0 && <span className="shrink-0 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">Known history</span>}</li>)}</ul></div>
                <label htmlFor="archive-delete-confirm" className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200">Type <span className="font-mono font-bold">DELETE</span> to confirm
                  <input id="archive-delete-confirm" type="text" autoComplete="off" value={confirmationText} onChange={(event) => setConfirmationText(event.target.value)} placeholder="DELETE" className="mt-2 w-full rounded-xl border border-neutral-300 bg-white px-3 py-2.5 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-600/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white" />
                </label>
              </div>
              <footer className="flex flex-col-reverse gap-2 border-t border-neutral-100 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900 sm:flex-row sm:justify-end sm:px-6"><button type="button" disabled={isDeleting} onClick={closeConfirmation} className="min-h-10 rounded-xl border border-neutral-300 bg-white px-4 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700">Cancel</button><button type="button" disabled={!confirmationMatches || !canDelete || isDeleting || selectedCount === 0} onClick={handleDeleteSelected} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-xs font-bold text-white hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40">{isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}{isDeleting ? 'Checking and deleting…' : 'Confirm permanent deletion'}</button></footer>
            </>}
          </section>
        </div>
      )}
    </section>
  );
};
