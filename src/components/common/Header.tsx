import React, { useState, useRef, useEffect } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { CollegeCrest } from './CollegeCrest';
import {
  Search,
  Bell,
  User,
  LogOut,
  Settings,
  Menu,
  BookOpen,
  ArrowRightLeft,
  CheckCheck,
  Clock,
  AlertCircle,
  Shield,
  FileText,
  UserCheck,
  Command,
  Sparkles
} from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const {
    currentUser,
    setCurrentUser,
    users,
    logout,
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveTab,
    setIsCommandPaletteOpen,
    activeTab,
  } = useLibrary();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getPageTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return { title: 'Dashboard', desc: 'Circulation and collection metrics' };
      case 'books':
        return { title: 'Books Catalog', desc: 'Search, filter, and organize academic titles' };
      case 'book_details':
        return { title: 'Book Profile', desc: 'Metadata, shelf location, and copy inventory' };
      case 'zebra_printer':
        return { title: 'Print labels', desc: 'Prepare and print book labels' };
      case 'members':
        return { title: 'Members Directory', desc: 'Student, faculty, and staff profiles' };
      case 'member_profile':
        return { title: 'Member Profile', desc: 'Active loans, history, and fines ledger' };
      case 'borrow':
        return { title: 'Issue a book', desc: 'Record a new loan' };
      case 'returns':
        return { title: 'Return a book', desc: 'Record a book coming back' };
      case 'reservations':
        return { title: 'Reservations', desc: 'Hold queue and pickup allocation' };
      case 'fines':
        return { title: 'Fines & Penalties', desc: 'Overdue penalties, payments, and waivers' };
      case 'categories':
        return { title: 'Categories & DDC', desc: 'Dewey Decimal organization' };
      case 'authors':
        return { title: 'Authors', desc: 'Biographical directory and bibliography' };
      case 'publishers':
        return { title: 'Publishers', desc: 'Procurement suppliers and contacts' };
      case 'inventory':
        return { title: 'Stock Audit', desc: 'Physical inventory verification' };
      case 'reports':
        return { title: 'Analytics & Reports', desc: 'Circulation metrics and data exports' };
      case 'notifications':
        return { title: 'Notifications', desc: 'System alerts and reminders' };
      case 'users':
        return { title: 'Staff and access', desc: 'Choose what staff can do' };
      case 'settings':
        return { title: 'Settings', desc: 'System parameters and policy configuration' };
      case 'profile':
        return { title: 'Account Profile', desc: 'Security credentials and activity' };
      default:
        return { title: 'Library Hub', desc: 'Management System' };
    }
  };

  const { title, desc } = getPageTitle(activeTab);

  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#111317]/80 backdrop-blur-md border-b border-neutral-200/80 dark:border-neutral-800 transition-colors duration-200">
      <div className="px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Mobile Toggle & Page Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-2 -ml-2 rounded-xl text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 lg:hidden"
            title="Toggle Navigation Menu"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div>
            <h1 className="text-base sm:text-lg font-bold font-heading text-neutral-900 dark:text-white leading-tight truncate">
              {title}
            </h1>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate hidden md:block">
              {desc}
            </p>
          </div>
        </div>

        {/* Center: Global Search Bar */}
        <div className="flex-1 max-w-md mx-2">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-2 text-xs bg-neutral-50 dark:bg-neutral-900/90 hover:bg-neutral-100 dark:hover:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-xl text-neutral-400 transition group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-400 group-hover:text-amber-400 transition-colors" />
              <span className="truncate">Search books, members, barcodes...</span>
            </div>
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[10px] font-mono font-medium text-neutral-400 bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 rounded">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Right: Desk Shortcuts, Theme, Notifications, User Menu */}
        <div className="flex items-center gap-2">
          {/* Desk Quick Links */}
          <div className="hidden xl:flex items-center gap-1.5 mr-2">
            <button
              onClick={() => setActiveTab('borrow')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                activeTab === 'borrow'
                  ? 'bg-red-900 text-white border-red-900 shadow-xs'
                  : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5 text-amber-500" />
              <span>Issue</span>
            </button>
            <button
              onClick={() => setActiveTab('returns')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl border transition ${
                activeTab === 'returns'
                  ? 'bg-neutral-900 dark:bg-neutral-800 text-white border-neutral-700'
                  : 'bg-neutral-50 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:border-neutral-300'
              }`}
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Return</span>
            </button>
          </div>


          {/* Notifications Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-neutral-500 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              )}
            </button>

            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="px-4 py-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-neutral-900 dark:text-white">Alerts</span>
                    {unreadCount > 0 && (
                      <span className="text-[10px] bg-red-950/20 text-red-700 dark:text-amber-400 font-bold px-2 py-0.5 rounded-full border border-red-800/20">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsAsRead}
                      className="text-xs text-amber-500 hover:underline flex items-center gap-1 font-semibold"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark read
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-neutral-100 dark:divide-neutral-800">
                  {notifications.map((notif) => (
                    <div
                      key={notif.id}
                      onClick={() => {
                        markNotificationAsRead(notif.id);
                        if (notif.link) {
                          setActiveTab(notif.link as any);
                          setIsNotifOpen(false);
                        }
                      }}
                      className={`p-3.5 hover:bg-neutral-50 dark:hover:bg-neutral-800/60 transition cursor-pointer flex gap-3 ${
                        !notif.read ? 'bg-red-950/10 dark:bg-red-950/20' : ''
                      }`}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {notif.type === 'overdue' && (
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === 'reservation' && (
                          <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 flex items-center justify-center">
                            <BookOpen className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === 'due_soon' && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                            <Clock className="w-4 h-4" />
                          </div>
                        )}
                        {notif.type === 'system' && (
                          <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
                            <FileText className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {notif.title}
                        </p>
                        <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 mt-0.5">
                          {notif.message}
                        </p>
                        <span className="text-[10px] text-neutral-400 mt-1 block font-mono">
                          {notif.date}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="h-5 w-px bg-neutral-200 dark:bg-neutral-800 mx-1 hidden sm:block" />

          {/* User Profile Pill */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 pl-1.5 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-950 to-red-800 text-amber-300 flex items-center justify-center font-bold text-xs ring-1 ring-amber-400/40">
                {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="text-left hidden md:block">
                <div className="text-xs font-bold text-neutral-900 dark:text-white leading-tight truncate max-w-[120px]">
                  {currentUser.name.split(' ')[0]}
                </div>
                <div className="text-[10px] text-neutral-400 font-mono capitalize">
                  {currentUser.role.replace('_', ' ')}
                </div>
              </div>
            </button>

            {isProfileOpen && (
              <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-2xl py-2 z-50 divide-y divide-neutral-100 dark:divide-neutral-800 animate-in fade-in duration-150">
                <div className="px-4 py-3">
                  <p className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                    {currentUser.name}
                  </p>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                    {currentUser.email}
                  </p>
                  <span className="inline-block mt-1 text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {currentUser.role.replace('_', ' ')}
                  </span>
                </div>

                <div className="p-1 space-y-0.5 text-xs">
                  <button
                    onClick={() => {
                      setActiveTab('profile');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                  >
                    <User className="w-4 h-4 text-neutral-400" />
                    <span>My Account</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4 text-neutral-400" />
                    <span>Settings</span>
                  </button>
                  <button
                    onClick={() => {
                      setActiveTab('zebra_printer');
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4 text-neutral-400" />
                    <span>Print labels</span>
                  </button>
                </div>

                <div className="p-1">
                  <button
                    onClick={() => {
                      logout();
                      setIsProfileOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
