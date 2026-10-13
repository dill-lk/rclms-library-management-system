import React, { useMemo } from 'react';
import { AlertTriangle, ArrowRight, BellRing, CalendarClock, CheckCircle2 } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';
import { BetaBadge } from '../common/BetaBadge';

const dayStart = (value: Date) => new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

export const RemindersView: React.FC = () => {
  const { circulation, setActiveTab, setSelectedMemberId } = useLibrary();
  const now = new Date();
  const today = dayStart(now);
  const reminders = useMemo(() => circulation
    .filter((loan) => ['active', 'overdue', 'renewed'].includes(loan.status))
    .map((loan) => {
      const due = new Date(`${loan.dueDate.slice(0, 10)}T00:00:00`);
      const days = Number.isNaN(due.getTime()) ? null : Math.round((dayStart(due) - today) / 86_400_000);
      return { loan, days };
    })
    .filter((entry) => entry.days !== null && entry.days <= 7)
    .sort((a, b) => (a.days ?? 0) - (b.days ?? 0)), [circulation, today]);
  const overdue = reminders.filter(({ days }) => (days ?? 0) < 0);
  const dueSoon = reminders.filter(({ days }) => (days ?? 0) >= 0);

  const openReturns = () => setActiveTab('returns');
  const openMemberLoans = (memberId: string) => {
    setSelectedMemberId(memberId);
    setActiveTab('member_profile');
  };
  const list = (items: typeof reminders, isOverdue: boolean) => items.length ? (
    <ul className="divide-y divide-slate-100 dark:divide-slate-800">
      {items.map(({ loan, days }) => (
        <li key={loan.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{loan.bookTitle}</p>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{loan.memberName} · copy <span className="font-mono">{loan.copyBarcode}</span></p>
            <p className="mt-1 text-xs text-slate-500">Due {loan.dueDate}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${isOverdue ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-200' : 'bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200'}`}>
              {isOverdue ? `${Math.abs(days ?? 0)} day${Math.abs(days ?? 0) === 1 ? '' : 's'} overdue` : days === 0 ? 'Due today' : `Due in ${days} day${days === 1 ? '' : 's'}`}
            </span>
            <button type="button" onClick={() => openMemberLoans(loan.memberId)} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Loan options <ArrowRight className="h-3.5 w-3.5" /></button>
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <div className="flex items-center gap-3 px-5 py-10 text-sm text-slate-500 dark:text-slate-400"><CheckCircle2 className="h-5 w-5 text-emerald-600" />Nothing to follow up in this group.</div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 rounded-2xl border border-library-border bg-library-surface p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-library-muted"><BellRing className="h-4 w-4" /> Circulation follow-up <BetaBadge /></p>
          <h1 className="mt-2 text-2xl font-bold text-library-main">Overdue & renewal reminders</h1>
          <p className="mt-1 text-sm text-library-muted">In-app reminders are generated from open loan records and refresh with library data. No email or SMS is sent automatically.</p>
        </div>
        <button type="button" onClick={openReturns} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-library-action px-4 text-xs font-bold text-white">Open returns desk <ArrowRight className="h-4 w-4" /></button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/20"><div className="flex items-center gap-2 text-rose-800 dark:text-rose-200"><AlertTriangle className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wide">Overdue</span></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{overdue.length}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Loans past their due date</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/20"><div className="flex items-center gap-2 text-amber-900 dark:text-amber-200"><CalendarClock className="h-4 w-4" /><span className="text-xs font-bold uppercase tracking-wide">Due in the next 7 days</span></div><p className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">{dueSoon.length}</p><p className="mt-1 text-xs text-slate-600 dark:text-slate-400">Renewal or return follow-up</p></div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Overdue follow-up</h2></div>{list(overdue, true)}</section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"><div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800"><h2 className="text-sm font-bold text-slate-900 dark:text-white">Due soon / renewal follow-up</h2></div>{list(dueSoon, false)}</section>
    </div>
  );
};
