import React, { useMemo, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import { StatCard } from '../common/StatCard';
import { StatusBadge } from '../common/StatusBadge';
import { getCatalogueMetrics } from '../../utils/catalogueMetrics';
import {
  AlertTriangle, Archive, ArrowRight, ArrowRightLeft, BarChart3, BookMarked,
  BookOpen, Boxes, CheckCircle2, Clock3, RefreshCw, Users,
} from 'lucide-react';
import {
  Area, AreaChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

const chartTooltipStyle = {
  backgroundColor: '#141311',
  borderRadius: 12,
  border: '1px solid #2B2922',
  color: '#E7E5E4',
  boxShadow: '0 8px 24px rgba(0,0,0,.28)',
  fontSize: 12,
};

function readDate(value?: string) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const DashboardView: React.FC = () => {
  const { currentUser, books, members, circulation, fines, setActiveTab, refreshAllData, addToast } = useLibrary();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const catalogue = useMemo(() => getCatalogueMetrics(books), [books]);
  const activeLoans = useMemo(() => circulation.filter((loan) => ['active', 'overdue', 'renewed'].includes(loan.status)), [circulation]);
  const overdueLoans = useMemo(() => circulation.filter((loan) => loan.status === 'overdue'), [circulation]);
  const outstandingFines = fines.filter((fine) => fine.status === 'unpaid').reduce((sum, fine) => sum + fine.amount, 0);
  const activeAvailable = catalogue.activeBooks.reduce((sum, book) => sum + Math.max(0, Number(book.availableCopies) || 0), 0);
  const activeUnavailable = Math.max(0, catalogue.activePhysicalCopies - activeAvailable);
  const hasNoData = catalogue.activeTitles === 0 && members.length === 0 && circulation.length === 0;

  const monthlyCirculation = useMemo(() => {
    const now = new Date();
    const buckets = new Map<string, { key: string; month: string; issued: number; returned: number }>();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
      buckets.set(monthKey(date), { key: monthKey(date), month: date.toLocaleDateString('en', { month: 'short' }), issued: 0, returned: 0 });
    }
    circulation.forEach((record) => {
      const borrowed = readDate(record.borrowDate);
      const returned = readDate(record.returnDate);
      if (borrowed && buckets.has(monthKey(borrowed))) buckets.get(monthKey(borrowed))!.issued += 1;
      if (returned && buckets.has(monthKey(returned))) buckets.get(monthKey(returned))!.returned += 1;
    });
    return Array.from(buckets.values());
  }, [circulation]);

  const availability = [
    { name: 'Available', value: Math.min(activeAvailable, catalogue.activePhysicalCopies), color: '#E7E5E4' },
    { name: 'On loan / unavailable', value: activeUnavailable, color: '#2B2922' },
  ].filter((item) => item.value > 0);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshAllData();
    setIsRefreshing(false);
    addToast({ type: 'info', title: 'Updated', message: 'The latest library records are now on screen.' });
  };

  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      <header className="dashboard-hero flex flex-col gap-4 rounded-3xl border border-library-border bg-library-surface p-5 shadow-subtle sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <p className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-indigo-700 dark:text-indigo-300"><span className="h-1.5 w-1.5 rounded-full bg-cyan-500" />Library desk · Today</p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">{greeting}, {currentUser.name?.split(' ')[0] || 'there'}</h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">A clear view of the collection, circulation desk, and what needs attention.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={handleRefresh} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800" title="Refresh library data">
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />Refresh
          </button>
          <button onClick={() => setActiveTab('borrow')} className="dashboard-issue-books inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-xs font-bold shadow-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" aria-label="Issue books">
            <BookMarked className="h-4 w-4" />Issue books
          </button>
          <button onClick={() => setActiveTab('reports')} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800">
            <BarChart3 className="h-4 w-4" />Analytics
          </button>
        </div>
      </header>

      {hasNoData && (
        <section className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 dark:border-indigo-900 dark:bg-indigo-950/25">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-indigo-700 dark:text-indigo-300">First steps</p>
          <h2 className="mt-1 text-lg font-bold text-slate-950 dark:text-white">Set up the library in a sensible order</h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300">Create categories, add titles and copies, then register the people who borrow them.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              ['categories', '01', 'Create categories'],
              ['books', '02', 'Add titles and copies'],
              ['members', '03', 'Register members'],
            ].map(([tab, number, label]) => <button key={tab} onClick={() => setActiveTab(tab as any)} className="flex min-h-12 items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-left hover:border-indigo-300 dark:border-slate-700 dark:bg-slate-900"><span className="font-mono text-xs font-bold text-indigo-600">{number}</span><span className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</span><ArrowRight className="ml-auto h-4 w-4 text-slate-400" /></button>)}
          </div>
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <StatCard label="Active titles" value={catalogue.activeTitles} subtitle="Titles in the current catalogue" icon={BookOpen} color="maroon" onClick={() => setActiveTab('books')} />
        <StatCard label="Physical copies" value={catalogue.activePhysicalCopies} subtitle="Copies linked to active titles" icon={Boxes} color="gold" onClick={() => setActiveTab('books')} />
        <StatCard label="Open loans" value={activeLoans.length} subtitle="Currently checked out" icon={BookMarked} color="blue" />
        <StatCard label="Overdue" value={overdueLoans.length} subtitle={overdueLoans.length ? 'Needs follow-up' : 'Nothing overdue'} icon={AlertTriangle} color={overdueLoans.length ? 'rose' : 'emerald'} />
      </section>

      {catalogue.archivedPhysicalCopies > 0 && (
        <section className="flex flex-col gap-3 rounded-2xl border border-cyan-200 bg-cyan-50/70 p-4 dark:border-cyan-900/60 dark:bg-cyan-950/20 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-cyan-700 dark:bg-slate-900 dark:text-cyan-300"><Archive className="h-4 w-4" /></span><div><p className="text-sm font-bold text-slate-900 dark:text-white">{catalogue.archivedPhysicalCopies} physical-copy records are attached to archived titles</p><p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">The total includes them; active-catalogue metrics exclude them. Review before permanently deleting an archived title.</p></div></div>
          <button onClick={() => setActiveTab('books')} className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-xl border border-cyan-200 bg-white px-3 text-xs font-bold text-cyan-800 hover:bg-cyan-100 dark:border-cyan-900 dark:bg-slate-900 dark:text-cyan-200 dark:hover:bg-slate-800">Review catalogue <ArrowRight className="h-3.5 w-3.5" /></button>
        </section>
      )}

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(300px,0.85fr)]">
        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-base font-bold text-slate-950 dark:text-white">Circulation activity</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Loans issued and returns received · last six months</p></div><span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-bold uppercase tracking-wide text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">{circulation.length} records</span></div>
          <div className="h-72" role="img" aria-label="Area chart showing monthly loans issued and returns">
            <ResponsiveContainer width="100%" height="100%"><AreaChart data={monthlyCirculation} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <defs><linearGradient id="issuedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#E7E5E4" stopOpacity={0.22} /><stop offset="95%" stopColor="#E7E5E4" stopOpacity={0.01} /></linearGradient><linearGradient id="returnedGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A8A29E" stopOpacity={0.18} /><stop offset="95%" stopColor="#A8A29E" stopOpacity={0.01} /></linearGradient></defs>
              <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#2B2922" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#A8A29E', fontSize: 11 }} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#A8A29E', fontSize: 10 }} />
              <Tooltip contentStyle={chartTooltipStyle} />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="issued" name="Issues" stroke="#E7E5E4" strokeWidth={2.5} fill="url(#issuedGradient)" activeDot={{ r: 4 }} />
              <Area type="monotone" dataKey="returned" name="Returns" stroke="#A8A29E" strokeWidth={2.5} fill="url(#returnedGradient)" activeDot={{ r: 4 }} />
            </AreaChart></ResponsiveContainer>
          </div>
          {circulation.length === 0 && <p className="mt-1 text-center text-xs text-slate-500">Chart is ready; activity appears here as circulation is recorded.</p>}
        </article>

        <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle dark:border-slate-800 dark:bg-slate-900 sm:p-6">
          <div><h2 className="text-base font-bold text-slate-950 dark:text-white">Active-copy availability</h2><p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Availability across the active catalogue</p></div>
          {availability.length ? <div className="relative mx-auto mt-2 h-56 max-w-xs" role="img" aria-label="Donut chart of available and unavailable active copies">
            <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={availability} dataKey="value" nameKey="name" innerRadius={65} outerRadius={92} paddingAngle={3} stroke="none">{availability.map((entry) => <Cell key={entry.name} fill={entry.color} />)}</Pie><Tooltip contentStyle={chartTooltipStyle} /></PieChart></ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">{catalogue.activePhysicalCopies}</span><span className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">active copies</span></div>
          </div> : <div className="flex h-56 flex-col items-center justify-center text-center"><Boxes className="h-8 w-8 text-slate-300" /><p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-200">No active copies</p><p className="mt-1 text-xs text-slate-500">Add an active title to see availability.</p></div>}
          <div className="grid grid-cols-2 gap-2"><div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/50"><p className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Available</p><p className="mt-1 text-xl font-bold text-indigo-950 dark:text-white">{activeAvailable}</p></div><div className="rounded-xl bg-cyan-50 p-3 dark:bg-cyan-950/50"><p className="text-[10px] font-semibold uppercase tracking-wide text-cyan-700 dark:text-cyan-300">Unavailable</p><p className="mt-1 text-xl font-bold text-cyan-950 dark:text-white">{activeUnavailable}</p></div></div>
          <div className="mt-4 flex items-center gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400"><Users className="h-4 w-4 text-indigo-500" /><span><strong className="text-slate-800 dark:text-slate-200">{members.length}</strong> registered members</span><span className="ml-auto">Rs. {outstandingFines.toFixed(2)} outstanding</span></div>
        </article>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-subtle dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800"><div><h2 className="text-sm font-bold text-slate-950 dark:text-white">Books currently on loan</h2><p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">The open loans at the desk right now.</p></div><button onClick={() => setActiveTab('returns')} className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700 hover:text-indigo-900 dark:text-indigo-300">Open returns <ArrowRight className="h-3.5 w-3.5" /></button></div>
          {activeLoans.length === 0 ? <div className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500" /><p className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-200">No open loans</p><p className="mt-1 text-xs text-slate-500">The circulation desk is clear right now.</p></div> : <div className="overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50"><tr><th className="px-5 py-3">Member</th><th className="px-5 py-3">Title</th><th className="px-5 py-3">Copy</th><th className="px-5 py-3">Due</th><th className="px-5 py-3">Status</th></tr></thead><tbody className="divide-y divide-slate-100 dark:divide-slate-800">{activeLoans.slice(0, 8).map((loan) => <tr key={loan.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/50"><td className="px-5 py-3 font-semibold text-slate-900 dark:text-slate-100">{loan.memberName}</td><td className="max-w-[220px] truncate px-5 py-3 text-slate-700 dark:text-slate-300">{loan.bookTitle}</td><td className="px-5 py-3 font-mono text-[11px] text-slate-500">{loan.copyBarcode}</td><td className="px-5 py-3 font-mono text-slate-700 dark:text-slate-300">{loan.dueDate}</td><td className="px-5 py-3"><StatusBadge status={loan.status} size="sm" /></td></tr>)}</tbody></table></div>}
        </article>

        <aside className="space-y-4">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center justify-between"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300"><Clock3 className="h-4 w-4" /></span><h2 className="text-sm font-bold text-slate-950 dark:text-white">Needs attention</h2></div><span className="rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 dark:bg-rose-950/50 dark:text-rose-300">{overdueLoans.length}</span></div>{overdueLoans.length === 0 ? <p className="py-5 text-xs leading-5 text-slate-500">No overdue loans need follow-up.</p> : <div className="space-y-3 pt-4">{overdueLoans.slice(0, 4).map((loan) => <div key={loan.id} className="border-l-2 border-rose-400 pl-3"><p className="truncate text-xs font-semibold text-slate-900 dark:text-slate-100">{loan.bookTitle}</p><p className="mt-0.5 text-[11px] text-slate-500">{loan.memberName} · due {loan.dueDate}</p></div>)}<button onClick={() => setActiveTab('returns')} className="text-xs font-semibold text-indigo-700 underline underline-offset-4 dark:text-indigo-300">Review overdue loans</button></div>}</section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">Quick actions</p>
            <div className="mt-3 space-y-2">
              <button onClick={() => setActiveTab('borrow')} className="dashboard-issue-books flex min-h-11 w-full items-center justify-between rounded-xl px-3 text-left text-xs font-bold transition" aria-label="Issue books">
                <span className="flex items-center gap-2"><BookMarked className="h-4 w-4" />Issue books</span><ArrowRight className="h-4 w-4" />
              </button>
              <button onClick={() => setActiveTab('books')} className="flex min-h-10 w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-left text-xs font-semibold text-slate-800 transition hover:bg-indigo-50 hover:text-indigo-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950/50"><span className="flex items-center gap-2"><BookOpen className="h-4 w-4" />Browse catalogue</span><ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => setActiveTab('members')} className="flex min-h-10 w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-left text-xs font-semibold text-slate-800 transition hover:bg-indigo-50 hover:text-indigo-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950/50"><span className="flex items-center gap-2"><Users className="h-4 w-4" />Find a member</span><ArrowRight className="h-4 w-4" /></button>
              <button onClick={() => setActiveTab('returns')} className="flex min-h-10 w-full items-center justify-between rounded-xl bg-slate-50 px-3 text-left text-xs font-semibold text-slate-800 transition hover:bg-indigo-50 hover:text-indigo-800 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-indigo-950/50"><span className="flex items-center gap-2"><ArrowRightLeft className="h-4 w-4" />Process a return</span><ArrowRight className="h-4 w-4" /></button>
            </div>
          </section>
        </aside>
      </section>
    </div>
  );
};
