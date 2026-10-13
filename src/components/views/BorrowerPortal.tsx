import React, { useMemo, useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap, LogOut, Search, UserRound, X } from 'lucide-react';
import type { Book } from '../../types';
import { useLibrary } from '../../context/LibraryContext';
import { ToastContainer } from '../common/ToastContainer';

type PortalSection = 'home' | 'catalogue' | 'account';

export const BorrowerPortal: React.FC = () => {
  const { books, currentUser, logout } = useLibrary();
  const [section, setSection] = useState<PortalSection>('home');
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const isTeacher = currentUser.role === 'teacher';
  const catalogue = useMemo(() => books.filter((book) => !book.isArchived), [books]);
  const featured = useMemo(
    () => [...catalogue].sort((a, b) => (b.totalBorrows || 0) - (a.totalBorrows || 0)).slice(0, 4),
    [catalogue],
  );
  const filteredBooks = useMemo(() => {
    const search = query.trim().toLowerCase();
    return catalogue.filter((book) => !search || [book.title, book.author, book.category, book.isbn, book.tags.join(' ')].join(' ').toLowerCase().includes(search));
  }, [catalogue, query]);

  const navigate = (next: PortalSection) => {
    setSection(next);
    setSelectedBook(null);
    if (next !== 'catalogue') setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-[#f5f2ed] text-slate-900">
      <header className="sticky top-0 z-30 border-b border-[#eadfd2] bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <img src="/logo.png" alt="Rahula College crest" className="h-10 w-8 object-contain" />
            <div className="min-w-0">
              <p className="truncate text-xs font-bold uppercase tracking-[0.15em] text-[#6e1731]">Rahula College Library</p>
              <p className="text-[10px] text-slate-500">{isTeacher ? 'Teacher reader portal' : 'Student reader portal'}</p>
            </div>
          </div>
          <nav aria-label="Reader portal" className="hidden items-center gap-1 sm:flex">
            <PortalNavButton active={section === 'home'} onClick={() => navigate('home')}>My library</PortalNavButton>
            <PortalNavButton active={section === 'catalogue'} onClick={() => navigate('catalogue')}>Browse books</PortalNavButton>
            <PortalNavButton active={section === 'account'} onClick={() => navigate('account')}>My account</PortalNavButton>
          </nav>
          <div className="flex items-center gap-2">
            <div className="hidden text-right md:block">
              <p className="max-w-36 truncate text-xs font-semibold">{currentUser.name}</p>
              <p className="text-[10px] capitalize text-slate-500">{currentUser.role}</p>
            </div>
            <button type="button" onClick={logout} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700" aria-label="Sign out">
              <LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
        <nav aria-label="Reader portal mobile" className="flex gap-2 overflow-x-auto border-t border-slate-100 px-4 py-2 sm:hidden">
          <PortalNavButton active={section === 'home'} onClick={() => navigate('home')}>My library</PortalNavButton>
          <PortalNavButton active={section === 'catalogue'} onClick={() => navigate('catalogue')}>Browse books</PortalNavButton>
          <PortalNavButton active={section === 'account'} onClick={() => navigate('account')}>My account</PortalNavButton>
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {section === 'home' && (
          <>
            <section className="relative overflow-hidden rounded-[2rem] bg-[#172638] px-6 py-8 text-white sm:px-10 sm:py-10">
              <div aria-hidden="true" className="absolute -right-12 -top-24 h-72 w-72 rounded-full border-[36px] border-white/5" />
              <div className="relative max-w-2xl">
                <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-[#e8cf91]">
                  {isTeacher ? <BookOpen className="h-3.5 w-3.5" /> : <GraduationCap className="h-3.5 w-3.5" />}
                  {isTeacher ? 'Teacher reader portal' : 'Student reader portal'}
                </p>
                <h1 className="mt-5 text-3xl font-bold leading-tight sm:text-4xl">Good to see you, {currentUser.name.split(' ')[0]}.</h1>
                <p className="mt-3 max-w-xl text-sm leading-6 text-slate-300">Discover books in the Rahula College Library and keep your reader account details in one simple place.</p>
                <button type="button" onClick={() => navigate('catalogue')} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#e8cf91] px-4 py-3 text-xs font-bold text-[#172638] transition hover:bg-white">
                  Browse the catalogue <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </section>

            <section className="mt-6 grid gap-3 sm:grid-cols-3">
              <SummaryCard label="Titles in catalogue" value={catalogue.length.toLocaleString()} icon={<BookOpen className="h-5 w-5" />} />
              <SummaryCard label="Available to borrow" value={catalogue.filter((book) => book.availableCopies > 0).length.toLocaleString()} icon={<Search className="h-5 w-5" />} />
              <SummaryCard label="Your account type" value={isTeacher ? 'Teacher' : 'Student'} icon={<UserRound className="h-5 w-5" />} />
            </section>

            <section className="mt-9">
              <div className="mb-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8e6a35]">Picked for readers</p>
                  <h2 className="mt-1 text-xl font-bold">Popular in the library</h2>
                </div>
                <button type="button" onClick={() => navigate('catalogue')} className="inline-flex items-center gap-1 text-xs font-semibold text-[#6e1731] hover:underline">See all books <ArrowRight className="h-3.5 w-3.5" /></button>
              </div>
              {featured.length ? <BookGrid books={featured} onSelect={setSelectedBook} /> : <EmptyCatalogue />}
            </section>
          </>
        )}

        {section === 'catalogue' && (
          <section>
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8e6a35]">Explore the collection</p>
                <h1 className="mt-1 text-2xl font-bold">Browse books</h1>
                <p className="mt-2 text-sm text-slate-600">Search by title, author, subject, or ISBN.</p>
              </div>
              <label className="relative block w-full sm:max-w-sm">
                <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the catalogue" className="w-full rounded-xl border border-[#e7d9c9] bg-white py-3 pl-10 pr-4 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
              </label>
            </div>
            <p className="mt-5 text-xs text-slate-500">{filteredBooks.length} {filteredBooks.length === 1 ? 'title' : 'titles'}</p>
            {filteredBooks.length ? <BookGrid books={filteredBooks} onSelect={setSelectedBook} /> : <EmptyCatalogue />}
          </section>
        )}

        {section === 'account' && (
          <section className="mx-auto max-w-3xl">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#8e6a35]">Your details</p>
            <h1 className="mt-1 text-2xl font-bold">My account</h1>
            <div className="mt-6 rounded-3xl border border-[#e7d9c9] bg-white p-6 shadow-sm sm:p-8">
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f6e9df] text-lg font-bold text-[#6e1731]">
                  {currentUser.name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold">{currentUser.name}</h2>
                  <span className="mt-1 inline-flex rounded-full bg-[#f6e9df] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6e1731]">{isTeacher ? 'Teacher' : 'Student'}</span>
                </div>
              </div>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                <AccountField label="Email address" value={currentUser.email} />
                <AccountField label={isTeacher ? 'Staff ID' : 'Admission number'} value={currentUser.admissionNo || 'Not provided'} />
                {!isTeacher && <AccountField label="Grade" value={currentUser.grade || 'Not provided'} />}
                {isTeacher && <AccountField label="Department" value={currentUser.designation || 'Teacher'} />}
                <AccountField label="Access" value="Reader portal" />
              </dl>
              <p className="mt-6 rounded-2xl bg-[#f7f4ef] p-4 text-xs leading-5 text-slate-600">This reader portal is separate from library management. For changes to your account details, please contact the library staff.</p>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-8 border-t border-[#eadfd2] bg-white px-4 py-5 text-center text-[11px] text-slate-500">
        Rahula College Library · Matara, Sri Lanka
      </footer>

      {selectedBook && <BookDetailsModal book={selectedBook} onClose={() => setSelectedBook(null)} />}
      <ToastContainer />
    </div>
  );
};

const PortalNavButton: React.FC<{ active: boolean; onClick: () => void; children: React.ReactNode }> = ({ active, onClick, children }) => (
  <button type="button" onClick={onClick} className={`whitespace-nowrap rounded-xl px-3 py-2 text-xs font-semibold transition ${active ? 'bg-[#f6e9df] text-[#6e1731]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'}`}>{children}</button>
);

const SummaryCard: React.FC<{ label: string; value: string; icon: React.ReactNode }> = ({ label, value, icon }) => (
  <div className="flex items-center gap-4 rounded-2xl border border-[#e7d9c9] bg-white p-4">
    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f6e9df] text-[#6e1731]">{icon}</span>
    <div><p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 text-lg font-bold">{value}</p></div>
  </div>
);

const BookGrid: React.FC<{ books: Book[]; onSelect: (book: Book) => void }> = ({ books, onSelect }) => (
  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {books.map((book) => (
      <button key={book.id} type="button" onClick={() => onSelect(book)} className="group overflow-hidden rounded-2xl border border-[#e7d9c9] bg-white text-left transition hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-[#7d1d39]/10">
        <div className="flex h-40 items-center justify-center bg-[#f2ece4] p-4">
          {book.coverImage ? <img src={book.coverImage} alt="" className="h-full max-w-full object-contain drop-shadow-md" /> : <BookOpen className="h-12 w-12 text-[#9b7a61]" />}
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e6a35]">{book.category || 'Library collection'}</p>
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 group-hover:text-[#6e1731]">{book.title}</h3>
          <p className="mt-1 truncate text-xs text-slate-500">{book.author || 'Author not listed'}</p>
          <p className={`mt-3 text-[10px] font-semibold ${book.availableCopies > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{book.availableCopies > 0 ? `${book.availableCopies} available` : 'Currently unavailable'}</p>
        </div>
      </button>
    ))}
  </div>
);

const EmptyCatalogue: React.FC = () => (
  <div className="mt-5 rounded-2xl border border-dashed border-[#d9c9b8] bg-white p-10 text-center">
    <BookOpen className="mx-auto h-8 w-8 text-slate-400" />
    <p className="mt-3 text-sm font-semibold">No books found</p>
    <p className="mt-1 text-xs text-slate-500">Try another search, or check back later.</p>
  </div>
);

const AccountField: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div><dt className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd></div>
);

const BookDetailsModal: React.FC<{ book: Book; onClose: () => void }> = ({ book, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="reader-book-title" className="relative max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
      <button type="button" onClick={onClose} aria-label="Close book details" className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      <div className="flex flex-col gap-5 sm:flex-row">
        <div className="flex h-48 w-full shrink-0 items-center justify-center rounded-2xl bg-[#f2ece4] p-4 sm:w-36">
          {book.coverImage ? <img src={book.coverImage} alt="" className="h-full max-w-full object-contain" /> : <BookOpen className="h-12 w-12 text-[#9b7a61]" />}
        </div>
        <div className="min-w-0 pt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e6a35]">{book.category || 'Library collection'}</p>
          <h2 id="reader-book-title" className="mt-2 text-xl font-bold">{book.title}</h2>
          <p className="mt-1 text-sm text-slate-600">{book.author || 'Author not listed'}</p>
          <p className={`mt-4 text-xs font-semibold ${book.availableCopies > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{book.availableCopies > 0 ? `${book.availableCopies} copies available` : 'No copies currently available'}</p>
        </div>
      </div>
      {book.description && <p className="mt-6 whitespace-pre-line text-sm leading-6 text-slate-600">{book.description}</p>}
      <dl className="mt-6 grid grid-cols-2 gap-4 border-t border-slate-100 pt-5">
        <AccountField label="Language" value={book.language || 'Not listed'} />
        <AccountField label="Shelf" value={book.shelfLocation || 'Ask library staff'} />
        <AccountField label="Publisher" value={book.publisher || 'Not listed'} />
        <AccountField label="Published" value={book.publicationYear ? String(book.publicationYear) : 'Not listed'} />
      </dl>
    </section>
  </div>
);
