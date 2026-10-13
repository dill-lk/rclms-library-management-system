import React from 'react';
import { BookStatus, CirculationStatus, ReservationStatus, FineStatus, MemberStatus } from '../../types';

interface StatusBadgeProps {
  status:
    | BookStatus
    | CirculationStatus
    | ReservationStatus
    | FineStatus
    | MemberStatus
    | 'Audited - Match'
    | 'Missing Copy'
    | 'Damaged Found'
    | 'Pending Review'
    | 'Verified'
    | 'student'
    | 'teacher'
    | 'staff'
    | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  size = 'md',
  className = '',
}) => {
  const normStatus = (status || '').toLowerCase();

  let styles = 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700';
  let dotColor = 'bg-gray-400';
  let label = status;

  if (normStatus === 'available' || normStatus === 'active' || normStatus === 'paid' || normStatus === 'audited - match' || normStatus === 'verified') {
    styles = 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60';
    dotColor = 'bg-emerald-500';
    label = normStatus === 'active' ? 'Active' : normStatus === 'paid' ? 'Paid' : normStatus === 'available' ? 'Available' : 'Verified';
  } else if (normStatus === 'borrowed') {
    styles = 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800/60';
    dotColor = 'bg-blue-500';
    label = 'Borrowed';
  } else if (normStatus === 'overdue' || normStatus === 'lost' || normStatus === 'unpaid' || normStatus === 'missing copy' || normStatus === 'suspended') {
    styles = 'bg-red-50 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800/60 font-semibold';
    dotColor = 'bg-red-500 animate-pulse';
    label = normStatus === 'overdue' ? 'Overdue' : normStatus === 'unpaid' ? 'Unpaid' : normStatus === 'lost' ? 'Lost' : normStatus === 'missing copy' ? 'Missing' : 'Suspended';
  } else if (normStatus === 'reserved' || normStatus === 'ready') {
    styles = 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800/60';
    dotColor = 'bg-purple-500';
    label = normStatus === 'ready' ? 'Ready for Pickup' : 'Reserved';
  } else if (normStatus === 'damaged' || normStatus === 'in_repair' || normStatus === 'damaged found') {
    styles = 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    dotColor = 'bg-amber-500';
    label = normStatus === 'in_repair' ? 'In Repair' : 'Damaged';
  } else if (normStatus === 'pending' || normStatus === 'pending review') {
    styles = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    dotColor = 'bg-amber-400';
    label = 'Pending';
  } else if (normStatus === 'returned' || normStatus === 'waived' || normStatus === 'completed' || normStatus === 'graduated') {
    styles = 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
    dotColor = 'bg-slate-400';
    label = normStatus === 'waived' ? 'Waived' : normStatus === 'returned' ? 'Returned' : normStatus === 'completed' ? 'Completed' : 'Graduated';
  } else if (normStatus === 'student') {
    styles = 'bg-maroon-50 text-maroon-800 border-maroon-200 dark:bg-maroon-950/40 dark:text-maroon-300 dark:border-maroon-800/60';
    dotColor = 'bg-maroon-600';
    label = 'Student';
  } else if (normStatus === 'teacher') {
    styles = 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60';
    dotColor = 'bg-amber-600';
    label = 'Teacher';
  } else if (normStatus === 'staff') {
    styles = 'bg-cyan-50 text-cyan-800 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800/60';
    dotColor = 'bg-cyan-600';
    label = 'Staff';
  }

  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3 py-1.5 gap-2 font-medium',
  }[size];

  return (
    <span
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${styles} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      <span>{label}</span>
    </span>
  );
};
