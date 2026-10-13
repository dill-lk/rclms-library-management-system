import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import {
  Bell,
  CheckCheck,
  AlertCircle,
  BookOpen,
  Clock,
  FileText,
  Search,
  Filter,
  Trash2
} from 'lucide-react';

export const NotificationsView: React.FC = () => {
  const {
    notifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    setActiveTab,
  } = useLibrary();

  const [filterType, setFilterType] = useState<string>('all');

  const filteredNotifs = notifications.filter((n) => {
    if (filterType === 'all') return true;
    if (filterType === 'unread') return !n.read;
    return n.type === filterType;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-maroon-800 dark:text-gold-400" />
            <span>Notification & Alert Center</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Automated overdue alerts, book hold readiness notices, and system broadcast messages.
          </p>
        </div>

        <button
          onClick={markAllNotificationsAsRead}
          className="px-4 py-2 text-xs font-bold text-maroon-800 dark:text-gold-400 bg-maroon-50 dark:bg-maroon-950/60 hover:bg-maroon-100 border border-maroon-200 dark:border-maroon-800 rounded-xl transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <CheckCheck className="w-4 h-4" />
          <span>Mark All Read</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs flex flex-wrap items-center gap-2 text-xs">
        <button
          onClick={() => setFilterType('all')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            filterType === 'all'
              ? 'bg-maroon-800 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          All Notifications ({notifications.length})
        </button>
        <button
          onClick={() => setFilterType('unread')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            filterType === 'unread'
              ? 'bg-maroon-800 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          Unread ({notifications.filter((n) => !n.read).length})
        </button>
        <button
          onClick={() => setFilterType('overdue')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            filterType === 'overdue'
              ? 'bg-maroon-800 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          Overdue Notices
        </button>
        <button
          onClick={() => setFilterType('reservation')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            filterType === 'reservation'
              ? 'bg-maroon-800 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          Hold / Reservations
        </button>
        <button
          onClick={() => setFilterType('system')}
          className={`px-3 py-1.5 rounded-lg font-bold transition ${
            filterType === 'system'
              ? 'bg-maroon-800 text-white'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
          }`}
        >
          System Updates
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs divide-y divide-gray-100 dark:divide-slate-800">
        {filteredNotifs.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No notifications match your current filter.
          </div>
        ) : (
          filteredNotifs.map((notif) => (
            <div
              key={notif.id}
              onClick={() => {
                markNotificationAsRead(notif.id);
                if (notif.link) setActiveTab(notif.link as any);
              }}
              className={`p-4 sm:p-5 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer transition flex items-start gap-4 ${
                !notif.read ? 'bg-maroon-50/30 dark:bg-maroon-950/20' : ''
              }`}
            >
              <div className="flex-shrink-0 mt-0.5">
                {notif.type === 'overdue' && (
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center text-red-600 dark:text-red-400">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                )}
                {notif.type === 'reservation' && (
                  <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                    <BookOpen className="w-5 h-5" />
                  </div>
                )}
                {notif.type === 'due_soon' && (
                  <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center text-amber-600 dark:text-amber-400">
                    <Clock className="w-5 h-5" />
                  </div>
                )}
                {notif.type === 'system' && (
                  <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">
                    {notif.title}
                  </h4>
                  <span className="text-[10px] text-gray-400 font-mono">{notif.date}</span>
                </div>
                <p className="text-gray-600 dark:text-gray-300 mt-1 leading-relaxed">
                  {notif.message}
                </p>
                {notif.link && (
                  <span className="text-maroon-800 dark:text-gold-400 font-semibold text-[11px] hover:underline mt-2 inline-block">
                    Open related section →
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
