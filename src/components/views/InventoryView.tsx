import React, { useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatusBadge } from '../common/StatusBadge';
import { StatCard } from '../common/StatCard';
import { getInventoryAuditMetrics } from '../../utils/auditMetrics';
import {
  Boxes,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  FileSpreadsheet,
  Printer,
  Barcode as BarcodeIcon,
  Play,
  Check,
  ShieldCheck,
  Layers
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    inventory,
    verifyInventoryBarcode,
    updateInventoryStatus,
    books,
    setPrintData,
    addToast,
  } = useLibrary();

  const [searchQuery, setSearchQuery] = useState('');
  const [scanBarcode, setScanBarcode] = useState('');
  const [isAuditing, setIsAuditing] = useState(false);

  const {
    totalExpected,
    totalActual,
    flaggedCount,
    verifiedCount,
    reconciliationPercent,
  } = getInventoryAuditMetrics(inventory);
  const hasInventory = inventory.length > 0;

  const filteredInventory = inventory.filter(
    (i) =>
      i.bookTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.shelf.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.status.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSimulateScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanBarcode.trim()) return;

    const res = verifyInventoryBarcode(scanBarcode);
    setScanBarcode('');
  };

  const handleStartAuditSession = () => {
    if (!hasInventory) {
      addToast({
        type: 'info',
        title: 'No inventory to audit',
        message: 'Add or sync physical-copy records before starting a stock audit.',
      });
      return;
    }

    setIsAuditing(true);
    addToast({
      type: 'info',
      title: 'Audit Session Started',
      message: 'Physical stock verification session active for Main Reference Hall & A/L Science Wing.',
    });
  };

  const handleExportInventory = () => {
    const headers = 'Book ID,Title,ISBN,Shelf,Expected,Actual,Difference,Status,Last Audited\n';
    const rows = inventory
      .map(
        (i) =>
          `"${i.bookId}","${i.bookTitle}","${i.isbn}","${i.shelf}",${i.expectedCopies},${i.actualCopies},${i.difference},"${i.status}","${i.lastAuditDate}"`
      )
      .join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rahula_College_Inventory_Audit_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    addToast({
      type: 'success',
      title: 'Audit Report Exported',
      message: 'Physical stock verification ledger exported.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold font-heading text-gray-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-5 h-5 text-maroon-800 dark:text-gold-400" />
            <span>Stock Inventory & Shelf Audit</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Conduct physical collection stocktaking, reconcile shelf discrepancies, and track missing copies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportInventory}
            className="px-3 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 border border-gray-200 dark:border-slate-700 rounded-xl transition flex items-center gap-1.5"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Export Audit</span>
          </button>
          <button
            onClick={handleStartAuditSession}
            className={`px-4 py-2 text-xs font-bold rounded-xl shadow-card transition flex items-center gap-1.5 ${
              isAuditing
                ? 'bg-emerald-700 text-white'
                : 'bg-maroon-800 hover:bg-maroon-900 text-white'
            }`}
          >
            <Play className="w-4 h-4" />
            <span>{isAuditing ? 'Audit Session Active' : 'Start Stock Audit'}</span>
          </button>
        </div>
      </div>

      {/* 4 Key Inventory Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Expected Stock"
          value={totalExpected}
          icon={Boxes}
          change="Catalog Total"
          trend="neutral"
          color="maroon"
        />
        <StatCard
          label="Actual Verified"
          value={totalActual}
          icon={CheckCircle2}
          change={reconciliationPercent === null
            ? (hasInventory ? 'Reconciliation unavailable' : 'No inventory to audit')
            : `${reconciliationPercent}% Reconciled`}
          trend={reconciliationPercent === null ? 'neutral' : reconciliationPercent === 100 ? 'up' : 'down'}
          color="emerald"
        />
        <StatCard
          label="Discrepancies / Missing"
          value={flaggedCount}
          icon={AlertTriangle}
          change={flaggedCount === 0 ? 'No discrepancies' : `${flaggedCount} item${flaggedCount === 1 ? '' : 's'} flagged`}
          trend={flaggedCount === 0 ? 'neutral' : 'down'}
          color="rose"
        />
        <StatCard
          label="Shelves Audited"
          value={`${verifiedCount} / ${inventory.length}`}
          icon={Layers}
          change={hasInventory ? 'Verified matches' : 'No audit records'}
          trend="neutral"
          color="gold"
        />
      </div>

      {/* Barcode Scanner Simulator Panel */}
      {isAuditing && (
        <div className="p-4 bg-maroon-50/70 dark:bg-maroon-950/40 border border-maroon-200 dark:border-maroon-800 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-maroon-800 text-gold-300">
              <BarcodeIcon className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-maroon-900 dark:text-gold-300">
                Live Barcode Handheld Scanner Simulator
              </h4>
              <p className="text-[11px] text-gray-600 dark:text-gray-300">
                Scan physical book barcodes on shelves to mark verified in real time.
              </p>
            </div>
          </div>

          <form onSubmit={handleSimulateScan} className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="text"
              autoFocus
              value={scanBarcode}
              onChange={(e) => setScanBarcode(e.target.value)}
              placeholder="e.g. RC-BK-104-01"
              className="px-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-gray-300 dark:border-slate-700 rounded-lg font-mono focus:ring-2 focus:ring-maroon-800"
            />
            <button
              type="submit"
              className="px-3 py-1.5 text-xs font-bold text-white bg-maroon-800 hover:bg-maroon-900 rounded-lg shadow-sm"
            >
              Verify Scan
            </button>
          </form>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-gray-200 dark:border-slate-800 shadow-xs">
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search shelf stack, book title, or status..."
            className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-maroon-800"
          />
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-gray-50 dark:bg-slate-800/80 text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-slate-800">
              <tr>
                <th className="py-3 px-4">Book Title & ISBN</th>
                <th className="py-3 px-3">Shelf Stack</th>
                <th className="py-3 px-3">Wing / Section</th>
                <th className="py-3 px-3 text-center">Expected</th>
                <th className="py-3 px-3 text-center">Actual Found</th>
                <th className="py-3 px-3 text-center">Variance</th>
                <th className="py-3 px-3">Audit Status</th>
                <th className="py-3 px-4 text-right">Last Verified</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800 text-gray-800 dark:text-gray-200">
              {filteredInventory.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-14 text-center">
                    <Boxes className="mx-auto h-8 w-8 text-gray-300 dark:text-slate-600" />
                    <p className="mt-3 text-sm font-bold text-gray-800 dark:text-gray-200">
                      {hasInventory ? 'No inventory records match your search' : 'No inventory to audit'}
                    </p>
                    <p className="mx-auto mt-1 max-w-md text-xs text-gray-500 dark:text-gray-400">
                      {hasInventory
                        ? 'Try another title, shelf, barcode, or status.'
                        : 'Add or sync physical-copy records to begin stock verification. No reconciliation percentage or flagged items are reported until inventory exists.'}
                    </p>
                  </td>
                </tr>
              )}
              {filteredInventory.map((item) => {
                const hasDiff = item.difference !== 0;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/80 dark:hover:bg-slate-800/40 transition">
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 dark:text-white truncate max-w-xs">
                        {item.bookTitle}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">{item.isbn}</div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-maroon-800 dark:text-gold-400">
                      {item.shelf}
                    </td>
                    <td className="py-3 px-3 text-gray-500 dark:text-gray-400 truncate max-w-[150px]">
                      {item.section}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {item.expectedCopies}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-bold">
                      {item.actualCopies}
                    </td>
                    <td className="py-3 px-3 text-center font-mono font-extrabold">
                      <span className={hasDiff ? 'text-red-600' : 'text-emerald-600'}>
                        {item.difference > 0 ? `+${item.difference}` : item.difference}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <StatusBadge status={item.status} size="sm" />
                    </td>
                    <td className="py-3 px-4 text-right text-gray-400 font-mono text-[11px]">
                      <div>{item.lastAuditDate}</div>
                      <div className="text-[10px] text-gray-500 truncate max-w-[120px] ml-auto">
                        by {item.auditedBy.split(' ')[0]}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
