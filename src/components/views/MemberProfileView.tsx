import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { Barcode } from '../common/Barcode';
import {
  ArrowLeft,
  User,
  GraduationCap,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Printer,
  BookMarked,
  ArrowRightLeft,
  RotateCcw,
  Receipt,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  CalendarCheck
} from 'lucide-react';

interface MemberProfileViewProps {
  onBack: () => void;
}

export const MemberProfileView: React.FC<MemberProfileViewProps> = ({ onBack }) => {
  const {
    members,
    selectedMemberId,
    circulation,
    reservations,
    fines,
    renewBook,
    returnBook,
    collectFine,
    waiveFine,
    setPrintData,
    setActiveTab,
    setSelectedBookId,
    addToast,
  } = useLibrary();

  const [activeTabSub, setActiveTabSub] = useState<'current' | 'history' | 'reservations' | 'fines'>('current');

  const member = members.find((m) => m.id === selectedMemberId) || members[0];

  if (!member) {
    return (
      <div className="text-center py-12">
        <p className="text-neutral-500">Member not found.</p>
        <button onClick={onBack} className="mt-2 text-red-700 underline font-semibold">
          Back to directory
        </button>
      </div>
    );
  }

  const currentLoans = circulation.filter(
    (c) => c.memberId === member.id && (c.status === 'active' || c.status === 'overdue' || c.status === 'renewed')
  );
  const memberHistory = circulation.filter((c) => c.memberId === member.id);
  const memberReservations = reservations.filter((r) => r.memberId === member.id);
  const memberFines = fines.filter((f) => f.memberId === member.id);

  const totalReturned = memberHistory.filter((c) => c.status === 'returned').length;
  const overdueCount = currentLoans.filter((c) => c.status === 'overdue').length;
  const outstandingFines = memberFines
    .filter((f) => f.status === 'unpaid')
    .reduce((acc, f) => acc + f.amount, 0);

  const handlePrintCard = () => {
    setPrintData({
      type: 'card',
      title: `Library ID Card - ${member.name}`,
      payload: member,
    });
  };

  const handleReturnFromProfile = async (transactionId: string) => {
    const res = await returnBook(transactionId, 'good');
    if (res.success) {
      addToast({
        type: 'success',
        title: 'Check-In Completed',
        message: 'Book returned and member quota restored.',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-xs font-semibold text-neutral-600 dark:text-neutral-300 hover:text-red-700 dark:hover:text-amber-400 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Members</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintCard}
            className="px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-300 bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-xl hover:bg-neutral-50 transition flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download ID PDF</span>
          </button>
          <button
            onClick={() => setActiveTab('borrow')}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-red-800 to-red-900 hover:from-red-700 hover:to-red-800 rounded-xl shadow-sm transition flex items-center gap-1.5"
          >
            <BookMarked className="w-3.5 h-3.5 text-amber-300" />
            <span>Issue Book</span>
          </button>
        </div>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex min-w-0 items-center gap-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-red-950 via-red-900 to-red-800 text-amber-300 border border-amber-400/40 font-bold text-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              {member.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold font-heading text-neutral-900 dark:text-white">
                  {member.name}
                </h1>
                <StatusBadge status={member.status} size="sm" />
              </div>

              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                <span className="font-mono font-bold text-red-700 dark:text-amber-400">
                  {member.memberId}
                </span>
                {member.admissionNo && <span>• Adm: #{member.admissionNo}</span>}
                {(member.grade || member.department) && <span>• {member.grade || member.department}</span>}
                {member.house && (
                  <span className="bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                    {member.house} House
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="self-end md:self-auto">
            <Barcode value={member.memberId} width={170} height={35} />
          </div>
        </div>

        {/* Member Contact Info Grid */}
        <div className="mt-6 grid grid-cols-1 gap-x-6 gap-y-3 text-xs text-neutral-600 dark:text-neutral-300 sm:grid-cols-2 lg:grid-cols-4">
          <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5 leading-5">
            <Mail className="mt-0.5 h-4 w-4 text-neutral-400" />
            <span className="min-w-0 break-words">{member.email || '—'}</span>
          </div>
          <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5 leading-5">
            <Phone className="mt-0.5 h-4 w-4 text-neutral-400" />
            <span className="min-w-0 break-words font-mono">{member.phone || '—'}</span>
          </div>
          <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5 leading-5">
            <MapPin className="mt-0.5 h-4 w-4 text-neutral-400" />
            <span className="min-w-0 break-words">{member.address || '—'}</span>
          </div>
          <div className="grid min-w-0 grid-cols-[1rem_minmax(0,1fr)] items-start gap-2.5 leading-5">
            <Calendar className="mt-0.5 h-4 w-4 text-neutral-400" />
            <span className="min-w-0 break-words">Registered {member.joinedDate || '—'}</span>
          </div>
        </div>

        {/* 5 Key Statistics Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 pt-6 border-t border-neutral-100 dark:border-neutral-800 text-center">
          <div className="p-3 bg-neutral-50 dark:bg-neutral-900/60 rounded-2xl">
            <span className="text-[10px] uppercase font-bold text-neutral-400">Total Borrows</span>
            <div className="text-xl font-extrabold font-heading text-neutral-900 dark:text-white mt-0.5">
              {member.totalBorrowedCount}
            </div>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20">
            <span className="text-[10px] uppercase font-bold text-blue-400">
              Active Loans
            </span>
            <div className="text-xl font-extrabold font-heading text-blue-300 mt-0.5">
              {currentLoans.length} / {member.maxBorrowLimit}
            </div>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-2xl border border-emerald-500/20">
            <span className="text-[10px] uppercase font-bold text-emerald-400">
              Returned
            </span>
            <div className="text-xl font-extrabold font-heading text-emerald-300 mt-0.5">
              {totalReturned}
            </div>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-2xl border border-rose-500/20">
            <span className="text-[10px] uppercase font-bold text-rose-400">
              Overdue
            </span>
            <div className="text-xl font-extrabold font-heading text-rose-300 mt-0.5">
              {overdueCount}
            </div>
          </div>
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/20 col-span-2 sm:col-span-1">
            <span className="text-[10px] uppercase font-bold text-amber-400">
              Unpaid Fines
            </span>
            <div className="text-xl font-extrabold font-heading text-amber-300 mt-0.5 font-mono">
              LKR {outstandingFines.toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Tabs: Current Loans, Borrowing History, Reservations, Fines */}
      <div className="bg-white dark:bg-[#14171F] border border-neutral-200 dark:border-neutral-800 rounded-3xl p-6 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 border-b border-neutral-100 dark:border-neutral-800 pb-3 text-xs">
          <button
            onClick={() => setActiveTabSub('current')}
            className={`font-bold px-3.5 py-1.5 rounded-xl transition ${
              activeTabSub === 'current'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Active Loans ({currentLoans.length})
          </button>
          <button
            onClick={() => setActiveTabSub('history')}
            className={`font-bold px-3.5 py-1.5 rounded-xl transition ${
              activeTabSub === 'history'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            History ({memberHistory.length})
          </button>
          <button
            onClick={() => setActiveTabSub('reservations')}
            className={`font-bold px-3.5 py-1.5 rounded-xl transition ${
              activeTabSub === 'reservations'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Holds ({memberReservations.length})
          </button>
          <button
            onClick={() => setActiveTabSub('fines')}
            className={`font-bold px-3.5 py-1.5 rounded-xl transition ${
              activeTabSub === 'fines'
                ? 'bg-red-900 text-white shadow-xs'
                : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
            }`}
          >
            Fines ({memberFines.length})
          </button>
        </div>

        {/* Tab 1: Current Loans */}
        {activeTabSub === 'current' && (
          <div className="mt-4 overflow-x-auto">
            {currentLoans.length === 0 ? (
              <p className="text-xs text-neutral-400 py-8 text-center">
                No active loans currently checked out to {member.name}.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Book Title</th>
                    <th className="py-2.5 px-3">Barcode</th>
                    <th className="py-2.5 px-3">Issued Date</th>
                    <th className="py-2.5 px-3">Due Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                  {currentLoans.map((loan) => (
                    <tr key={loan.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <td className="py-3 px-3">
                        <div
                          onClick={() => {
                            setSelectedBookId(loan.bookId);
                            setActiveTab('book_details');
                          }}
                          className="font-bold cursor-pointer hover:text-red-700 dark:hover:text-amber-400 truncate max-w-xs"
                        >
                          {loan.bookTitle}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-mono text-neutral-500 dark:text-neutral-400">
                        {loan.copyBarcode}
                      </td>
                      <td className="py-3 px-3 text-neutral-500 font-mono">{loan.borrowDate}</td>
                      <td className="py-3 px-3 font-bold font-mono">
                        <span className={loan.status === 'overdue' ? 'text-rose-500' : ''}>
                          {loan.dueDate}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <StatusBadge status={loan.status} size="sm" />
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => renewBook(loan.transactionId)}
                            className="px-2.5 py-1 text-xs font-semibold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition flex items-center gap-1"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Renew</span>
                          </button>
                          <button
                            onClick={() => handleReturnFromProfile(loan.transactionId)}
                            className="px-2.5 py-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded-lg transition flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Return</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 2: Borrowing History */}
        {activeTabSub === 'history' && (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                <tr>
                  <th className="py-2.5 px-3">Book</th>
                  <th className="py-2.5 px-3">Issued Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Returned On</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800 text-neutral-800 dark:text-neutral-200">
                {memberHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                    <td className="py-2.5 px-3 font-semibold">{item.bookTitle}</td>
                    <td className="py-2.5 px-3 text-neutral-500 font-mono">{item.borrowDate}</td>
                    <td className="py-2.5 px-3 font-mono">{item.dueDate}</td>
                    <td className="py-2.5 px-3 text-neutral-500 font-mono">{item.returnDate || '—'}</td>
                    <td className="py-2.5 px-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: Reservations */}
        {activeTabSub === 'reservations' && (
          <div className="mt-4 overflow-x-auto">
            {memberReservations.length === 0 ? (
              <p className="text-xs text-neutral-400 py-8 text-center">
                No active book holds or reservations on file.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Reserved Title</th>
                    <th className="py-2.5 px-3">Request Date</th>
                    <th className="py-2.5 px-3">Hold Expiry</th>
                    <th className="py-2.5 px-3">Queue #</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {memberReservations.map((r) => (
                    <tr key={r.id}>
                      <td className="py-2.5 px-3 font-semibold">{r.bookTitle}</td>
                      <td className="py-2.5 px-3 text-neutral-500 font-mono">{r.requestDate}</td>
                      <td className="py-2.5 px-3 font-mono">{r.expiryDate}</td>
                      <td className="py-2.5 px-3 font-bold font-mono">Position #{r.queuePosition}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={r.status} size="sm" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Tab 4: Fines */}
        {activeTabSub === 'fines' && (
          <div className="mt-4 overflow-x-auto">
            {memberFines.length === 0 ? (
              <p className="text-xs text-neutral-400 py-8 text-center">
                No fines or penalty records for this member. Good academic standing.
              </p>
            ) : (
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-50 dark:bg-neutral-900/60 text-neutral-500 font-semibold border-b border-neutral-100 dark:border-neutral-800">
                  <tr>
                    <th className="py-2.5 px-3">Fine Ref</th>
                    <th className="py-2.5 px-3">Reason / Book</th>
                    <th className="py-2.5 px-3">Days Late</th>
                    <th className="py-2.5 px-3">Amount</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {memberFines.map((f) => (
                    <tr key={f.id}>
                      <td className="py-2.5 px-3 font-mono text-neutral-500">{f.fineId}</td>
                      <td className="py-2.5 px-3 font-medium">{f.bookTitle}</td>
                      <td className="py-2.5 px-3 font-mono">{f.daysLate} days</td>
                      <td className="py-2.5 px-3 font-bold font-mono">LKR {f.amount.toFixed(2)}</td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={f.status} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {f.status === 'unpaid' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => collectFine(f.id)}
                              className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
                            >
                              Collect Fee
                            </button>
                            <button
                              onClick={() => {
                                const reason = prompt('Enter waiver reason (e.g. medical leave approved):');
                                if (reason) waiveFine(f.id, reason);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-lg transition"
                            >
                              Waive
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
