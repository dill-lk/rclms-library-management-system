import React from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { CollegeCrest } from './CollegeCrest';
import { BetaBadge } from './BetaBadge';
import { ActiveNavTab } from '../../types';
import {
  LayoutDashboard,
  BookOpen,
  Layers,
  Users,
  Building2,
  Boxes,
  ArrowRightLeft,
  CalendarCheck,
  Receipt,
  UserCheck,
  BarChart3,
  ShieldCheck,
  Settings,
  LogOut,
  X,
  BookMarked,
  Sparkles,
  Command,
  Printer,
  Lightbulb
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: ActiveNavTab;
  label: string;
  icon: any;
  badge?: string | number;
  badgeColor?: string;
  beta?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const {
    activeTab,
    setActiveTab,
    currentUser,
    logout,
    reservations,
    circulation,
    labelQueue,
    setIsCommandPaletteOpen,
  } = useLibrary();

  const overdueCount = circulation.filter((c) => c.status === 'overdue').length;
  const pendingReservations = reservations.filter((r) => r.status === 'pending' || r.status === 'ready').length;

  const navGroups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Overview',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      ],
    },
    {
      title: 'Catalogue',
      items: [
        { id: 'books', label: 'Books', icon: BookOpen },
        {
          id: 'zebra_printer',
          label: 'Print labels',
          icon: Printer,
          badge: labelQueue.length > 0 ? `${labelQueue.length % 3 === 0 ? '3/3' : `${labelQueue.length % 3}/3`}` : undefined,
          badgeColor:
            labelQueue.length % 3 === 0 && labelQueue.length > 0
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/20 text-amber-300 border border-amber-500/30',
        },
        { id: 'categories', label: 'Categories & DDC', icon: Layers },
        { id: 'authors', label: 'Authors', icon: Users },
        { id: 'publishers', label: 'Publishers', icon: Building2 },
        { id: 'inventory', label: 'Stock Audit', icon: Boxes, beta: true },
      ],
    },
    {
      title: 'Circulation',
      items: [
        { id: 'borrow', label: 'Issue a book', icon: BookMarked },
        { id: 'returns', label: 'Return a book', icon: ArrowRightLeft },
        {
          id: 'reservations',
          label: 'Reservations',
          icon: CalendarCheck,
          badge: pendingReservations > 0 ? pendingReservations : undefined,
          badgeColor: 'bg-purple-500/20 text-purple-300 border border-purple-500/30',
        },
        {
          id: 'fines',
          label: 'Fines',
          icon: Receipt,
          badge: overdueCount > 0 ? `${overdueCount}` : undefined,
          badgeColor: 'bg-rose-500/20 text-rose-300 border border-rose-500/30',
        },
      ],
    },
    {
      title: 'People & reports',
      items: [
        { id: 'members', label: 'Members Directory', icon: UserCheck },
        { id: 'reports', label: 'Analytics & Reports', icon: BarChart3 },
        { id: 'recommendations', label: 'Recommendations', icon: Lightbulb },
      ],
    },
    {
      title: 'Administration',
      items: [
        { id: 'users', label: 'Staff and access', icon: ShieldCheck },
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  const handleNavClick = (id: ActiveNavTab) => {
    setActiveTab(id);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden transition-opacity"
        />
      )}

      {/* Modern Sidebar Container */}
      <aside
        className={`app-sidebar fixed top-0 bottom-0 left-0 z-50 w-64 bg-library-surface text-library-main flex flex-col transition-transform duration-300 ease-in-out border-r border-library-border lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } shadow-2xl lg:shadow-none`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 bg-white border-b border-neutral-200 flex items-center justify-between">
          <div
            onClick={() => handleNavClick('dashboard')}
            className="cursor-pointer flex items-center"
          >
            <CollegeCrest size="sm" lightMode={true} />
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 lg:hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Search Shortcut Trigger */}
        <div className="px-3 pt-3">
          <button
            onClick={() => setIsCommandPaletteOpen(true)}
            className="w-full flex items-center justify-between px-3 py-2 text-xs bg-neutral-50 hover:bg-white text-neutral-500 hover:text-neutral-950 rounded-lg border border-neutral-200 transition group"
          >
            <span className="flex items-center gap-2 font-medium">
              <Command className="w-3.5 h-3.5 text-neutral-500 group-hover:text-amber-400 transition-colors" />
              <span>Quick Search...</span>
            </span>
            <kbd className="px-1.5 py-0.5 text-[10px] bg-neutral-100 rounded border border-neutral-200 font-mono text-neutral-500">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-5 text-xs select-none">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <div className="px-3 text-[11px] font-semibold text-neutral-400">
                {group.title}
              </div>
              <div className="space-y-0.5 mt-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2 rounded-xl font-medium transition-all duration-150 ${
                        isActive
                          ? 'bg-maroon-700 text-white font-semibold shadow-sm'
                          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-950'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        <Icon
                          className={`w-4 h-4 flex-shrink-0 transition-colors ${
                            isActive ? 'text-white' : 'text-neutral-400'
                          }`}
                        />
                        <span className="truncate">{item.label}</span>
                        {item.beta && <BetaBadge />}
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor || 'bg-amber-400/20 text-amber-300'}`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Clean Modern User Footer with Library operations workspace */}
        <div className="p-3 bg-white border-t border-neutral-200 space-y-2">
          <div className="flex items-center justify-between">
            <div
              onClick={() => handleNavClick('profile')}
              className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 min-w-0"
            >
              <div className="w-8 h-8 rounded-full bg-maroon-700 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                {currentUser.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
              </div>
              <div className="truncate text-left">
                <p className="text-xs font-semibold text-neutral-900 truncate">
                  {currentUser.name.split(' ')[0]} {currentUser.name.split(' ')[1] || ''}
                </p>
                <p className="text-[10px] text-neutral-500 capitalize">
                  {currentUser.role.replace('_', ' ')}
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-lg text-neutral-400 hover:text-rose-600 hover:bg-rose-50 transition"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="text-[9px] text-neutral-500 text-center font-mono border-t border-neutral-200 pt-2 flex items-center justify-center gap-1">
            <span>Rahula College Library</span>
          </div>
        </div>
      </aside>
    </>
  );
};
