import type { FineRecord } from '../types';

const monthIndexFromDate = (value?: string): number | null => {
  if (!value) return null;

  // Preserve the calendar date recorded by the app for ISO date and timestamp strings.
  const isoDate = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoDate) {
    const year = Number(isoDate[1]);
    const month = Number(isoDate[2]);
    const day = Number(isoDate[3]);
    const parsed = new Date(year, month - 1, day);
    if (month < 1 || month > 12 || parsed.getDate() !== day) return null;
    return year * 12 + month - 1;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getFullYear() * 12 + parsed.getMonth();
};

export interface FineCollectionMetrics {
  currentMonthTotal: number;
  previousMonthTotal: number;
  percentageChange: number | null;
  trend: 'up' | 'down' | 'neutral';
}

export const getFineCollectionMetrics = (
  fines: FineRecord[],
  now: Date = new Date(),
): FineCollectionMetrics => {
  const currentMonthIndex = now.getFullYear() * 12 + now.getMonth();
  const previousMonthIndex = currentMonthIndex - 1;
  let currentMonthTotal = 0;
  let previousMonthTotal = 0;

  fines.forEach((fine) => {
    if (fine.status !== 'paid') return;
    const amount = Number(fine.amount);
    const paidMonthIndex = monthIndexFromDate(fine.paidDate);
    if (!Number.isFinite(amount) || paidMonthIndex === null) return;
    if (paidMonthIndex === currentMonthIndex) currentMonthTotal += amount;
    if (paidMonthIndex === previousMonthIndex) previousMonthTotal += amount;
  });

  const percentageChange = previousMonthTotal > 0
    ? ((currentMonthTotal - previousMonthTotal) / previousMonthTotal) * 100
    : null;

  return {
    currentMonthTotal,
    previousMonthTotal,
    percentageChange,
    trend: percentageChange === null
      ? 'neutral'
      : percentageChange > 0
        ? 'up'
        : percentageChange < 0
          ? 'down'
          : 'neutral',
  };
};
