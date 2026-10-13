import React, { useMemo, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import {
  AlertTriangle,
  ArrowRight,
  ArrowRightLeft,
  BookMarked,
  BookOpen,
  CheckCircle2,
  RefreshCw,
  Users,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const { currentUser, books, members, circulation, fines, setActiveTab, refreshAllData, addToast } = useLibrary();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const activeLoans = useMemo(() => circulation.filter((loan) => ['active', 'overdue'].includes(loan.status)), [circulation]);
  const overdueLoans = useMemo(() => circulation.filter((loan) => loan.status === 'overdue'), [circulation]);
  const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
  const outstandingFines = fines.filter((fine) => fine.status === 'unpaid').reduce((sum, fine) => sum + fine.amount, 0);
  const hasNoData = books.length === 0 && members.length === 0 && circulation.length === 0;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
    addToast({ type: 'info', title: 'Updated', message: 'The latest library records are now on screen.' });
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">Library desk</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-neutral-950">Good morning, {currentUser.name || 'there'}</h1>
          <p className="mt-1 text-sm text-neutral-600">Here is what needs attention in the library today.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleRefresh} className="inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50" title="Refresh library data">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button onClick={() => setActiveTab('borrow')} className="inline-flex items-center gap-2 rounded-lg bg-neutral-950 px-3 py-2 text-xs font-semibold text-white hover:bg-neutral-800">
            <BookMarked className="h-4 w-4" />
            Issue a book
          </button>
          <button onClick={() => setActiveTab('returns')} className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-xs font-semibold text-neutral-800 hover:bg-neutral-50">
            <ArrowRightLeft className="h-4 w-4" />
            Receive a return
          </button>
        </div>
      </header>

      {hasNoData && (
        <section className="rounded-xl border border-neutral-300 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-500">First steps</p>
              <h2 className="mt-1 text-lg font-bold text-neutral-950">Set up the library in a sensible order</h2>
              <p className="mt-1 max-w-2xl text-sm text-neutral-600">Create the classification list first, then add titles and copies, followed by the people who borrow them.</p>
            </div>
            <span className="inline-flex h-8 items-center rounded-full border border-neutral-300 px-3 text-xs font-medium text-neutral-700">No records yet</span>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              ['categories', '1', 'Create categories'],
              ['books', '2', 'Add books and copies'],
              ['members', '3', 'Register members'],
            ].map(([tab, number, label]) => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-left hover:border-neutral-950 hover:bg-white">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-neutral-950 text-xs font-bold text-white">{number}</span>
                <span className="text-sm font-semibold text-neutral-900">{label}</span>
                <ArrowRight className="ml-auto h-4 w-4 text-neutral-400" />
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Titles" value={books.length} subtitle={`${totalCopies} physical copies`} icon={BookOpen} color="maroon" />
        <StatCard label="On loan" value={activeLoans.length} subtitle="Currently borrowed" icon={BookMarked} color="blue" />
        <StatCard label="Overdue" value={overdueLoans.length} subtitle={overdueLoans.length ? 'Needs follow-up' : 'Nothing overdue'} icon={AlertTriangle} color={overdueLoans.length ? 'rose' : 'emerald'} />
        <StatCard label="Members" value={members.length} subtitle={`Rs. ${outstandingFines.toFixed(2)} outstanding`} icon={Users} color="amber" />
      </section>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <section className="rounded-xl border border-neutral-200 bg-white">
          <div className="flex items-center justify-between border-b border-neutral-200 px-5 py-4">
            <div>
              <h2 className="text-sm font-bold text-neutral-950">Books currently on loan</h2>
              <p className="mt-0.5 text-xs text-neutral-500">The loans that are still open at the desk.</p>
            </div>
            <button onClick={() => setActiveTab('returns')} className="inline-flex items-center gap-1 text-xs font-semibold text-neutral-700 hover:text-neutral-950">Open returns <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
          {activeLoans.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-neutral-400" />
              <p className="mt-3 text-sm font-semibold text-neutral-800">No open loans</p>
              <p className="mt-1 text-xs text-neutral-500">The circulation desk is clear right now.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-neutral-200 bg-neutral-50 text-[10px] font-semibold uppercase tracking-wide text-neutral-500">
                  <tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Copy</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Status</th></tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {activeLoans.slice(0, 8).map((loan) => (
                    <tr key={loan.id} className="hover:bg-neutral-50">
                      <td className="px-5 py-3 font-semibold text-neutral-900">{loan.memberName}</td>
                      <td className="max-w-[220px] truncate px-5 py-3 text-neutral-700">{loan.bookTitle}</td>
                      <td className="px-5 py-3 font-mono text-neutral-500">{loan.copyBarcode}</td>
                      <td className="px-5 py-3 font-mono text-neutral-700">{loan.dueDate}</td>
                      <td className="px-5 py-3"><StatusBadge status={loan.status} size="sm" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <aside className="space-y-5">
          <section className="rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <h2 className="text-sm font-bold text-neutral-950">Needs attention</h2>
              <span className="text-xs font-mono text-neutral-500">{overdueLoans.length}</span>
            </div>
            {overdueLoans.length === 0 ? (
              <p className="py-5 text-xs leading-5 text-neutral-500">No overdue loans need follow-up.</p>
            ) : (
              <div className="space-y-3 pt-4">
                {overdueLoans.slice(0, 4).map((loan) => <div key={loan.id} className="border-l-2 border-neutral-950 pl-3"><p className="truncate text-xs font-semibold text-neutral-900">{loan.bookTitle}</p><p className="mt-0.5 text-[11px] text-neutral-500">{loan.memberName} · due {loan.dueDate}</p></div>)}
                <button onClick={() => setActiveTab('returns')} className="text-xs font-semibold text-neutral-800 underline underline-offset-4">Review overdue loans</button>
              </div>
            )}
          </section>
          <section className="rounded-xl border border-neutral-200 bg-neutral-950 p-5 text-white">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400">Shortcuts</p>
            <div className="mt-4 space-y-2">
              <button onClick={() => setActiveTab('books')} className="flex w-full items-center justify-between rounded-lg border border-neutral-700 px-3 py-2.5 text-left text-xs font-semibold hover:bg-neutral-800">Browse catalogue <ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => setActiveTab('members')} className="flex w-full items-center justify-between rounded-lg border border-neutral-700 px-3 py-2.5 text-left text-xs font-semibold hover:bg-neutral-800">Find a member <ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => setActiveTab('reports')} className="flex w-full items-center justify-between rounded-lg border border-neutral-700 px-3 py-2.5 text-left text-xs font-semibold hover:bg-neutral-800">View reports <ArrowRight className="h-4 w-4" /></button>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};
