import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { ReservationStatus } from '../../types';
import { Modal } from '../common/Modal';
import {
  CalendarCheck,
  Search,
  Plus,
  Send,
  CheckCircle2,
  XCircle,
  BookMarked,
  Clock,
  Sparkles,
  User,
  BookOpen
} from 'lucide-react';

export const ReservationsView: React.FC = () => {
  const {
    reservations,
    updateReservationStatus,
    cancelReservation,
    createReservation,
    issueBook,
    books,
    members,
    addToast,
    setSelectedBookId,
    setSelectedMemberId,
    setActiveTab,
  } = useLibrary();

  const [activeTabStatus, setActiveTabStatus] = useState<ReservationStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Reservation Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMemberId, setSelMemberId] = useState(members[0]?.id || '');
  const [selectedBookId, setSelBookId] = useState(books[0]?.id || '');
  const [notes, setNotes] = useState('');

  const filteredReservations = reservations.filter((r) => {
    const matchesStatus = activeTabStatus === 'all' || r.status === activeTabStatus;
    const matchesSearch =
      r.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.reservationId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.bookIsbn.includes(searchQuery);

    return matchesStatus && matchesSearch;
  });

  const handleNotifyMember = (res: any) => {
    addToast({
      type: 'success',
      title: 'Member Notified',
      message: `SMS/Email notification dispatched to ${res.memberName} (${res.memberPhone}). Hold expires on ${res.expiryDate}.`,
    });
  };

  const handleConvertToBorrow = async (res: any) => {
    const result = await issueBook(res.memberId, res.bookId);
    if (result.success) {
      updateReservationStatus(res.id, 'completed');
      addToast({
        type: 'success',
        title: 'Reservation Fulfilled',
        message: `Book loan created for ${res.memberName}.`,
      });
    }
  };

  const handleCreateNewRes = (e: React.FormEvent) => {
    e.preventDefault();
    createReservation(selectedMemberId, selectedBookId, notes);
    setIsModalOpen(false);
  };

  return (
    <div className="space-y-5">
      {/* Top Banner Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
              <CalendarCheck className="w-5 h-5 text-purple-600 dark:text-purple-400" />
              <span>Reservations & Hold Queue</span>
            </h2>
            <span className="text-xs bg-purple-100 text-purple-900 dark:bg-purple-950 dark:text-purple-300 font-bold px-2 py-0.5 rounded-full">
              {reservations.filter((r) => r.status === 'pending' || r.status === 'ready').length} Active
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Manage advance student book requests, hold shelf preparation, and queue prioritization.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 text-xs font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Reservation</span>
        </button>
      </div>

      {/* Tabs and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 text-xs">
          <button
            onClick={() => setActiveTabStatus('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTabStatus === 'all'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            All Requests ({reservations.length})
          </button>
          <button
            onClick={() => setActiveTabStatus('pending')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTabStatus === 'pending'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Pending in Queue ({reservations.filter((r) => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTabStatus('ready')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTabStatus === 'ready'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Ready for Pickup ({reservations.filter((r) => r.status === 'ready').length})
          </button>
          <button
            onClick={() => setActiveTabStatus('completed')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTabStatus === 'completed'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Fulfilled ({reservations.filter((r) => r.status === 'completed').length})
          </button>
          <button
            onClick={() => setActiveTabStatus('cancelled')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              activeTabStatus === 'cancelled'
                ? 'bg-purple-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Cancelled ({reservations.filter((r) => r.status === 'cancelled').length})
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reservation ID, book title, student..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-700"
          />
        </div>
      </div>

      {/* Reservations Data Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Reservation Ref</th>
                <th className="py-3 px-3">Member Details</th>
                <th className="py-3 px-3">Requested Book</th>
                <th className="py-3 px-3">Request Date</th>
                <th className="py-3 px-3">Hold Expiry</th>
                <th className="py-3 px-3 text-center">Queue #</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
              {filteredReservations.map((res) => (
                <tr key={res.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-600 dark:text-gray-300">
                    {res.reservationId}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                      {res.memberName}
                    </div>
                    <div className="text-[10px] text-gray-400 font-mono">{res.memberPhone}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-semibold text-gray-900 dark:text-white truncate max-w-[200px]">
                      {res.bookTitle}
                    </div>
                    <div className="text-[10px] text-gray-400">by {res.bookAuthor}</div>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{res.requestDate}</td>
                  <td className="py-3 px-3 font-medium">{res.expiryDate}</td>
                  <td className="py-3 px-3 text-center font-bold font-mono">
                    #{res.queuePosition}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={res.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {res.status === 'pending' && (
                        <button
                          onClick={() => updateReservationStatus(res.id, 'ready')}
                          className="px-2.5 py-1 text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-lg transition"
                          title="Hold Book on Pickup Shelf"
                        >
                          Mark Ready
                        </button>
                      )}
                      {res.status === 'ready' && (
                        <>
                          <button
                            onClick={() => handleNotifyMember(res)}
                            className="p-1.5 rounded-lg text-blue-600 hover:bg-blue-50 transition"
                            title="Send SMS / Email Alert"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleConvertToBorrow(res)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                            title="Issue Book"
                          >
                            Issue
                          </button>
                        </>
                      )}
                      {(res.status === 'pending' || res.status === 'ready') && (
                        <button
                          onClick={() => cancelReservation(res.id)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 transition"
                          title="Release Hold"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Reservation Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Place New Book Reservation"
        subtitle="Queue a hold request for a student or faculty member"
        size="md"
      >
        <form onSubmit={handleCreateNewRes} className="space-y-4 text-xs">
          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Select Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelMemberId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.memberId}) • {m.grade || m.department}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Select Book Title
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelBookId(e.target.value)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            >
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title} (by {b.author}) • {b.availableCopies} available
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
              Reservation Priority / Note (Optional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Needed for GCE A/L term exam study"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
            />
          </div>

          <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition"
            >
              Confirm Reservation
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
