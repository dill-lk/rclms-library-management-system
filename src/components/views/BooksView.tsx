import React, { useState, useMemo, useEffect } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { Book } from '../../types';
import { AddCopyModal } from './AddCopyModal';
import { CatalogueImportModal } from './CatalogueImportModal';
import { DuplicateReviewModal } from './DuplicateReviewModal';
import { PermanentlyDeleteArchivedBookModal } from './PermanentlyDeleteArchivedBookModal';
import {
  Search,
  Filter,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  BookOpen,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  FileSpreadsheet,
  Printer,
  CopyPlus,
  RefreshCw,
  Upload,
  Archive,
  RotateCcw,
  Copy,
  MoreHorizontal,
} from 'lucide-react';

interface BooksViewProps {
  onAddBook: () => void;
  onEditBook: (book: Book) => void;
}

export const BooksView: React.FC<BooksViewProps> = ({ onAddBook, onEditBook }) => {
  const {
    books,
    categories,
    deleteBook,
    restoreBook,
    setSelectedBookId,
    setActiveTab,
    addToast,
    addToLabelQueue,
    catalogFilter,
    setCatalogFilter,
    currentUser,
    refreshAllData,
  } = useLibrary();

  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchQuery, setSearchQuery] = useState(catalogFilter?.author || catalogFilter?.publisher || '');
  const [selectedCategory, setSelectedCategory] = useState<string>(catalogFilter?.category || 'all');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('all');
  const [selectedAvailability, setSelectedAvailability] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('popularity');
  const [currentPage, setCurrentPage] = useState(1);
  const [copyModalBook, setCopyModalBook] = useState<Book | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showDuplicateReview, setShowDuplicateReview] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [bookToPermanentlyDelete, setBookToPermanentlyDelete] = useState<Book | null>(null);

  const isStaff = currentUser.role === 'super_admin' || currentUser.role === 'librarian' || currentUser.role === 'assistant_librarian';
  const canManageDuplicates = currentUser.permissions.includes('delete_books');
  const itemsPerPage = 8;

  // Sync if catalogFilter changes
  useEffect(() => {
    if (catalogFilter?.category) {
      setSelectedCategory(catalogFilter.category);
    }
    if (catalogFilter?.author) {
      setSearchQuery(catalogFilter.author);
    }
    if (catalogFilter?.publisher) {
      setSearchQuery(catalogFilter.publisher);
    }
  }, [catalogFilter]);

  // Multi-field search and filter
  const filteredBooks = useMemo(() => {
    return books.filter((b) => {
      if (Boolean(b.isArchived) !== showArchived) return false;
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.publisher.toLowerCase().includes(q) ||
        b.copies?.some((c) => c.barcode.toLowerCase().includes(q)) ||
        b.tags.some((t) => t.toLowerCase().includes(q)) ||
        b.shelfLocation.toLowerCase().includes(q);

      const matchesCat = selectedCategory === 'all' || b.category === selectedCategory;
      const matchesLang = selectedLanguage === 'all' || b.language === selectedLanguage;
      const matchesAvail =
        selectedAvailability === 'all'
          ? true
          : selectedAvailability === 'available'
          ? b.availableCopies > 0
          : selectedAvailability === 'borrowed'
          ? b.availableCopies === 0
          : true;

      return matchesSearch && matchesCat && matchesLang && matchesAvail;
    }).sort((a, b) => {
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      if (sortBy === 'author') return a.author.localeCompare(b.author);
      if (sortBy === 'copies') return b.totalCopies - a.totalCopies;
      if (sortBy === 'available') return b.availableCopies - a.availableCopies;
      return b.totalBorrows - a.totalBorrows;
    });
  }, [books, searchQuery, selectedCategory, selectedLanguage, selectedAvailability, sortBy, showArchived]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage) || 1;
  const paginatedBooks = filteredBooks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleExportCSV = () => {
    const headers = 'Book ID,Title,Author,Accession number,Category,Language,Total Copies,Available,Shelf Location\n';
    const rows = filteredBooks
      .map(
        (b) =>
          `"${b.id}","${b.title}","${b.author}","${b.isbn}","${b.category}","${b.language}",${b.totalCopies},${b.availableCopies},"${b.shelfLocation}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rahula_College_Library_Catalog_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    addToast({
      type: 'success',
      title: 'Catalog Exported',
      message: `Exported ${filteredBooks.length} titles to CSV format.`,
    });
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setActiveTab('book_details');
  };

  const handleResetFilters = () => {
    setSelectedCategory('all');
    setSelectedLanguage('all');
    setSelectedAvailability('all');
    setSearchQuery('');
    setCatalogFilter(null);
  };

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-neutral-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold font-heading text-neutral-900">
            {showArchived ? 'Archived books' : 'Books Collection'}
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            {showArchived ? 'Set-aside titles can be restored from here.' : 'Browse the collection and find what you’re looking for.'}
          </p>
        </div>

        {/* Keep the everyday action visible; group less-used tools together. */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isStaff && (
            <button
              onClick={onAddBook}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-library-action px-4 text-sm font-bold text-library-actionInk shadow-sm transition hover:bg-white"
            >
              <Plus className="h-4 w-4" />
              <span>Add New Book</span>
            </button>
          )}

          <details className="catalogue-tools relative">
            <summary aria-label="More catalogue actions" className="flex min-h-10 cursor-pointer list-none items-center gap-2 rounded-xl border border-neutral-200 bg-neutral-50 px-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-100">
              <MoreHorizontal className="h-4 w-4" />
              <span>More</span>
            </summary>
            <div role="menu" className="absolute right-0 top-full z-30 mt-2 min-w-52 overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl">
              <button type="button" role="menuitem" disabled={isRefreshing} onClick={async (event) => {
                event.currentTarget.closest('details')?.removeAttribute('open');
                setIsRefreshing(true);
                try {
                  await refreshAllData();
                  addToast({ type: 'info', title: 'Catalog Refreshed', message: 'Loaded the latest collection records.' });
                } finally {
                  setIsRefreshing(false);
                }
              }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:opacity-50">
                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>{isRefreshing ? 'Refreshing…' : 'Refresh catalogue'}</span>
              </button>
              <button type="button" role="menuitem" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setActiveTab('zebra_printer'); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100">
                <Printer className="h-4 w-4" />
                <span>Print labels</span>
              </button>
              <button type="button" role="menuitem" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); handleExportCSV(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100">
                <FileSpreadsheet className="h-4 w-4" />
                <span>Export CSV</span>
              </button>
              {isStaff && (
                <button type="button" role="menuitem" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setIsImportModalOpen(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100">
                  <Upload className="h-4 w-4" />
                  <span>Import CSV</span>
                </button>
              )}
              {canManageDuplicates && (
                <button type="button" role="menuitem" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setShowDuplicateReview(true); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100">
                  <Copy className="h-4 w-4" />
                  <span>Review duplicates</span>
                </button>
              )}
              <div className="my-1 border-t border-neutral-200" />
              <button type="button" role="menuitem" onClick={(event) => { event.currentTarget.closest('details')?.removeAttribute('open'); setShowArchived((value) => !value); setCurrentPage(1); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-neutral-700 transition hover:bg-neutral-100">
                {showArchived ? <RotateCcw className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
                <span>{showArchived ? 'Back to books' : 'Archived books'}</span>
              </button>
            </div>
          </details>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-neutral-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center justify-between gap-3">
          {/* Live Search input */}
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by title, accession number, author, barcode, or tags..."
              className="w-full pl-9 pr-8 py-2 bg-neutral-50 border border-neutral-200 rounded-xl text-xs sm:text-sm text-neutral-900 placeholder-neutral-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-950"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Controls: Sort and View mode switch */}
          <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-500 hidden sm:inline">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs py-1.5 px-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-hidden"
              >
                <option value="popularity">Most Borrowed</option>
                <option value="title">Title (A-Z)</option>
                <option value="author">Author (A-Z)</option>
                <option value="copies">Total Copies</option>
                <option value="available">Available First</option>
              </select>
            </div>

            {/* Grid / Table toggle */}
            <div className="flex items-center p-1 bg-neutral-100 rounded-lg border border-neutral-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'table'
                    ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition ${
                  viewMode === 'grid'
                    ? 'bg-white text-neutral-950 shadow-2xs font-bold'
                    : 'text-neutral-500 hover:text-neutral-800'
                }`}
                title="Card Grid View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Pills row */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-neutral-100 text-xs">
          <div className="flex items-center gap-1.5 text-neutral-500 font-semibold mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filters:</span>
          </div>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-hidden"
          >
            <option value="all">All Categories ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Language filter */}
          <select
            value={selectedLanguage}
            onChange={(e) => {
              setSelectedLanguage(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-hidden"
          >
            <option value="all">All Languages</option>
            <option value="Sinhala">Sinhala (සිංහල)</option>
            <option value="English">English</option>
            <option value="Tamil">Tamil (தமிழ்)</option>
            <option value="Pali">Pali (පාලි)</option>
          </select>

          {/* Availability filter */}
          <select
            value={selectedAvailability}
            onChange={(e) => {
              setSelectedAvailability(e.target.value);
              setCurrentPage(1);
            }}
            className="py-1 px-2.5 bg-neutral-50 border border-neutral-200 rounded-lg text-neutral-800 focus:outline-hidden"
          >
            <option value="all">All Availability</option>
            <option value="available">Available Now</option>
            <option value="borrowed">Fully Checked Out</option>
          </select>

          {(selectedCategory !== 'all' || selectedLanguage !== 'all' || selectedAvailability !== 'all' || searchQuery) && (
            <button
              onClick={handleResetFilters}
              className="text-neutral-950 hover:underline font-semibold text-[11px] ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {filteredBooks.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center space-y-4">
          <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto text-neutral-400">
            <BookOpen className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-900">
              {showArchived ? 'No Archived Titles' : books.filter((book) => !book.isArchived).length === 0 ? 'Library Collection is Empty' : 'No Matching Titles Found'}
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mx-auto">
              {showArchived ? 'Archived titles appear here and can be restored or permanently deleted, one record at a time.' : books.filter((book) => !book.isArchived).length === 0
                ? 'Get started by creating your categories and cataloging your first physical book title.'
                : 'No books match the active search query and filter criteria.'}
            </p>
          </div>
          {!showArchived && books.filter((book) => !book.isArchived).length === 0 ? (
            isStaff && (
              <button
                onClick={onAddBook}
                className="px-5 py-2.5 bg-neutral-950 hover:bg-neutral-100 text-white font-bold text-xs rounded-xl shadow-md transition inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>+ Catalog First Book</span>
              </button>
            )
          ) : (
            <button
              onClick={handleResetFilters}
              className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100"
            >
              Clear Active Filters
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* TABLE VIEW */
        <div className="bg-white rounded-2xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-neutral-50/75 border-b border-neutral-200 text-neutral-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Book Title & Author</th>
                  <th className="py-3 px-4">Accession number</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Location</th>
                  <th className="py-3 px-4">Stock Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {paginatedBooks.map((book) => {
                  const isAvailable = book.availableCopies > 0;
                  const firstCopyBarcode = book.copies?.[0]?.barcode || book.isbn;
                  return (
                    <tr
                      key={book.id}
                      className="hover:bg-neutral-50 transition group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-11 rounded-md bg-neutral-950 text-neutral-700 flex items-center justify-center font-bold text-xs flex-shrink-0 shadow-xs">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <div>
                            <button
                              onClick={() => handleSelectBook(book.id)}
                              className="font-bold text-neutral-900 hover:text-neutral-800 text-left line-clamp-1"
                            >
                              {book.title}
                            </button>
                            <p className="text-[11px] text-neutral-500">
                              {book.author} • {book.language} ({book.publicationYear})
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-bold text-neutral-800">
                        {firstCopyBarcode}
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-700 text-[11px] font-medium">
                          {book.category}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-neutral-600 text-[11px]">
                        {book.shelfLocation}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {book.isArchived
                            ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Archived</span>
                            : <StatusBadge status={isAvailable ? 'available' : 'borrowed'} size="sm" />}
                          <span className="font-mono text-[11px] font-bold text-neutral-700">
                            {book.availableCopies} / {book.totalCopies}
                          </span>
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {isStaff && !book.isArchived && (
                            <button
                              onClick={() => setCopyModalBook(book)}
                              className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-emerald-50 transition"
                              title="Register New Physical Copy"
                            >
                              <CopyPlus className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => {
                              addToLabelQueue({
                                bookId: book.id,
                                title: book.title,
                                barcode: firstCopyBarcode,
                                shelfLocation: book.shelfLocation,
                                category: book.category,
                                copyNumber: 1,
                              });
                            }}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 transition"
                            title="Add to print-label queue"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleSelectBook(book.id)}
                            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-800 hover:bg-neutral-100 transition"
                            title="View Full Book Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isStaff && !book.isArchived && (
                            <>
                              <button
                                onClick={() => onEditBook(book)}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
                                title="Edit Book Metadata"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              {canManageDuplicates && <button
                                onClick={() => {
                                  if (confirm(`Archive "${book.title}" from the active catalogue? Its circulation history and copies will be kept, and it can be restored.`)) {
                                    deleteBook(book.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-neutral-400 hover:text-indigo-700 hover:bg-indigo-50 transition"
                                title="Archive record — it can be restored"
                              >
                                <Archive className="w-4 h-4" />
                              </button>}
                            </>
                          )}
                          {isStaff && book.isArchived && <>
                            <button onClick={() => restoreBook(book.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200" title="Restore to active catalogue">
                              <RotateCcw className="h-3.5 w-3.5" /> Restore
                            </button>
                            <button disabled={!canManageDuplicates} onClick={() => setBookToPermanentlyDelete(book)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:text-rose-200" title="Delete this archived record permanently">
                              <Trash2 className="h-3.5 w-3.5" /> Delete permanently
                            </button>
                          </>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* GRID / CARD VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedBooks.map((book) => {
            const isAvailable = book.availableCopies > 0;
            const firstCopyBarcode = book.copies?.[0]?.barcode || book.isbn;
            return (
              <div
                key={book.id}
                className="bg-white border border-neutral-200 rounded-2xl p-4 shadow-subtle hover:shadow-card hover:border-indigo-200 transition duration-200 flex flex-col justify-between group"
              >
                <div>
                  {/* Top Cover Banner */}
                  <div className="h-32 rounded-xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-cyan-600 text-white p-3 relative overflow-hidden flex flex-col justify-between shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono bg-slate-950/25 text-white/90 px-2 py-0.5 rounded">
                        {book.language}
                      </span>
                      {book.isArchived
                        ? <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">Archived</span>
                        : <StatusBadge status={isAvailable ? 'available' : 'borrowed'} size="sm" />}
                    </div>
                    <div>
                      <span className="text-[9px] font-mono text-white/70 uppercase tracking-widest block">
                        RAHULA COLLEGE
                      </span>
                      <h4 className="text-xs font-bold text-white line-clamp-2 leading-snug">
                        {book.title}
                      </h4>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="mt-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-neutral-800 truncate">
                        {book.author}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-mono">{book.publicationYear}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-neutral-500">
                      <span className="truncate">{book.category}</span>
                      <span className="font-mono text-neutral-600">{firstCopyBarcode}</span>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-xs border-t border-neutral-100">
                      <span className="text-[11px] text-neutral-400">Availability:</span>
                      <span className="font-mono font-bold text-neutral-900">
                        {book.availableCopies} / {book.totalCopies} Copies
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="mt-4 pt-2 border-t border-neutral-100 flex items-center justify-between gap-1.5">
                  <button
                    onClick={() => handleSelectBook(book.id)}
                    className="flex-1 py-1.5 px-3 text-xs font-bold text-neutral-950 bg-neutral-50 hover:bg-neutral-100 rounded-lg transition text-center"
                  >
                    View Details
                  </button>
                  {isStaff && !book.isArchived && (
                    <button
                      onClick={() => setCopyModalBook(book)}
                      className="p-1.5 text-neutral-400 hover:text-neutral-700 hover:bg-emerald-50 rounded-lg transition"
                      title="Add Copy"
                    >
                      <CopyPlus className="w-4 h-4" />
                    </button>
                  )}
                  {!book.isArchived && <button
                    onClick={() => {
                      addToLabelQueue({
                        bookId: book.id,
                        title: book.title,
                        barcode: firstCopyBarcode,
                        shelfLocation: book.shelfLocation,
                        category: book.category,
                        copyNumber: 1,
                      });
                    }}
                    className="p-1.5 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition"
                      title="Add to print-label queue"
                  >
                    <Printer className="w-4 h-4" />
                  </button>}
                  {isStaff && book.isArchived && <>
                    <button onClick={() => restoreBook(book.id)} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 px-2.5 py-1.5 text-[11px] font-bold text-emerald-800 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-200" title="Restore to active catalogue">
                      <RotateCcw className="h-3.5 w-3.5" />Restore
                    </button>
                    <button disabled={!canManageDuplicates} onClick={() => setBookToPermanentlyDelete(book)} className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-rose-900 dark:text-rose-200" title="Delete this archived record permanently">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-neutral-200 text-xs">
          <span className="text-neutral-500">
            Showing Page <span className="font-bold text-neutral-900">{currentPage}</span> of{' '}
            <span className="font-bold text-neutral-900">{totalPages}</span> ({filteredBooks.length} titles)
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-2 border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-2 border border-neutral-200 rounded-lg disabled:opacity-40 hover:bg-neutral-100 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Add Copy Modal */}
      {copyModalBook && (
        <AddCopyModal
          book={copyModalBook}
          isOpen={Boolean(copyModalBook)}
          onClose={() => setCopyModalBook(null)}
        />
      )}

      {/* Catalogue Bulk Import Modal */}
      <CatalogueImportModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
      />

      <DuplicateReviewModal
        isOpen={showDuplicateReview}
        onClose={() => setShowDuplicateReview(false)}
      />
      <PermanentlyDeleteArchivedBookModal
        book={bookToPermanentlyDelete}
        onClose={() => setBookToPermanentlyDelete(null)}
      />
    </div>
  );
};
