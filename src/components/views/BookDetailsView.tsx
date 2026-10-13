import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { Barcode } from '../common/Barcode';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Layers,
  MapPin,
  Barcode as BarcodeIcon,
  Plus,
  Edit,
  Trash2,
  CalendarCheck,
  BookMarked,
  Printer,
  Sparkles,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Eye,
  Bookmark,
  Tag
} from 'lucide-react';

interface BookDetailsViewProps {
  onBack: () => void;
  onEdit: () => void;
}

export const BookDetailsView: React.FC<BookDetailsViewProps> = ({ onBack, onEdit }) => {
  const {
    books,
    selectedBookId,
    setSelectedBookId,
    circulation,
    addBookCopy,
    createReservation,
    setActiveTab,
    setPrintData,
    currentUser,
    members,
    addToLabelQueue,
    addToast,
  } = useLibrary();

  const [activeTabSub, setActiveTabSub] = useState<'copies' | 'history' | 'description'>('copies');

  const book = books.find((b) => b.id === selectedBookId) || books[0];

  if (!book) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Book not found.</p>
        <button onClick={onBack} className="mt-2 text-red-700 underline font-semibold">
          Back to catalog
        </button>
      </div>
    );
  }

  const bookHistory = circulation.filter((c) => c.bookId === book.id);
  const relatedBooks = books.filter((b) => b.category === book.category && b.id !== book.id).slice(0, 3);

  const handleQuickReserve = () => {
    const student = members.find((m) => m.type === 'student') || members[0];
    createReservation(student.id, book.id);
  };

  const handlePrintBarcodes = () => {
    setActiveTab('zebra_printer');
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation Row */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-red-700 dark:hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Catalog</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintBarcodes}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Labels</span>
          </button>
          <button
            onClick={onEdit}
            className="px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/60 rounded-xl hover:bg-blue-100 transition flex items-center gap-1.5"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Edit Metadata</span>
          </button>
        </div>
      </div>

      {/* Main Book Card Overview */}
      <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Book Cover Plate & Quick Actions (4 cols) */}
        <div className="lg:col-span-4 flex flex-col items-center">
          <div className="w-full max-w-[240px] aspect-[3/4] bg-gradient-to-br from-[#800020] via-[#5A0015] to-[#2D000A] rounded-2xl shadow-xl border border-amber-500/30 p-6 flex flex-col justify-between text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 -mt-6 -mr-6 w-24 h-24 bg-amber-400/10 rounded-full blur-xl" />
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono tracking-wider text-amber-300 bg-black/40 px-2 py-0.5 rounded">
                  {book.language}
                </span>
                <span className="text-[10px] font-mono text-amber-400">RC-{book.publicationYear}</span>
              </div>
              <h3 className="font-heading font-extrabold text-base text-white mt-4 line-clamp-3 leading-snug">
                {book.title}
              </h3>
              {book.subtitle && (
                <p className="text-[11px] text-neutral-300 italic mt-1 line-clamp-2">
                  {book.subtitle}
                </p>
              )}
            </div>

            <div className="border-t border-white/10 pt-3">
              <p className="text-xs font-semibold text-amber-300 truncate">{book.author}</p>
              <p className="text-[10px] text-neutral-400 truncate">{book.publisher}</p>
            </div>
          </div>

          <div className="mt-4 w-full max-w-[240px]">
            <Barcode value={book.isbn} width={200} height={40} />
          </div>

          <div className="w-full max-w-[240px] space-y-2 mt-4">
            <button
              onClick={() => setActiveTab('borrow')}
              className="w-full py-2.5 px-3 bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 text-white font-bold rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
            >
              <BookMarked className="w-4 h-4 text-amber-300" />
              <span>Issue This Title</span>
            </button>
            <button
              onClick={handleQuickReserve}
              className="w-full py-2.5 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/20 font-bold rounded-xl transition flex items-center justify-center gap-2 text-xs"
            >
              <CalendarCheck className="w-4 h-4" />
              <span>Reserve Hold</span>
            </button>
            <button
              onClick={() => addBookCopy(book.id)}
              className="w-full py-2 px-3 bg-neutral-50 hover:bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700 font-semibold rounded-xl transition flex items-center justify-center gap-2 text-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Physical Copy</span>
            </button>
          </div>
        </div>

        {/* Right: Detailed Metadata & Specs (8 cols) */}
        <div className="lg:col-span-8 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-red-950/15 dark:bg-red-900/40 text-red-800 dark:text-amber-300 font-bold px-2.5 py-1 rounded-full border border-red-800/20">
                {book.category}
              </span>
              <StatusBadge
                status={book.availableCopies > 0 ? 'available' : 'borrowed'}
                size="md"
              />
              <span className="text-xs text-neutral-400 font-mono">ID: {book.id}</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-neutral-900 dark:text-white mt-2">
              {book.title}
            </h1>
            {book.subtitle && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
                {book.subtitle}
              </p>
            )}
            <p className="text-sm font-semibold text-red-700 dark:text-amber-400 mt-2">
              By {book.author}
            </p>

            {/* Key specs grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 text-xs">
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">ISBN-13</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5 block">
                  {book.isbn}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Publisher</span>
                <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                  {book.publisher}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Year & Edition</span>
                <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                  {book.publicationYear} ({book.edition})
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Medium</span>
                <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block">
                  {book.language}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Total Copies</span>
                <span className="font-mono font-bold text-neutral-900 dark:text-white mt-0.5 block">
                  {book.totalCopies} Total
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Available Now</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                  {book.availableCopies} Available
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Shelf Position</span>
                <span className="font-mono font-bold text-red-700 dark:text-amber-400 mt-0.5 block">
                  {book.shelfLocation}
                </span>
              </div>
              <div>
                <span className="text-neutral-400 block text-[10px] uppercase font-bold">Hall / Section</span>
                <span className="font-semibold text-neutral-900 dark:text-white mt-0.5 block truncate">
                  {book.section}
                </span>
              </div>
            </div>

            {/* Description */}
            <div className="mt-5">
              <h4 className="text-xs font-bold text-neutral-900 dark:text-white uppercase tracking-wider mb-1.5">
                Overview & Relevancy
              </h4>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {book.description}
              </p>
            </div>

            {/* Tags */}
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {book.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 px-2 py-0.5 rounded-md"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs: Copies Management vs Borrowing History */}
      <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <button
            onClick={() => setActiveTabSub('copies')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
              activeTabSub === 'copies'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Physical Stock ({book.copies.length})
          </button>
          <button
            onClick={() => setActiveTabSub('history')}
            className={`text-xs font-bold px-3 py-1.5 rounded-xl transition ${
              activeTabSub === 'history'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Circulation Log ({bookHistory.length})
          </button>
        </div>

        {/* Copies View */}
        {activeTabSub === 'copies' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Copy #</th>
                  <th className="py-2.5 px-3">Barcode</th>
                  <th className="py-2.5 px-3">Shelf</th>
                  <th className="py-2.5 px-3">Condition</th>
                  <th className="py-2.5 px-3">Current Status</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3 text-right">Zebra Queue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                {book.copies.map((copy) => (
                  <tr key={copy.copyId} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-bold">Copy {copy.copyNumber}</td>
                    <td className="py-2.5 px-3 font-mono text-neutral-500 dark:text-neutral-400">
                      {copy.barcode}
                    </td>
                    <td className="py-2.5 px-3 font-mono">{copy.shelfLocation}</td>
                    <td className="py-2.5 px-3 capitalize">{copy.condition}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={copy.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-3 font-medium text-neutral-500 font-mono">
                      {copy.dueDate || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => {
                          addToLabelQueue({
                            bookId: book.id,
                            title: book.title,
                            barcode: copy.barcode,
                            shelfLocation: copy.shelfLocation || book.shelfLocation,
                            category: book.category,
                            copyNumber: copy.copyNumber,
                          });
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[11px] font-semibold transition inline-flex items-center gap-1"
                        title="Add this copy to 3-across Zebra label queue"
                      >
                        <Tag className="w-3 h-3" />
                        <span>+ 3-Across Queue</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* History View */}
        {activeTabSub === 'history' && (
          <div className="mt-4 overflow-x-auto">
            {bookHistory.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">
                No borrowing transactions recorded yet for this book.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Issued Date</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Return Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3">Issued By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {bookHistory.map((tx) => (
                    <tr key={tx.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-2.5 px-3 font-bold">{tx.memberName}</td>
                      <td className="py-2.5 px-3 text-neutral-500 font-mono">{tx.borrowDate}</td>
                      <td className="py-2.5 px-3 font-mono">{tx.dueDate}</td>
                      <td className="py-2.5 px-3 text-neutral-500 font-mono">{tx.returnDate || 'Pending'}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={tx.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-neutral-400">{tx.issuedBy}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>

      {/* Related Books */}
      {relatedBooks.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-bold font-heading text-neutral-900 dark:text-white">
            Related Titles in {book.category}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {relatedBooks.map((rel) => (
              <div
                key={rel.id}
                onClick={() => setSelectedBookId(rel.id)}
                className="p-3.5 bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xs hover:border-red-700/60 cursor-pointer transition flex items-start gap-3"
              >
                <div className="w-10 h-14 bg-gradient-to-tr from-red-950 to-red-800 rounded-xl text-amber-300 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  RC
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {rel.title}
                  </h4>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {rel.author}
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block mt-1">
                    {rel.availableCopies} available
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
