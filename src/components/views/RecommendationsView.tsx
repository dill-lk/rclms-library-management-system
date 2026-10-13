import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  FlaskConical,
  Lightbulb,
  ShieldCheck,
} from 'lucide-react';

const recommendations = [
  {
    number: '01',
    priority: 'High priority',
    title: 'Keep stock-audit empty and discrepancy states accurate',
    status: 'Included in this build',
    statusTone: 'green',
    icon: CheckCircle2,
    summary: 'When there are no inventory rows, show an explicit empty state. Never calculate a percentage from a zero denominator, and count flags from actual discrepancies.',
    nextStep: 'After adding test stock, verify a clean match and a deliberate quantity mismatch.',
  },
  {
    number: '02',
    priority: 'High priority',
    title: 'Keep access roles distinct from job titles and departments',
    status: 'Display clarified; assignments preserved',
    statusTone: 'amber',
    icon: ShieldCheck,
    summary: 'The staff table now labels the permission-bearing value as “Access role” and the descriptive value as “Designation / department”. Missing designations use a role-specific label.',
    nextStep: 'Review each account’s intended role and verify Supabase row-level security and protected actions; no user role was changed by this update.',
  },
  {
    number: '03',
    priority: 'Medium priority',
    title: 'Make the fines trend agree with the amount shown',
    status: 'Included in this build',
    statusTone: 'green',
    icon: CheckCircle2,
    summary: 'The card now totals paid fines for the current calendar month and compares them with the previous month using payment dates. It shows a neutral dash when a percentage baseline does not exist.',
    nextStep: 'Check zero, missing-date, and non-zero prior-month cases against sample payments.',
  },
  {
    number: '04',
    priority: 'Medium priority',
    title: 'Validate populated workflows and reports with test records',
    status: 'Still to validate',
    statusTone: 'blue',
    icon: FlaskConical,
    summary: 'The reviewed account had no books, copies, members, or loans, so real populated transactions and report totals could not be confirmed.',
    nextStep: 'In a non-production environment, exercise issue/return, reservations, overdue fines, stock audit, date-range reports, and CSV exports with representative records.',
  },
];

const statusClasses: Record<string, string> = {
  green: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300',
  amber: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300',
  blue: 'border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/50 dark:text-blue-300',
};

export const RecommendationsView: React.FC = () => (
  <div className="space-y-6">
    <header className="rounded-2xl border border-neutral-800 bg-neutral-950 p-6 text-white shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-white/10 p-2.5 text-amber-300">
          <Lightbulb className="h-5 w-5" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">Review follow-up</p>
          <h2 className="mt-1 text-xl font-bold">Recommendations</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-neutral-300">
            Prioritized improvements from the recent RCLMS review. Calculation and display fixes are reflected in this source build; populated end-to-end workflows still need test data.
          </p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">2 calculation fixes included</span>
        <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5">Role labels clarified</span>
        <span className="rounded-full border border-amber-300/30 bg-amber-300/10 px-3 py-1.5 text-amber-200">Populated-workflow validation remains</span>
      </div>
    </header>

    <div className="grid gap-4 xl:grid-cols-2">
      {recommendations.map((recommendation) => {
        const Icon = recommendation.icon;
        return (
          <article key={recommendation.number} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-neutral-100 text-neutral-700 dark:bg-slate-800 dark:text-neutral-200">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">{recommendation.priority} · {recommendation.number}</p>
                  <h3 className="mt-1 text-sm font-bold text-neutral-900 dark:text-white">{recommendation.title}</h3>
                </div>
              </div>
              <span className={`inline-flex w-fit items-center rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClasses[recommendation.statusTone]}`}>
                {recommendation.status}
              </span>
            </div>
            <p className="mt-4 text-xs leading-relaxed text-neutral-600 dark:text-neutral-300">{recommendation.summary}</p>
            <div className="mt-4 flex gap-2 rounded-xl bg-neutral-50 p-3 text-xs leading-relaxed text-neutral-700 dark:bg-slate-800/70 dark:text-neutral-300">
              {recommendation.number === '04' ? <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-blue-600 dark:text-blue-300" /> : recommendation.number === '02' ? <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" /> : <ClipboardCheck className="mt-0.5 h-4 w-4 shrink-0 text-neutral-500" />}
              <span><strong className="font-semibold">Next step: </strong>{recommendation.nextStep}</span>
            </div>
          </article>
        );
      })}
    </div>

    <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
      Review limitation: this build was not connected to or deployed on the live account, and it does not seed or change production records. Confirm data-driven reports and backend authorization in a safe test environment before relying on them.
    </p>
  </div>
);
