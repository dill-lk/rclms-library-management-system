import React, { lazy, Suspense, useEffect, useState } from 'react';
import { useLibrary } from './context/LibraryContext';
import { heartbeatCurrentDeviceSession } from './utils/deviceSessions';
import { Header } from './components/common/Header';
import { Sidebar } from './components/common/Sidebar';
import { ToastContainer } from './components/common/ToastContainer';
import type { Book } from './types';

const CommandPalette = lazy(() => import('./components/common/CommandPalette').then(({ CommandPalette }) => ({ default: CommandPalette })));
const PrintReceiptModal = lazy(() => import('./components/common/PrintReceiptModal').then(({ PrintReceiptModal }) => ({ default: PrintReceiptModal })));
const PrintLibraryCardModal = lazy(() => import('./components/common/PrintLibraryCardModal').then(({ PrintLibraryCardModal }) => ({ default: PrintLibraryCardModal })));
const AddEditBookModal = lazy(() => import('./components/views/AddEditBookModal').then(({ AddEditBookModal }) => ({ default: AddEditBookModal })));
const LoginView = lazy(() => import('./components/views/LoginView').then(({ LoginView }) => ({ default: LoginView })));
const DashboardView = lazy(() => import('./components/views/DashboardView').then(({ DashboardView }) => ({ default: DashboardView })));
const BooksView = lazy(() => import('./components/views/BooksView').then(({ BooksView }) => ({ default: BooksView })));
const BookDetailsView = lazy(() => import('./components/views/BookDetailsView').then(({ BookDetailsView }) => ({ default: BookDetailsView })));
const MembersView = lazy(() => import('./components/views/MembersView').then(({ MembersView }) => ({ default: MembersView })));
const MemberProfileView = lazy(() => import('./components/views/MemberProfileView').then(({ MemberProfileView }) => ({ default: MemberProfileView })));
const BorrowView = lazy(() => import('./components/views/BorrowView').then(({ BorrowView }) => ({ default: BorrowView })));
const ReturnsView = lazy(() => import('./components/views/ReturnsView').then(({ ReturnsView }) => ({ default: ReturnsView })));
const ReservationsView = lazy(() => import('./components/views/ReservationsView').then(({ ReservationsView }) => ({ default: ReservationsView })));
const FinesView = lazy(() => import('./components/views/FinesView').then(({ FinesView }) => ({ default: FinesView })));
const CategoriesView = lazy(() => import('./components/views/CategoriesView').then(({ CategoriesView }) => ({ default: CategoriesView })));
const AuthorsView = lazy(() => import('./components/views/AuthorsView').then(({ AuthorsView }) => ({ default: AuthorsView })));
const PublishersView = lazy(() => import('./components/views/PublishersView').then(({ PublishersView }) => ({ default: PublishersView })));
const InventoryView = lazy(() => import('./components/views/InventoryView').then(({ InventoryView }) => ({ default: InventoryView })));
const ZebraPrinterView = lazy(() => import('./components/views/ZebraPrinterView').then(({ ZebraPrinterView }) => ({ default: ZebraPrinterView })));
const ReportsView = lazy(() => import('./components/views/ReportsView').then(({ ReportsView }) => ({ default: ReportsView })));
const NotificationsView = lazy(() => import('./components/views/NotificationsView').then(({ NotificationsView }) => ({ default: NotificationsView })));
const UsersView = lazy(() => import('./components/views/UsersView').then(({ UsersView }) => ({ default: UsersView })));
const SettingsView = lazy(() => import('./components/views/SettingsView').then(({ SettingsView }) => ({ default: SettingsView })));
const ProfileView = lazy(() => import('./components/views/ProfileView').then(({ ProfileView }) => ({ default: ProfileView })));
const RecommendationsView = lazy(() => import('./components/views/RecommendationsView').then(({ RecommendationsView }) => ({ default: RecommendationsView })));

