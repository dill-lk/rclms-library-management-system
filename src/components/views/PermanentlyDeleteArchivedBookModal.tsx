import React, { useEffect, useState } from 'react';
import { AlertTriangle, Archive, LoaderCircle, Trash2, X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import type { Book } from '../../types';

interface PermanentlyDeleteArchivedBookModalProps {
  book: Book | null;
  onClose: () => void;
}

export const PermanentlyDeleteArchivedBookModal: React.FC<PermanentlyDeleteArchivedBookModalProps> = ({ book, onClose }) => {
  const { circulation, reservations, currentUser, permanentlyDeleteArchivedBook } = useLibrary();
  const [typedTitle, setTypedTitle] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    setTypedTitle('');
    setIsDeleting(false);
  }, [book?.id]);

  if (!book) return null;

  const circulationCount = circulation.filter((record) => record.bookId === book.id).length;
  const reservationCount = reservations.filter((record) => record.bookId === book.id).length;
  const hasLinkedHistory = circulationCount > 0 || reservationCount > 0;
  const canManage = currentUser.permissions.includes('delete_books');
  const titleMatches = typedTitle.trim().toLocaleLowerCase() === book.title.trim().toLocaleLowerCase();

  const handleDelete = async () => {
    if (!titleMatches || hasLinkedHistory || !canManage || isDeleting) return;
    setIsDeleting(true);
    const deleted = await permanentlyDeleteArchivedBook(book.id);
    setIsDeleting(false);
    if (deleted) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !isDeleting) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="permanent-delete-title" className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50 px-5 py-5 dark:border-slate-800 dark:bg-slate-900 sm:px-6">
          <div className="flex items-start gap-3">
            <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300"><Trash2 className="h-5 w-5" /></span>
            <div>
              <p className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-slate-500"><Archive className="h-3.5 w-3.5" />Already archived</p>
              <h2 id="permanent-delete-title" className="mt-1 text-lg font-bold tracking-tight text-slate-950 dark:text-white">Delete this record permanently?</h2>
            </div>
          </div>
          <button type="button" disabled={isDeleting} onClick={onClose} aria-label="Close permanent delete confirmation" className="rounded-xl p-2 text-slate-400 hover:bg-slate-200 hover:text-slate-800 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-white"><X className="h-4 w-4" /></button>
        </header>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950/50">
            <p className="font-semibold text-slate-950 dark:text-white">{book.title}</p>
            <p className="mt-1 text-xs text-slate-500">{book.author || 'Author not recorded'} · Accession {book.isbn || '—'}</p>
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">{book.totalCopies} linked physical-copy record{book.totalCopies === 1 ? '' : 's'}</p>
          </div>

          <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-950 dark:border-rose-900/60 dark:bg-rose-950/25 dark:text-rose-100">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="text-sm leading-5">
              <p className="font-bold">This is a permanent delete, not another archive action.</p>
              <p className="mt-1 text-xs leading-5">The title and its {book.totalCopies} linked copy record{book.totalCopies === 1 ? '' : 's'} will be removed. This cannot be undone. If those copies are real stock, restore or reconcile the record instead.</p>
            </div>
          </div>

          {hasLinkedHistory && (
            <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-100">
              Deletion is blocked because this title has {circulationCount} circulation record{circulationCount === 1 ? '' : 's'} and {reservationCount} reservation{reservationCount === 1 ? '' : 's'}. Keeping the archived record preserves that history.
            </p>
          )}
          {!canManage && <p role="alert" className="text-xs font-semibold text-rose-700 dark:text-rose-300">Your account does not have permission to delete catalogue records.</p>}

          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200" htmlFor="confirm-archived-title">
            Type the exact title to confirm
            <input
              id="confirm-archived-title"
              type="text"
              autoComplete="off"
              value={typedTitle}
              onChange={(event) => setTypedTitle(event.target.value)}
              placeholder={book.title}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>

        <footer className="flex flex-col-reverse gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:justify-end sm:px-6">
          <button type="button" disabled={isDeleting} onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700">Cancel</button>
          <button type="button" disabled={!titleMatches || hasLinkedHistory || !canManage || isDeleting} onClick={handleDelete} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-rose-700 px-4 text-sm font-bold text-white shadow-sm hover:bg-rose-800 disabled:cursor-not-allowed disabled:opacity-40">
            {isDeleting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            {isDeleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </footer>
      </section>
    </div>
  );
};
