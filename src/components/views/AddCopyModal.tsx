import React, { useState } from 'react';
import { Book } from '../../types';
import { useLibrary } from '../../context/LibraryContext';
import { Copy, X, Plus } from 'lucide-react';

interface AddCopyModalProps {
  book: Book;
  isOpen: boolean;
  onClose: () => void;
}

export const AddCopyModal: React.FC<AddCopyModalProps> = ({ book, isOpen, onClose }) => {
  const { addBookCopy, addToast } = useLibrary();

  const nextCopyNum = (book.copies?.length || 0) + 1;
  const [parigahanaAnkaya, setParigahanaAnkaya] = useState(
    book.copies && book.copies.length > 0
      ? `${book.isbn.trim()}-${nextCopyNum}`
      : `${book.isbn.trim()}`
  );
  const [shelfLocation, setShelfLocation] = useState(book.shelfLocation || '');
  const [condition, setCondition] = useState<'new' | 'good' | 'fair' | 'damaged'>('new');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!parigahanaAnkaya.trim()) {
      addToast({
        type: 'warning',
        title: 'Missing Identifier',
        message: 'Please enter a valid accession number for this copy.',
      });
      return;
    }

    addBookCopy(book.id, {
      parigahanaAnkaya: parigahanaAnkaya.trim(),
      shelfLocation,
      condition,
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#14171F] rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between bg-neutral-50 dark:bg-neutral-900/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-red-950/60 border border-red-800/40 flex items-center justify-center text-amber-400">
              <Copy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-white">
                Add Physical Copy #{nextCopyNum}
              </h3>
              <p className="text-[11px] text-neutral-500 truncate max-w-[240px]">
                {book.title}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Copy barcode (පරිග්‍රහණ අංකය) *
            </label>
            <input
              type="text"
              required
              value={parigahanaAnkaya}
              onChange={(e) => setParigahanaAnkaya(e.target.value)}
              placeholder="e.g. RC-BK-7784"
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs font-mono text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-800"
            />
            <p className="text-[10px] text-neutral-400 mt-1">
              Unique barcode for this physical copy.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Shelf Location
            </label>
            <input
              type="text"
              value={shelfLocation}
              onChange={(e) => setShelfLocation(e.target.value)}
              placeholder="e.g. Shelf A-01, Rack 2"
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-800"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-neutral-300 mb-1">
              Physical Condition
            </label>
            <select
              value={condition}
              onChange={(e) => setCondition(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-xs text-neutral-900 dark:text-white focus:ring-2 focus:ring-red-800"
            >
              <option value="new">Brand New (පිරිසිදු නව පිටපතක්)</option>
              <option value="good">Good Condition (හොඳ තත්ත්වය)</option>
              <option value="fair">Fair / Used (භාවිත කළ)</option>
              <option value="damaged">Damaged / Repair Required (හානි වූ)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Confirm & Register Copy</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
