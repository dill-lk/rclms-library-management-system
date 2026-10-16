import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, BookOpen, GraduationCap, LogOut, Save, Search, UserRound, X } from 'lucide-react';
import type { Book } from '../../types';
import { useLibrary } from '../../context/LibraryContext';
import { ToastContainer } from '../common/ToastContainer';
import { SiteAttribution } from '../common/SiteAttribution';
import { UserAvatar } from '../common/UserAvatar';

type PortalSection = 'home' | 'catalogue' | 'account';

export const BorrowerPortal: React.FC = () => {
  const { books, currentUser, logout, updateOwnProfile, changeOwnPassword, addToast } = useLibrary();
  const [section, setSection] = useState<PortalSection>('home');
  const [query, setQuery] = useState('');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [accountName, setAccountName] = useState(currentUser.name);
  const [accountPhone, setAccountPhone] = useState(currentUser.phone || '');
  const [savingAccount, setSavingAccount] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const isTeacher = currentUser.role === 'teacher';
  const catalogue = useMemo(() => books.filter((book) => !book.isArchived), [books]);
  const featured = useMemo(
    () => [...catalogue].sort((a, b) => (b.totalBorrows || 0) - (a.totalBorrows || 0)).slice(0, 4),
    [catalogue],
  );
  const filteredBooks = useMemo(() => {
    const search = query.trim().toLowerCase();
    return catalogue.filter((book) => {
      const details = [
        book.title, book.subtitle, book.author, book.category, book.isbn, book.publisher,
        book.publicationYear, book.edition, book.language, book.shelfLocation, book.section,
        book.description, book.tags.join(' '),
        ...book.copies.map((copy) => [copy.barcode, copy.copyNumber, copy.shelfLocation].join(' ')),
      ].join(' ').toLowerCase();
      return !search || details.includes(search);
    });
  }, [catalogue, query]);

  useEffect(() => {
    setAccountName(currentUser.name);
    setAccountPhone(currentUser.phone || '');
  }, [currentUser.id, currentUser.name, currentUser.phone]);

  const handleSaveAccount = async (event: React.FormEvent) => {
    event.preventDefault();
    setSavingAccount(true);
    try {
      const result = await updateOwnProfile({ name: accountName, phone: accountPhone });
      if (result.success && result.user) {
        setAccountName(result.user.name);
        setAccountPhone(result.user.phone || '');
      }
    } finally {
      setSavingAccount(false);
    }
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      addToast({ type: 'error', title: 'Passwords do not match', message: 'Enter the same new password twice.' });
      return;
    }
    setSavingPassword(true);
    try {
      const result = await changeOwnPassword(currentPassword, newPassword);
      if (result.success) {
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } finally {
      setSavingPassword(false);
    }
  };

  const navigate = (next: PortalSection) => {
    setSection(next);
    setSelectedBook(null);
    if (next !== 'catalogue') setQuery('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="borrower-portal min-h-screen bg-[#f5f2ed] text-slate-900">
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
            <UserAvatar
              accountId={currentUser.id}
              accountName={currentUser.name}
              avatarPath={currentUser.avatar}
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#f6e9df] text-xs font-bold text-[#6e1731]"
            />
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
                <UserAvatar
                  accountId={currentUser.id}
                  accountName={currentUser.name}
                  avatarPath={currentUser.avatar}
                  className="flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#f6e9df] text-lg font-bold text-[#6e1731]"
                />
                <div>
                  <h2 className="text-lg font-bold">{currentUser.name}</h2>
                  <span className="mt-1 inline-flex rounded-full bg-[#f6e9df] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-[#6e1731]">{isTeacher ? 'Teacher' : 'Student'}</span>
                </div>
              </div>
              <form onSubmit={handleSaveAccount} className="mt-6 space-y-4">
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Full name</span>
                  <input type="text" required maxLength={120} value={accountName} onChange={(event) => setAccountName(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e7d9c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                </label>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Phone number</span>
                  <input type="tel" maxLength={40} value={accountPhone} onChange={(event) => setAccountPhone(event.target.value)} placeholder="Add a contact number" className="mt-1 w-full rounded-xl border border-[#e7d9c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                </label>
                <dl className="grid gap-5 border-t border-slate-100 pt-4 sm:grid-cols-2">
                  <AccountField label="Sign-in email" value={currentUser.email} />
                  <AccountField label={isTeacher ? 'Staff ID' : 'Admission number'} value={currentUser.admissionNo || 'Not provided'} />
                  {!isTeacher && <AccountField label="Grade" value={currentUser.grade || 'Not provided'} />}
                  {isTeacher && <AccountField label="Department" value={currentUser.designation || 'Teacher'} />}
                  <AccountField label="Access" value="Reader portal" />
                </dl>
                <button type="submit" disabled={savingAccount} className="inline-flex items-center gap-2 rounded-xl bg-[#6e1731] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#511125] disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="h-4 w-4" /> {savingAccount ? 'Saving…' : 'Save details'}
                </button>
              </form>
              <p className="mt-5 rounded-2xl bg-[#f7f4ef] p-4 text-xs leading-5 text-slate-600">Your reader login is separate from the official Members Directory. Editing these details does not create or change a library membership record. Your sign-in email, role, and school identifiers are managed separately.</p>
              <form onSubmit={handleChangePassword} className="mt-8 space-y-4 border-t border-slate-100 pt-6">
                <div>
                  <h3 className="text-sm font-bold">Change password</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-500">Verify your current password first. Other sign-ins will be ended after the change.</p>
                </div>
                <label className="block">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Current password</span>
                  <input type="password" required autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e7d9c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                </label>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">New password</span>
                    <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e7d9c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Confirm new password</span>
                    <input type="password" required minLength={8} maxLength={128} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="mt-1 w-full rounded-xl border border-[#e7d9c9] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#7d1d39] focus:ring-4 focus:ring-[#7d1d39]/10" />
                  </label>
                </div>
                <button type="submit" disabled={savingPassword} className="inline-flex items-center gap-2 rounded-xl bg-[#6e1731] px-4 py-3 text-xs font-bold text-white transition hover:bg-[#511125] disabled:cursor-not-allowed disabled:opacity-60">
                  <Save className="h-4 w-4" /> {savingPassword ? 'Updating…' : 'Update password'}
                </button>
              </form>
            </div>
          </section>
        )}
      </main>

      <footer className="mt-8 border-t border-[#eadfd2] bg-white px-4 py-5 text-center text-[11px] text-slate-500">
        <span>Rahula College Library · Matara, Sri Lanka</span>
        <span className="mx-2 text-slate-300" aria-hidden="true">·</span>
        <SiteAttribution className="text-slate-400 hover:text-slate-600" />
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
          {book.coverImage ? <img src={book.coverImage} alt={`Cover of ${book.title}`} loading="lazy" className="h-full max-w-full object-contain drop-shadow-md" /> : <BookOpen className="h-12 w-12 text-[#9b7a61]" />}
        </div>
        <div className="p-4">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e6a35]">{book.category || 'Library collection'}</p>
          <h3 className="mt-1 line-clamp-2 min-h-10 text-sm font-bold leading-5 group-hover:text-[#6e1731]">{book.title}</h3>
          {book.subtitle && <p className="mt-1 line-clamp-1 text-[11px] italic text-slate-500">{book.subtitle}</p>}
          <p className="mt-2 truncate text-xs font-medium text-slate-600">{book.author || 'Author not listed'}</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 border-t border-slate-100 pt-3 text-left">
            <BookDetailField label="ISBN" value={book.isbn || 'Not listed'} compact />
            <BookDetailField label="Publisher" value={book.publisher || 'Not listed'} compact />
            <BookDetailField label="Year / edition" value={`${book.publicationYear || '—'} · ${book.edition || 'Edition not listed'}`} compact />
            <BookDetailField label="Language" value={book.language || 'Not listed'} compact />
          </dl>
          <p className={`mt-3 text-[10px] font-semibold ${book.availableCopies > 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{book.availableCopies > 0 ? `${book.availableCopies} of ${book.totalCopies} copies available` : 'Currently unavailable'}</p>
          <p className="mt-2 text-[10px] font-bold text-[#6e1731]">View all book details <span aria-hidden="true">→</span></p>
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

const BookDetailField: React.FC<{ label: string; value: string; compact?: boolean }> = ({ label, value, compact = false }) => (
  <div className="min-w-0">
    <dt className={`font-bold uppercase tracking-wide text-slate-500 ${compact ? 'text-[8px]' : 'text-[10px]'}`}>{label}</dt>
    <dd className={`mt-1 break-words font-medium text-slate-900 ${compact ? 'line-clamp-2 text-[10px]' : 'text-sm'}`}>{value || 'Not listed'}</dd>
  </div>
);

const BookDetailsModal: React.FC<{ book: Book; onClose: () => void }> = ({ book, onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section role="dialog" aria-modal="true" aria-labelledby="reader-book-title" className="relative max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl sm:p-8">
      <button type="button" onClick={onClose} aria-label="Close book details" className="absolute right-4 top-4 rounded-xl p-2 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
      <div className="flex flex-col gap-5 border-b border-slate-100 pb-6 sm:flex-row">
        <div className="flex h-56 w-full shrink-0 items-center justify-center rounded-2xl bg-[#f2ece4] p-4 sm:h-64 sm:w-48">
          {book.coverImage ? <img src={book.coverImage} alt={`Cover of ${book.title}`} className="h-full max-w-full object-contain" /> : <BookOpen className="h-12 w-12 text-[#9b7a61]" />}
        </div>
        <div className="min-w-0 pt-2 sm:pr-8">
          <p className="text-[10px] font-bold uppercase tracking-wide text-[#8e6a35]">{book.category || 'Library collection'}</p>
          <h2 id="reader-book-title" className="mt-2 text-2xl font-bold leading-tight">{book.title}</h2>
          {book.subtitle && <p className="mt-1 text-sm italic text-slate-600">{book.subtitle}</p>}
          <p className="mt-3 text-sm font-medium text-slate-700">By {book.author || 'Author not listed'}</p>
          <p className={`mt-5 inline-flex rounded-full px-3 py-1.5 text-xs font-bold ${book.availableCopies > 0 ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
            {book.availableCopies > 0 ? `${book.availableCopies} of ${book.totalCopies} copies available` : 'No copies currently available'}
          </p>
        </div>
      </div>
      <section className="mt-6" aria-labelledby="reader-book-information">
        <h3 id="reader-book-information" className="text-sm font-bold">Book information</h3>
        <dl className="mt-4 grid gap-x-5 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
          <BookDetailField label="ISBN-13" value={book.isbn} />
          <BookDetailField label="Category / subject" value={book.category} />
          <BookDetailField label="Publisher" value={book.publisher} />
          <BookDetailField label="Publication year" value={book.publicationYear ? String(book.publicationYear) : 'Not listed'} />
          <BookDetailField label="Edition" value={book.edition} />
          <BookDetailField label="Language / medium" value={book.language} />
          <BookDetailField label="Total copies" value={String(book.totalCopies ?? 0)} />
          <BookDetailField label="Available copies" value={String(book.availableCopies ?? 0)} />
          <BookDetailField label="Shelf location" value={book.shelfLocation} />
          <BookDetailField label="Library section" value={book.section} />
          <BookDetailField label="Catalogue rating" value={book.rating > 0 ? `${book.rating.toFixed(1)} / 5` : 'Not rated'} />
          <BookDetailField label="Times borrowed" value={String(book.totalBorrows ?? 0)} />
          <BookDetailField label="Added to library" value={book.addedDate} />
        </dl>
      </section>

      <section className="mt-7 border-t border-slate-100 pt-5" aria-labelledby="reader-book-description">
        <h3 id="reader-book-description" className="text-sm font-bold">Description</h3>
        <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-600">{book.description || 'No description has been added for this title.'}</p>
      </section>

      <section className="mt-6" aria-labelledby="reader-book-tags">
        <h3 id="reader-book-tags" className="text-sm font-bold">Catalogue tags</h3>
        <div className="mt-2 flex flex-wrap gap-2">
          {book.tags?.length ? book.tags.map((tag) => <span key={tag} className="rounded-full bg-[#f6e9df] px-2.5 py-1 text-[10px] font-semibold text-[#6e1731]">{tag}</span>) : <p className="text-xs text-slate-500">No tags listed.</p>}
        </div>
      </section>

      <section className="mt-7 border-t border-slate-100 pt-5" aria-labelledby="reader-book-copies">
        <h3 id="reader-book-copies" className="text-sm font-bold">Physical copies <span className="font-medium text-slate-500">({book.copies?.length || 0})</span></h3>
        {book.copies?.length ? (
          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-100">
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-[#f7f4ef] text-[10px] uppercase tracking-wide text-slate-500">
                <tr><th className="px-3 py-2.5">Copy</th><th className="px-3 py-2.5">Barcode</th><th className="px-3 py-2.5">Shelf</th><th className="px-3 py-2.5">Condition</th><th className="px-3 py-2.5">Status</th><th className="px-3 py-2.5">Expected return</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {book.copies.map((copy) => (
                  <tr key={copy.copyId}>
                    <td className="px-3 py-2.5 font-semibold">Copy {copy.copyNumber}</td>
                    <td className="px-3 py-2.5 font-mono text-slate-600">{copy.barcode || 'Not listed'}</td>
                    <td className="px-3 py-2.5">{copy.shelfLocation || book.shelfLocation || 'Not listed'}</td>
                    <td className="px-3 py-2.5 capitalize">{copy.condition || 'Not listed'}</td>
                    <td className="px-3 py-2.5"><span className={`rounded-full px-2 py-1 text-[10px] font-bold capitalize ${copy.status === 'available' ? 'bg-emerald-50 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{copy.status.replace(/_/g, ' ')}</span></td>
                    <td className="px-3 py-2.5 text-slate-600">{copy.dueDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className="mt-2 text-xs text-slate-500">Individual copy records are not available for this title.</p>}
      </section>
    </section>
  </div>
);
