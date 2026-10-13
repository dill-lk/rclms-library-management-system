import React, { useState, useEffect } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { ActiveNavTab } from '../../types';
import {
  Search,
  BookOpen,
  User,
  ArrowRightLeft,
  CalendarCheck,
  Receipt,
  Boxes,
  Layers,
  Settings,
  BarChart3,
  Shield,
  X
} from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    books,
    members,
    setActiveTab,
    setSelectedBookId,
    setSelectedMemberId,
  } = useLibrary();

  const [query, setQuery] = useState('');

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const quickPages: { tab: ActiveNavTab; label: string; icon: any; category: string }[] = [
    { tab: 'dashboard', label: 'Main Dashboard', icon: BarChart3, category: 'Pages' },
    { tab: 'borrow', label: 'Issue Book (Circulation Desk)', icon: BookOpen, category: 'Actions' },
    { tab: 'returns', label: 'Return Books Desk', icon: ArrowRightLeft, category: 'Actions' },
    { tab: 'books', label: 'Books Catalog', icon: BookOpen, category: 'Pages' },
    { tab: 'members', label: 'Members Directory', icon: User, category: 'Pages' },
    { tab: 'reservations', label: 'Reservations & Holds Queue', icon: CalendarCheck, category: 'Pages' },
    { tab: 'fines', label: 'Fines & Late Fee Collection', icon: Receipt, category: 'Pages' },
    { tab: 'inventory', label: 'Stock Audit & Barcode Scan', icon: Boxes, category: 'Pages' },
    { tab: 'reports', label: 'Analytics & Circulation Reports', icon: BarChart3, category: 'Pages' },
    { tab: 'categories', label: 'Dewey Decimal Categories', icon: Layers, category: 'Pages' },
    { tab: 'settings', label: 'System & Policy Settings', icon: Settings, category: 'Pages' },
  ];

  const filteredPages = quickPages.filter((p) =>
    p.label.toLowerCase().includes(query.toLowerCase())
  );

  const filteredBooks = books
    .filter(
      (b) =>
        b.title.toLowerCase().includes(query.toLowerCase()) ||
        b.isbn.toLowerCase().includes(query.toLowerCase()) ||
        b.author.toLowerCase().includes(query.toLowerCase())
    )
    .slice(0, 4);

  const filteredMembers = members
    .filter(
      (m) =>
        m.name.toLowerCase().includes(query.toLowerCase()) ||
        m.memberId.toLowerCase().includes(query.toLowerCase()) ||
        (m.grade && m.grade.toLowerCase().includes(query.toLowerCase()))
    )
    .slice(0, 4);

  const handleSelectPage = (tab: ActiveNavTab) => {
    setActiveTab(tab);
    setIsCommandPaletteOpen(false);
    setQuery('');
  };

  const handleSelectBook = (bookId: string) => {
    setSelectedBookId(bookId);
    setActiveTab('book_details');
    setIsCommandPaletteOpen(false);
    setQuery('');
  };

  const handleSelectMember = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActiveTab('member_profile');
    setIsCommandPaletteOpen(false);
    setQuery('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 pt-16 sm:pt-24">
      {/* Backdrop */}
      <div
        onClick={() => setIsCommandPaletteOpen(false)}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity"
      />

      {/* Palette Container */}
      <div className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-800 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
        {/* Search Input Box */}
        <div className="px-4 py-3.5 border-b border-gray-100 dark:border-slate-800 flex items-center gap-3">
          <Search className="w-5 h-5 text-maroon-800 dark:text-gold-400 flex-shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, book title, author, or student name..."
            className="w-full bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-hidden"
          />
          <button
            onClick={() => setIsCommandPaletteOpen(false)}
            className="p-1 rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results List */}
        <div className="max-h-96 overflow-y-auto p-2 space-y-4 text-xs">
          {/* Books matched */}
          {filteredBooks.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Books ({filteredBooks.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredBooks.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => handleSelectBook(b.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-maroon-50 dark:hover:bg-maroon-950/40 text-gray-800 dark:text-gray-200 flex items-center justify-between group transition"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <BookOpen className="w-4 h-4 text-maroon-700 dark:text-gold-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold">{b.title}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-2">by {b.author}</span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{b.isbn}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Members matched */}
          {filteredMembers.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Members ({filteredMembers.length})
              </div>
              <div className="space-y-0.5 mt-1">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectMember(m.id)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-amber-50 dark:hover:bg-amber-950/40 text-gray-800 dark:text-gray-200 flex items-center justify-between group transition"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <User className="w-4 h-4 text-amber-700 dark:text-gold-400 flex-shrink-0" />
                      <div className="truncate">
                        <span className="font-semibold">{m.name}</span>
                        <span className="text-[11px] text-gray-500 dark:text-gray-400 ml-2">
                          {m.grade || m.department}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-mono text-gray-400">{m.memberId}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Pages */}
          {filteredPages.length > 0 && (
            <div>
              <div className="px-3 py-1 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Quick Navigation
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {filteredPages.map((p) => {
                  const Icon = p.icon;
                  return (
                    <button
                      key={p.tab}
                      onClick={() => handleSelectPage(p.tab)}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800 text-gray-700 dark:text-gray-300 flex items-center gap-2.5 transition"
                    >
                      <Icon className="w-4 h-4 text-gray-400" />
                      <span className="truncate">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {filteredBooks.length === 0 && filteredMembers.length === 0 && filteredPages.length === 0 && (
            <div className="py-8 text-center text-gray-400">
              No matching books, members or commands for "{query}".
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800/50 flex items-center justify-between text-[11px] text-gray-400">
          <span>Use ↑↓ arrows to navigate</span>
          <span>ESC to close</span>
        </div>
      </div>
    </div>
  );
};
