import React, { useMemo, useState } from 'react';
import { useLibrary } from '../../context/LibraryContext';
import {
  BarChart3, BookOpen, Download, Receipt, TrendingUp, Users, Boxes,
  CircleDollarSign, LibraryBig, Activity, PieChart as PieIcon,
} from 'lucide-react';
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { getCatalogueMetrics } from '../../utils/catalogueMetrics';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#6366f1', '#f97316', '#8b5cf6', '#14b8a6'];
const panelClass = 'rounded-2xl border border-slate-200 bg-white p-5 shadow-subtle dark:border-slate-800 dark:bg-[#141f2e]';
const compactNumber = new Intl.NumberFormat('en-LK');

function parseDay(value?: string) {
  if (!value) return null;
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return date.toLocaleDateString('en', { month: 'short', year: '2-digit' });
}

export const ReportsView: React.FC = () => {
  const { books, members, circulation, fines, addToast } = useLibrary();
  const [reportType, setReportType] = useState<'circulation' | 'catalog' | 'fines'>('circulation');
  const catalogue = useMemo(() => getCatalogueMetrics(books), [books]);
  const activeBooks = catalogue.activeBooks;
  const totalVolume = catalogue.activePhysicalCopies;
  const activeLoansCount = circulation.filter((item) => ['active', 'renewed'].includes(item.status)).length;
  const overdueCount = circulation.filter((item) => item.status === 'overdue').length;
  const returnedCount = circulation.filter((item) => item.status === 'returned').length;
  const totalPaidFines = fines.filter((fine) => fine.status === 'paid').reduce((sum, fine) => sum + fine.amount, 0);
  const totalUnpaidFines = fines.filter((fine) => fine.status === 'unpaid').reduce((sum, fine) => sum + fine.amount, 0);
  const availableCopies = activeBooks.reduce((sum, book) => sum + Math.max(0, book.availableCopies || 0), 0);
  const unavailableCopies = Math.max(0, totalVolume - availableCopies);

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    activeBooks.forEach((book) => map.set(book.category || 'Uncategorized', (map.get(book.category || 'Uncategorized') || 0) + (book.totalCopies || 0)));
    return Array.from(map, ([name, copies]) => ({ name, copies })).sort((a, b) => b.copies - a.copies).slice(0, 8);
  }, [activeBooks]);

  const monthlyCirculation = useMemo(() => {
    const dates = circulation.flatMap((record) => [parseDay(record.borrowDate), parseDay(record.returnDate)].filter((date): date is Date => Boolean(date)));
    const latest = dates.length ? new Date(Math.max(...dates.map((date) => date.getTime()))) : new Date();
    const buckets = new Map<string, { month: string; issued: number; returned: number }>();
    for (let offset = 5; offset >= 0; offset -= 1) {
      const date = new Date(latest.getFullYear(), latest.getMonth() - offset, 1);
      buckets.set(monthKey(date), { month: monthLabel(date), issued: 0, returned: 0 });
    }
    circulation.forEach((record) => {
      const issueDate = parseDay(record.borrowDate);
      if (issueDate && buckets.has(monthKey(issueDate))) buckets.get(monthKey(issueDate))!.issued += 1;
      const returnDate = parseDay(record.returnDate);
      if (returnDate && buckets.has(monthKey(returnDate))) buckets.get(monthKey(returnDate))!.returned += 1;
    });
    return Array.from(buckets.values());
  }, [circulation]);

  const categoryAvailability = useMemo(() => {
    return [{ name: 'Available', value: availableCopies }, { name: 'On loan / unavailable', value: unavailableCopies }].filter((item) => item.value > 0);
  }, [availableCopies, unavailableCopies]);

  const popularBooks = useMemo(() => activeBooks.filter((book) => book.totalBorrows > 0).sort((a, b) => b.totalBorrows - a.totalBorrows).slice(0, 6).map((book) => ({ title: book.title.length > 26 ? `${book.title.slice(0, 24)}…` : book.title, checkouts: book.totalBorrows })), [activeBooks]);

  const finesSplit = [
    { name: 'Collected', value: totalPaidFines },
    { name: 'Outstanding', value: totalUnpaidFines },
  ].filter((item) => item.value > 0);

  const handleExport = () => {
    const headers = 'Metric,Value,Status,Generated\n';
    const rows = [
      `Active catalogue copies,${totalVolume},Current,${new Date().toLocaleDateString()}`,
      `Total physical-copy records,${catalogue.totalPhysicalCopies},Includes archived titles,${new Date().toLocaleDateString()}`,
      `Copies on archived titles,${catalogue.archivedPhysicalCopies},Archived,${new Date().toLocaleDateString()}`,
      `Registered members,${members.length},Current,${new Date().toLocaleDateString()}`,
      `Active loans,${activeLoansCount},Issued,${new Date().toLocaleDateString()}`,
      `Overdue loans,${overdueCount},Overdue,${new Date().toLocaleDateString()}`,
      `Collected fines (LKR),${totalPaidFines.toFixed(2)},Settled,${new Date().toLocaleDateString()}`,
      `Outstanding fines (LKR),${totalUnpaidFines.toFixed(2)},Unpaid,${new Date().toLocaleDateString()}`,
    ].join('\n');
    const url = URL.createObjectURL(new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `Rahula_Library_Analytics_${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Report exported', message: 'Your library metrics CSV is ready.' });
  };

  const tabs = [
    { id: 'circulation' as const, label: 'Circulation', icon: Activity },
    { id: 'catalog' as const, label: 'Catalogue', icon: LibraryBig },
    { id: 'fines' as const, label: 'Fines', icon: CircleDollarSign },
  ];

  return (
    <div className="space-y-6">
      <header className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-50 via-white to-cyan-50 p-6 shadow-subtle dark:border-slate-800 dark:from-indigo-950/30 dark:via-slate-900 dark:to-cyan-950/20 sm:flex sm:items-center sm:justify-between">
        <div className="absolute -right-8 -top-12 h-44 w-44 rounded-full border-[24px] border-indigo-500/[0.08]" />
        <div className="relative">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-700 dark:text-cyan-300">Library intelligence</p>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight text-neutral-950 dark:text-white"><BarChart3 className="h-6 w-6 text-maroon-800 dark:text-gold-400" /> Analytics & reports</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">Explore circulation, collection mix, and fine balances from your library records.</p>
        </div>
        <button onClick={handleExport} className="relative mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-800 sm:mt-0"><Download className="h-4 w-4" />Export CSV</button>
      </header>

      <nav aria-label="Analytics report type" className="flex flex-wrap gap-2 rounded-2xl border border-neutral-200 bg-white p-2 shadow-subtle dark:border-neutral-800 dark:bg-[#141f2e]">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setReportType(id)} aria-pressed={reportType === id} className={`inline-flex min-h-11 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition ${reportType === id ? 'bg-maroon-800 text-white shadow-sm dark:bg-maroon-700' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}><Icon className="h-4 w-4" />{label}</button>
        ))}
      </nav>

      {reportType === 'circulation' && <>
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {[
            { label: 'Active loans', value: activeLoansCount, detail: 'Currently checked out', icon: BookOpen, tone: 'text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/50' },
            { label: 'Overdue', value: overdueCount, detail: overdueCount ? 'Follow-up needed' : 'No overdue items', icon: TrendingUp, tone: 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-950/50' },
            { label: 'Completed returns', value: returnedCount, detail: 'Recorded in circulation', icon: Receipt, tone: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/50' },
            { label: 'Members', value: members.length, detail: `${compactNumber.format(catalogue.totalPhysicalCopies)} total copy records`, icon: Users, tone: 'text-indigo-800 bg-indigo-50 dark:text-indigo-300 dark:bg-indigo-950/50' },
          ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className={panelClass}><div className="flex items-start justify-between"><div><p className="text-xs font-semibold text-neutral-500 dark:text-neutral-400">{label}</p><p className="mt-2 text-3xl font-bold tracking-tight text-neutral-950 dark:text-white">{compactNumber.format(value)}</p></div><span className={`rounded-xl p-2.5 ${tone}`}><Icon className="h-5 w-5" /></span></div><p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">{detail}</p></article>)}
        </section>

        <section className="grid gap-5 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)]">
          <article className={panelClass}>
            <div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-base font-bold text-neutral-950 dark:text-white">Monthly circulation</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Issues and returns by recorded transaction date</p></div><span className="rounded-full bg-maroon-50 px-3 py-1 text-[11px] font-semibold text-maroon-800 dark:bg-maroon-950 dark:text-gold-300">Last 6 active months</span></div>
            <div className="h-72 w-full" role="img" aria-label="Bar chart comparing monthly issues and returns">
              <ResponsiveContainer width="100%" height="100%"><BarChart data={monthlyCirculation} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={5}>
                <CartesianGrid strokeDasharray="4 5" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #dce4ee', boxShadow: '0 8px 20px rgba(15,23,42,.08)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="issued" name="Issues" fill="#4f46e5" radius={[5, 5, 0, 0]} maxBarSize={28} />
                <Bar dataKey="returned" name="Returns" fill="#06b6d4" radius={[5, 5, 0, 0]} maxBarSize={28} />
              </BarChart></ResponsiveContainer>
            </div>
            {circulation.length === 0 && <p className="mt-2 text-center text-xs text-neutral-500">No circulation records yet; bars will appear as transactions are recorded.</p>}
          </article>

          <article className={panelClass}>
            <div><h2 className="text-base font-bold text-neutral-950 dark:text-white">Collection availability</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Available compared with currently unavailable copies</p></div>
            {categoryAvailability.length ? <div className="h-60 pt-3" role="img" aria-label="Pie chart showing collection availability">
              <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryAvailability} dataKey="value" nameKey="name" innerRadius={56} outerRadius={88} paddingAngle={4} stroke="none">{categoryAvailability.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? '#4f46e5' : '#06b6d4'} />)}</Pie><Tooltip /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
            </div> : <div className="flex h-60 flex-col items-center justify-center text-center"><Boxes className="h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">No catalogue copies yet</p><p className="mt-1 text-xs text-neutral-500">Add titles and copies to see availability.</p></div>}
            <div className="mt-2 grid grid-cols-2 gap-2 text-center"><div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/50"><p className="text-[11px] text-neutral-500">Available active copies</p><p className="mt-1 text-lg font-bold text-indigo-700 dark:text-indigo-300">{compactNumber.format(availableCopies)}</p></div><div className="rounded-xl bg-cyan-50 p-3 dark:bg-cyan-950/40"><p className="text-[11px] text-neutral-500">Unavailable active copies</p><p className="mt-1 text-lg font-bold text-cyan-800 dark:text-cyan-300">{compactNumber.format(unavailableCopies)}</p></div></div>
          </article>
        </section>

        <section className={panelClass}>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold text-neutral-950 dark:text-white">Collection by subject</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Physical copy count across the largest categories</p></div><PieIcon className="h-5 w-5 text-maroon-700 dark:text-gold-400" /></div>
          {categoryStats.length ? <div className="h-72" role="img" aria-label="Horizontal bar chart of copies per category"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryStats} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={130} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 11 }} /><Tooltip /><Bar dataKey="copies" name="Copies" fill="#4f46e5" radius={[0, 5, 5, 0]}>{categoryStats.map((entry, index) => <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />)}</Bar></BarChart></ResponsiveContainer></div> : <p className="rounded-xl bg-neutral-50 py-10 text-center text-sm text-neutral-500 dark:bg-neutral-900">No categories or titles have been added yet.</p>}
        </section>
      </>}

      {reportType === 'catalog' && <section className="grid gap-5 xl:grid-cols-2">
        <article className={panelClass}>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-base font-bold text-neutral-950 dark:text-white">Titles by category</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Ranked by physical copies on the shelf</p></div><Boxes className="h-5 w-5 text-maroon-700 dark:text-gold-400" /></div>
          {categoryStats.length ? <div className="h-80" role="img" aria-label="Horizontal bar chart of library category sizes"><ResponsiveContainer width="100%" height="100%"><BarChart data={categoryStats} layout="vertical" margin={{ top: 4, right: 20, left: 10, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" /><XAxis type="number" allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} /><YAxis type="category" dataKey="name" width={125} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 11 }} /><Tooltip /><Bar dataKey="copies" name="Copies" fill="#4f46e5" radius={[0, 5, 5, 0]} /></BarChart></ResponsiveContainer></div> : <p className="rounded-xl bg-neutral-50 py-12 text-center text-sm text-neutral-500 dark:bg-neutral-900">No catalogue records to chart yet.</p>}
        </article>
        <article className={panelClass}>
          <div className="mb-4"><h2 className="text-base font-bold text-neutral-950 dark:text-white">Most borrowed titles</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Based on saved lifetime checkout counts</p></div>
          {popularBooks.length ? <div className="h-80" role="img" aria-label="Bar chart of most borrowed book titles"><ResponsiveContainer width="100%" height="100%"><BarChart data={popularBooks} margin={{ top: 4, right: 10, left: -12, bottom: 42 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="title" interval={0} angle={-24} textAnchor="end" height={70} tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 10 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} /><Tooltip /><Bar dataKey="checkouts" name="Checkouts" fill="#06b6d4" radius={[5, 5, 0, 0]} /></BarChart></ResponsiveContainer></div> : <div className="flex h-80 flex-col items-center justify-center text-center"><BookOpen className="h-9 w-9 text-neutral-300" /><p className="mt-3 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Not enough checkout history yet</p><p className="mt-1 max-w-xs text-xs text-neutral-500">Once loans are completed, the most borrowed titles will be ranked here.</p></div>}
        </article>
        <div className="grid gap-3 sm:grid-cols-3 xl:col-span-2"><article className={panelClass}><p className="text-xs font-semibold text-slate-500">Active titles</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{compactNumber.format(catalogue.activeTitles)}</p><p className="mt-1 text-xs text-slate-500">{compactNumber.format(catalogue.archivedTitles)} archived titles excluded</p></article><article className={panelClass}><p className="text-xs font-semibold text-slate-500">Active copies</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{compactNumber.format(totalVolume)}</p><p className="mt-1 text-xs text-slate-500">Assigned to active titles</p></article><article className={panelClass}><p className="text-xs font-semibold text-slate-500">All physical-copy records</p><p className="mt-2 text-3xl font-bold text-slate-950 dark:text-white">{compactNumber.format(catalogue.totalPhysicalCopies)}</p><p className="mt-1 text-xs text-slate-500">{compactNumber.format(catalogue.archivedPhysicalCopies)} attached to archived titles</p></article></div>
      </section>}

      {reportType === 'fines' && <section className="grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)]">
        <article className={panelClass}>
          <div><h2 className="text-base font-bold text-neutral-950 dark:text-white">Fine balance</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Collected versus outstanding amounts in LKR</p></div>
          <div className="mt-3 h-80" role="img" aria-label="Bar chart of collected and outstanding fine amounts"><ResponsiveContainer width="100%" height="100%"><BarChart data={finesSplit.length ? finesSplit : [{ name: 'No fine records', value: 0 }]} margin={{ top: 12, right: 16, left: 4, bottom: 8 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" /><XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: '#475569', fontSize: 12 }} /><YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} /><Tooltip formatter={(value: number) => [`LKR ${Number(value).toFixed(2)}`, 'Balance']} /><Bar dataKey="value" name="LKR" radius={[7, 7, 0, 0]} maxBarSize={72}>{finesSplit.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? '#10b981' : '#4f46e5'} />)}</Bar></BarChart></ResponsiveContainer></div>
        </article>
        <article className={panelClass}>
          <div><h2 className="text-base font-bold text-neutral-950 dark:text-white">Collection status</h2><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Totals summarized from the fines ledger</p></div>
          {finesSplit.length ? <div className="h-56 pt-2" role="img" aria-label="Pie chart of collected and outstanding fines"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={finesSplit} dataKey="value" nameKey="name" innerRadius={52} outerRadius={82} paddingAngle={4} stroke="none">{finesSplit.map((entry, index) => <Cell key={entry.name} fill={index === 0 ? '#10b981' : '#4f46e5'} />)}</Pie><Tooltip formatter={(value: number) => `LKR ${Number(value).toFixed(2)}`} /><Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer></div> : <div className="flex h-56 flex-col items-center justify-center text-center"><CircleDollarSign className="h-8 w-8 text-neutral-300" /><p className="mt-2 text-sm font-semibold text-neutral-700 dark:text-neutral-200">No fines recorded yet</p></div>}
          <div className="space-y-2"><div className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2.5 dark:bg-emerald-950/40"><span className="text-xs font-semibold text-emerald-800 dark:text-emerald-200">Collected</span><span className="font-mono text-sm font-bold text-emerald-800 dark:text-emerald-200">LKR {totalPaidFines.toFixed(2)}</span></div><div className="flex items-center justify-between rounded-xl bg-rose-50 px-3 py-2.5 dark:bg-rose-950/40"><span className="text-xs font-semibold text-rose-800 dark:text-rose-200">Outstanding</span><span className="font-mono text-sm font-bold text-rose-800 dark:text-rose-200">LKR {totalUnpaidFines.toFixed(2)}</span></div></div>
        </article>
      </section>}

      <p className="flex items-center gap-2 px-1 text-[11px] text-neutral-500 dark:text-neutral-400"><Activity className="h-3.5 w-3.5" />Charts reflect records currently loaded in this workspace. Exported totals are suitable for review, not an official financial statement.</p>
    </div>
  );
};
