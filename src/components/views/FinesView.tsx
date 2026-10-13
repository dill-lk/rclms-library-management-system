import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { Modal } from '../common/Modal';
import { StatCard } from '../common/StatCard';
import { FineRecord } from '../../types';
import { getFineCollectionMetrics } from '../../utils/fineMetrics';
import {
  Receipt,
  Search,
  Filter,
  DollarSign,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Printer,
  Sparkles,
  CreditCard,
  Building,
  UserCheck
} from 'lucide-react';

export const FinesView: React.FC = () => {
  const {
    fines,
    collectFine,
    waiveFine,
    setPrintData,
    addToast,
    circulation,
  } = useLibrary();

  const [filterStatus, setFilterStatus] = useState<'all' | 'unpaid' | 'paid' | 'waived'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Collect Modal State
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedFine, setSelectedFine] = useState<FineRecord | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Cash at Circulation Desk');

  // Waive Modal State
  const [isWaiveModalOpen, setIsWaiveModalOpen] = useState(false);
  const [waiveReason, setWaiveReason] = useState('Medical leave approved by Sectional Head');

  // Key metrics calculation
  const totalOutstanding = fines
    .filter((f) => f.status === 'unpaid')
    .reduce((acc, f) => acc + f.amount, 0);

  const collectionMetrics = getFineCollectionMetrics(fines);
  const collectionChange = collectionMetrics.percentageChange === null
    ? '—'
    : `${collectionMetrics.percentageChange > 0 ? '+' : ''}${collectionMetrics.percentageChange.toFixed(1)}%`;
  const collectionComparison = collectionMetrics.percentageChange === null
    ? 'No previous-month baseline'
    : `vs previous month (LKR ${collectionMetrics.previousMonthTotal.toFixed(2)})`;

  const overdueMembersCount = new Set(
    circulation.filter((c) => c.status === 'overdue').map((c) => c.memberId)
  ).size;

  const totalWaived = fines
    .filter((f) => f.status === 'waived')
    .reduce((acc, f) => acc + f.amount, 0);

  const filteredFines = fines.filter((f) => {
    const matchesStatus = filterStatus === 'all' || f.status === filterStatus;
    const matchesSearch =
      f.memberName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.fineId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (f.receiptNumber && f.receiptNumber.includes(searchQuery));

    return matchesStatus && matchesSearch;
  });

  const handleOpenCollect = (fine: FineRecord) => {
    setSelectedFine(fine);
    setIsCollectModalOpen(true);
  };

  const handleConfirmCollect = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFine) return;
    collectFine(selectedFine.id, paymentMethod);
    setIsCollectModalOpen(false);

    // Open the receipt download modal
    setPrintData({
      type: 'receipt',
      title: 'Fine Payment Receipt',
      payload: {
        documentKind: 'fine',
        transactionId: selectedFine.fineId,
        bookTitle: selectedFine.bookTitle,
        memberName: selectedFine.memberName,
        memberId: selectedFine.memberId,
        fineAmount: selectedFine.amount,
        issuedBy: 'Desk Officer',
        paymentMethod,
      },
    });
  };

  const handleOpenWaive = (fine: FineRecord) => {
    setSelectedFine(fine);
    setIsWaiveModalOpen(true);
  };

  const handleConfirmWaive = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFine) return;
    waiveFine(selectedFine.id, waiveReason);
    setIsWaiveModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner Header */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
            <Receipt className="w-5 h-5 text-maroon-800 dark:text-gold-400" />
            <span>Fines & Late Fee Management</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Audit overdue charges, receive fee payments, record institutional waivers, and download receipts.
          </p>
        </div>
        <div className="text-xs font-mono font-bold text-maroon-800 dark:text-gold-300 bg-maroon-50 dark:bg-maroon-950/60 px-3 py-1.5 rounded-lg border border-maroon-200 dark:border-maroon-800">
          Standard Fine Rate: LKR 10.00 / Day
        </div>
      </div>

      {/* 4 Financial Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Outstanding Fines"
          value={`LKR ${totalOutstanding.toFixed(2)}`}
          icon={AlertTriangle}
          change={`${fines.filter((f) => f.status === 'unpaid').length} Incurred`}
          trend="down"
          color="rose"
        />
        <StatCard
          label="Collected This Month"
          value={`LKR ${collectionMetrics.currentMonthTotal.toFixed(2)}`}
          icon={Receipt}
          change={collectionChange}
          subtitle={collectionComparison}
          trend={collectionMetrics.trend}
          color="emerald"
        />
        <StatCard
          label="Overdue Members"
          value={overdueMembersCount}
          icon={UserCheck}
          change="Pending clearance"
          trend="neutral"
          color="amber"
        />
        <StatCard
          label="Waived Fines"
          value={`LKR ${totalWaived.toFixed(2)}`}
          icon={RotateCcw}
          change="Authorized"
          trend="neutral"
          color="gold"
        />
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 dark:border-slate-800 pb-3 text-xs">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterStatus === 'all'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            All Ledger Records ({fines.length})
          </button>
          <button
            onClick={() => setFilterStatus('unpaid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterStatus === 'unpaid'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Unpaid Dues ({fines.filter((f) => f.status === 'unpaid').length})
          </button>
          <button
            onClick={() => setFilterStatus('paid')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterStatus === 'paid'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Paid & Settled ({fines.filter((f) => f.status === 'paid').length})
          </button>
          <button
            onClick={() => setFilterStatus('waived')}
            className={`px-3 py-1.5 rounded-lg font-bold transition ${
              filterStatus === 'waived'
                ? 'bg-maroon-800 text-white shadow-xs'
                : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800'
            }`}
          >
            Approved Waivers ({fines.filter((f) => f.status === 'waived').length})
          </button>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student name, book title, receipt no..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-maroon-800"
          />
        </div>
      </div>

      {/* Fines Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Fine Reference</th>
                <th className="py-3 px-3">Borrower Member</th>
                <th className="py-3 px-3">Book Title</th>
                <th className="py-3 px-3">Due Date</th>
                <th className="py-3 px-3">Days Late</th>
                <th className="py-3 px-3 font-mono">Fine Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
              {filteredFines.map((fine) => (
                <tr key={fine.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold text-gray-500">
                    {fine.fineId}
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-gray-900 dark:text-white truncate max-w-[150px]">
                      {fine.memberName}
                    </div>
                    <div className="text-[10px] text-gray-400">{fine.memberId}</div>
                  </td>
                  <td className="py-3 px-3">
                    <div className="font-medium truncate max-w-[200px]">{fine.bookTitle}</div>
                  </td>
                  <td className="py-3 px-3 text-gray-500">{fine.dueDate}</td>
                  <td className="py-3 px-3 font-bold text-red-600">
                    {fine.daysLate} Days
                  </td>
                  <td className="py-3 px-3 font-mono font-extrabold text-gray-900 dark:text-white">
                    LKR {fine.amount.toFixed(2)}
                  </td>
                  <td className="py-3 px-3">
                    <StatusBadge status={fine.status} size="sm" />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {fine.status === 'unpaid' ? (
                        <>
                          <button
                            onClick={() => handleOpenCollect(fine)}
                            className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition"
                          >
                            Collect
                          </button>
                          <button
                            onClick={() => handleOpenWaive(fine)}
                            className="px-2.5 py-1 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-lg transition"
                          >
                            Waive
                          </button>
                        </>
                      ) : fine.status === 'paid' ? (
                        <button
                          onClick={() =>
                            setPrintData({
                              type: 'receipt',
                              title: 'Official Fine Receipt',
                              payload: {
                                documentKind: 'fine',
                                transactionId: fine.receiptNumber || fine.fineId,
                                bookTitle: fine.bookTitle,
                                memberName: fine.memberName,
                                memberId: fine.memberId,
                                fineAmount: fine.amount,
                                issuedBy: fine.collectedBy || 'Staff Desk',
                              },
                            })
                          }
                          className="p-1.5 text-gray-400 hover:text-maroon-800 dark:hover:text-gold-400 rounded-lg transition"
                          title="Download Receipt PDF"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          Waived
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Fine Modal */}
      <Modal
        isOpen={isCollectModalOpen}
        onClose={() => setIsCollectModalOpen(false)}
        title="Collect Overdue Library Fee"
        subtitle="Process payment and generate official university receipt"
        size="md"
      >
        {selectedFine && (
          <form onSubmit={handleConfirmCollect} className="space-y-4 text-xs">
            <div className="p-3 bg-gray-50 dark:bg-slate-800/60 rounded-xl space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Borrower:</span>
                <span className="font-bold text-gray-900 dark:text-white">{selectedFine.memberName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Book Overdue:</span>
                <span className="font-semibold truncate max-w-xs">{selectedFine.bookTitle}</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-gray-200 dark:border-slate-700">
                <span className="font-bold text-gray-800 dark:text-gray-200">Amount Due:</span>
                <span className="font-mono font-black text-sm text-maroon-800 dark:text-gold-400">
                  LKR {selectedFine.amount.toFixed(2)}
                </span>
              </div>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Payment Channel / Method
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              >
                <option value="Cash at Circulation Desk">Cash at Circulation Desk</option>
                <option value="Online Bank Transfer (BOC Matara)">Online Bank Transfer (BOC Matara)</option>
                <option value="Rahula College Student Welfare Fund">Rahula College Student Welfare Fund</option>
              </select>
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCollectModalOpen(false)}
                className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-card transition flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirm & Download Receipt</span>
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Waive Fine Modal */}
      <Modal
        isOpen={isWaiveModalOpen}
        onClose={() => setIsWaiveModalOpen(false)}
        title="Authorize Fine Waiver"
        subtitle="Record reason for discharging overdue penalty"
        size="md"
      >
        {selectedFine && (
          <form onSubmit={handleConfirmWaive} className="space-y-4 text-xs">
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-xl text-amber-900 dark:text-amber-200">
              <p className="font-semibold">
                Waiving LKR {selectedFine.amount.toFixed(2)} for {selectedFine.memberName}.
              </p>
              <p className="text-[11px] mt-0.5 text-amber-700 dark:text-amber-300">
                Waivers are audited annually by the Rahula College Board of Management.
              </p>
            </div>

            <div>
              <label className="block font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-1">
                Waiver Justification / Reason
              </label>
              <textarea
                rows={3}
                required
                value={waiveReason}
                onChange={(e) => setWaiveReason(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-gray-900 dark:text-white"
              />
            </div>

            <div className="pt-4 border-t border-gray-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsWaiveModalOpen(false)}
                className="px-4 py-2 font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-xl shadow-card transition"
              >
                Approve Waiver
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};