export const AppContent: React.FC = () => {
  const { isLoggedIn, activeTab, setActiveTab, printData, isCommandPaletteOpen, logout, addToast } = useLibrary();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) return;
    let mounted = true;
    let checking = false;
    const checkSession = async () => {
      if (checking) return;
      checking = true;
      try {
        const { status } = await heartbeatCurrentDeviceSession();
        if (!mounted || !status || status === 'active' || status === 'untracked' || status === 'unavailable') return;
        const reason = status === 'paused'
          ? 'This device session was paused by an administrator.'
          : status === 'blocked'
            ? 'This device session was blocked by an administrator.'
            : status === 'account_inactive'
              ? 'This library account is inactive.'
              : 'This sign-in session has ended.';
        addToast({ type: 'warning', title: 'Library access ended', message: reason });
        logout();
      } catch {
        // A transient heartbeat failure is not evidence that access was revoked.
      } finally {
        checking = false;
      }
    };
    void checkSession();
    const interval = window.setInterval(() => void checkSession(), 30_000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, [isLoggedIn, logout, addToast]);

  // Book Modal State
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  if (!isLoggedIn) {
    return (
      <Suspense fallback={<div role="status" className="p-8 text-sm text-neutral-600">Loading sign-in…</div>}>
        <LoginView />
      </Suspense>
    );
  }

  const handleOpenAddBook = () => {
    setEditingBook(null);
    setIsBookModalOpen(true);
  };

  const handleOpenEditBook = (book: Book) => {
    setEditingBook(book);
    setIsBookModalOpen(true);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'books':
        return (
          <BooksView
            onAddBook={handleOpenAddBook}
            onEditBook={handleOpenEditBook}
          />
        );
      case 'book_details':
        return (
          <BookDetailsView
            onBack={() => setActiveTab('books')}
            onEdit={() => setIsBookModalOpen(true)}
          />
        );
      case 'zebra_printer':
        return <ZebraPrinterView />;
      case 'members':
        return <MembersView />;
      case 'member_profile':
        return <MemberProfileView onBack={() => setActiveTab('members')} />;
      case 'borrow':
        return <BorrowView />;
      case 'returns':
        return <ReturnsView />;
      case 'reservations':
        return <ReservationsView />;
      case 'fines':
        return <FinesView />;
      case 'categories':
        return <CategoriesView />;
      case 'authors':
        return <AuthorsView />;
      case 'publishers':
        return <PublishersView />;
      case 'inventory':
        return <InventoryView />;
      case 'reports':
        return <ReportsView />;
      case 'recommendations':
        return <RecommendationsView />;
      case 'notifications':
        return <NotificationsView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      case 'profile':
        return <ProfileView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div className="app-shell min-h-screen bg-library-bg text-library-main font-body flex flex-col selection:bg-library-action selection:text-library-bg">
      {/* Sidebar Navigation */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main App Layout */}
      <div className="lg:pl-64 flex flex-col flex-1 min-w-0">
        {/* Top Navbar */}
        <Header onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Dynamic Main Body Content */}
        <main className="app-main flex-1 p-4 sm:p-6 xl:p-8 max-w-[1600px] w-full mx-auto animate-in fade-in duration-200">
          <Suspense fallback={<div role="status" className="rounded-xl border border-neutral-200 bg-white p-6 text-sm text-neutral-600">Loading library view…</div>}>
            {renderActiveView()}
          </Suspense>
        </main>

        {/* Application footer */}
        <footer className="app-footer px-6 py-4 border-t border-neutral-200 dark:border-neutral-800 text-center text-xs text-neutral-500 bg-white dark:bg-[#141f2e]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto">
            <span className="font-heading font-semibold text-neutral-800 dark:text-neutral-200 flex items-center gap-2">
              <img src="/logo.png" alt="Emblem" className="w-4 h-5 object-contain inline-block" />
              <span>Rahula College Library Management System</span>
            </span>
            <span className="text-[11px] font-mono text-neutral-400 flex items-center gap-1.5">
              <span>Library operations workspace</span>
            </span>
          </div>
        </footer>
      </div>

      {/* Global Interactive Elements */}
      <ToastContainer />
      <Suspense fallback={null}>
        {isCommandPaletteOpen && <CommandPalette />}
        {printData?.type === 'receipt' && <PrintReceiptModal />}
        {printData?.type === 'card' && <PrintLibraryCardModal />}
      </Suspense>
      <Suspense fallback={null}>
        {isBookModalOpen && (
          <AddEditBookModal
            isOpen={isBookModalOpen}
            onClose={() => setIsBookModalOpen(false)}
            editBookData={editingBook}
          />
        )}
      </Suspense>
    </div>
  );
};

export default function App() {
  return <AppContent />;
}
