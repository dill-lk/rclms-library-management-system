import React, { useMemo, useState } from 'react';
import { Archive, AlertTriangle, Check, Copy, RotateCcw, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import type { Book } from '../../types';

interface DuplicateReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface DuplicateGroup {
  key: string;
  displayKey: string;
  books: Book[];
}

function normalizeAccession(value: string) {
  return value.trim().toLocaleUpperCase().replace(/[^A-Z0-9]/g, '');
}

function keepOrder(a: Book, b: Book) {
  return (a.addedDate || '').localeCompare(b.addedDate || '') || a.id.localeCompare(b.id);
}

export const DuplicateReviewModal: React.FC<DuplicateReviewModalProps> = ({ isOpen, onClose }) => {
  const { books, circulation, reservations, deleteBook, restoreBook, currentUser } = useLibrary();
  const [showArchived, setShowArchived] = useState(false);
  const [keeperByKey, setKeeperByKey] = useState<Record<string, string>>({});
  const canArchive = currentUser.permissions.includes('delete_books');

  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const grouped = new Map<string, Book[]>();
    books.filter((book) => !book.isArchived).forEach((book) => {
      const key = normalizeAccession(book.isbn || '');
      if (key) grouped.set(key, [...(grouped.get(key) || []), book]);
    });
    return Array.from(grouped.entries())
      .filter(([, group]) => group.length > 1)
      .map(([key, group]) => ({
        key,
        displayKey: group.find((book) => book.isbn.trim())?.isbn.trim() || key,
        books: [...group].sort(keepOrder),
      }))
      .sort((a, b) => b.books.length - a.books.length || a.displayKey.localeCompare(b.displayKey));
  }, [books]);

  const archivedBooks = useMemo(
    () => books.filter((book) => Boolean(book.isArchived)).sort((a, b) => a.title.localeCompare(b.title)),
    [books],
  );

  if (!isOpen) return null;

  const archiveDuplicate = async (group: DuplicateGroup, book: Book, keeper: Book) => {
    const openLoans = circulation.filter((record) => record.bookId === book.id && ['active', 'overdue', 'renewed'].includes(record.status)).length;
    const openReservations = reservations.filter((record) => record.bookId === book.id && ['pending', 'ready'].includes(record.status)).length;
    if (openLoans || openReservations) {
      window.alert(`This title still has ${openLoans} open loan(s) and ${openReservations} active reservation(s). Resolve those records before archiving it.`);
      return;
    }
    const confirmed = window.confirm(
      `Archive this duplicate from the active catalogue?\n\nDuplicate: ${book.title}\nAccession: ${group.displayKey}\nKeep active: ${keeper.title}\n\nThis is reversible from the Archived records list. Copy and circulation history will be preserved.`,
    );
    if (confirmed) await deleteBook(book.id);
  };

  const restoreArchived = async (book: Book) => {
    if (window.confirm(`Restore “${book.title}” to the active catalogue?`)) await restoreBook(book.id);
  };

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="duplicate-review-title" className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-700 dark:bg-[#181716]">
        <header className="flex items-start justify-between gap-4 border-b border-neutral-200 bg-gradient-to-r from-maroon-50 to-gold-50 px-5 py-5 dark:border-neutral-800 dark:from-maroon-950 dark:to-neutral-900 sm:px-7">
          <div>
            <div className="flex items-center gap-2 text-maroon-800 dark:text-gold-300"><Copy className="h-5 w-5" /><span className="text-xs font-bold uppercase tracking-[0.16em]">Catalogue integrity</span></div>
            <h2 id="duplicate-review-title" className="mt-2 text-xl font-bold text-neutral-950 dark:text-white">Duplicate accession review</h2>
            <p className="mt-1 max-w-2xl text-sm text-neutral-600 dark:text-neutral-300">Only exact accession-number matches are grouped. Choose the record to keep before archiving another; history and physical-copy records are preserved.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close duplicate review" className="rounded-xl p-2 text-neutral-500 transition hover:bg-white/80 hover:text-neutral-900 dark:hover:bg-neutral-800"><X className="h-5 w-5" /></button>
        </header>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-100 px-5 py-3 dark:border-neutral-800 sm:px-7">
          <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">{duplicateGroups.length} duplicate group{duplicateGroups.length === 1 ? '' : 's'} · {duplicateGroups.reduce((sum, group) => sum + group.books.length, 0)} active records scanned</p>
          <button type="button" onClick={() => setShowArchived((value) => !value)} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800"><Archive className="h-4 w-4" />{showArchived ? 'Review duplicates' : `Archived records (${archivedBooks.length})`}</button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {showArchived ? (
            archivedBooks.length ? (
              <div className="space-y-3">
                {archivedBooks.map((book) => (
                  <article key={book.id} className="flex flex-col gap-3 rounded-2xl border border-neutral-200 p-4 dark:border-neutral-800 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-semibold text-neutral-900 dark:text-white">{book.title}</p><p className="mt-1 text-xs text-neutral-500">{book.author} · Accession {book.isbn || '—'} · {book.totalCopies} physical copies preserved</p></div>
                    <button type="button" disabled={!canArchive} onClick={() => restoreArchived(book)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-emerald-300 px-3 text-xs font-bold text-emerald-800 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-800 dark:text-emerald-200 dark:hover:bg-emerald-950/40"><RotateCcw className="h-4 w-4" />Restore to catalogue</button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-neutral-300 px-5 py-12 text-center dark:border-neutral-700"><Archive className="mx-auto h-8 w-8 text-neutral-300" /><p className="mt-3 font-semibold text-neutral-800 dark:text-neutral-200">No archived titles</p><p className="mt-1 text-sm text-neutral-500">Archived records can be restored here at any time.</p></div>
            )
          ) : duplicateGroups.length ? (
            <div className="space-y-5">
              {duplicateGroups.map((group) => {
                const keeperId = keeperByKey[group.key] && group.books.some((book) => book.id === keeperByKey[group.key]) ? keeperByKey[group.key] : group.books[0].id;
                const keeper = group.books.find((book) => book.id === keeperId) || group.books[0];
                return (
                  <article key={group.key} className="overflow-hidden rounded-2xl border border-amber-200 bg-white dark:border-amber-900/70 dark:bg-[#201b18]">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-amber-100 bg-amber-50/70 px-4 py-3 dark:border-amber-900/60 dark:bg-amber-950/20"><div><p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">Exact accession match</p><p className="mt-0.5 font-mono text-sm font-bold text-neutral-900 dark:text-white">{group.displayKey}</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-neutral-900 dark:text-amber-200">{group.books.length} records</span></div>
                    <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {group.books.map((book) => {
                        const isKeeper = keeperId === book.id;
                        const openLoans = circulation.filter((record) => record.bookId === book.id && ['active', 'overdue', 'renewed'].includes(record.status)).length;
                        const openReservations = reservations.filter((record) => record.bookId === book.id && ['pending', 'ready'].includes(record.status)).length;
                        const hasOpenRecords = openLoans > 0 || openReservations > 0;
                        return (
                          <div key={book.id} className={`flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between ${isKeeper ? 'bg-emerald-50/50 dark:bg-emerald-950/10' : ''}`}>
                            <div className="flex min-w-0 items-start gap-3"><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${isKeeper ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800'}`}>{isKeeper ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</span><div className="min-w-0"><p className="font-semibold text-neutral-900 dark:text-white">{book.title}</p><p className="mt-0.5 text-xs text-neutral-600 dark:text-neutral-300">{book.author} · {book.edition || 'Edition not specified'} · {book.totalCopies} copies</p><p className="mt-1 text-[11px] text-neutral-500">Added {book.addedDate || 'date not recorded'} · {book.availableCopies} available{hasOpenRecords ? ` · ${openLoans} open loans, ${openReservations} active reservations` : ''}</p></div></div>
                            <div className="flex shrink-0 items-center gap-2 sm:ml-4">
                              {isKeeper ? <span className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-emerald-100 px-3 text-xs font-bold text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"><Check className="h-3.5 w-3.5" />Keep active</span> : <><button type="button" onClick={() => setKeeperByKey((state) => ({ ...state, [group.key]: book.id }))} className="min-h-9 rounded-lg border border-neutral-300 px-3 text-xs font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-200 dark:hover:bg-neutral-800">Keep this one</button><button type="button" disabled={!canArchive || hasOpenRecords} onClick={() => archiveDuplicate(group, book, keeper)} title={hasOpenRecords ? 'Resolve open loans or reservations first' : 'Archive this duplicate'} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-rose-300 px-3 text-xs font-bold text-rose-800 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:text-rose-200 dark:hover:bg-rose-950/40"><Archive className="h-3.5 w-3.5" />Archive duplicate</button></>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-neutral-300 px-5 py-12 text-center dark:border-neutral-700"><Check className="mx-auto h-9 w-9 text-emerald-600" /><p className="mt-3 font-semibold text-neutral-900 dark:text-white">No duplicate accessions found</p><p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">The active catalogue contains no exact normalized accession-number matches. Similar titles with different accessions are intentionally not grouped.</p></div>
          )}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-200 bg-neutral-50 px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900/60 sm:px-7"><p className="flex items-center gap-2 text-[11px] text-neutral-500"><AlertTriangle className="h-4 w-4 text-amber-600" />Archiving hides a title from circulation but preserves its history; restoration is available here.</p><button type="button" onClick={onClose} className="min-h-10 rounded-xl bg-maroon-800 px-5 text-sm font-bold text-white hover:bg-maroon-900">Close review</button></footer>
      </section>
    </div>
  );
};
