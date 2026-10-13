import type { InventoryItem } from '../types';

const discrepantStatuses = new Set<InventoryItem['status']>([
  'Missing Copy',
  'Damaged Found',
  'missing',
  'damaged',
  'misplaced',
]);

const nonNegativeFinite = (value: number): number => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? Math.max(0, numericValue) : 0;
};

export const getInventoryAuditMetrics = (inventory: InventoryItem[]) => {
  const totalExpected = inventory.reduce((total, item) => total + nonNegativeFinite(item.expectedCopies), 0);
  const totalActual = inventory.reduce((total, item) => total + nonNegativeFinite(item.actualCopies), 0);
  const totalVariance = inventory.reduce((total, item) => {
    const expected = Number(item.expectedCopies);
    const actual = Number(item.actualCopies);
    return Number.isFinite(expected) && Number.isFinite(actual)
      ? total + Math.abs(actual - expected)
      : total;
  }, 0);
  const hasInvalidQuantities = inventory.some((item) =>
    !Number.isFinite(Number(item.expectedCopies)) || !Number.isFinite(Number(item.actualCopies))
  );
  const flaggedCount = inventory.filter((item) => {
    const expected = Number(item.expectedCopies);
    const actual = Number(item.actualCopies);
    return !Number.isFinite(expected)
      || !Number.isFinite(actual)
      || actual !== expected
      || discrepantStatuses.has(item.status);
  }).length;
  const verifiedCount = inventory.filter((item) =>
    item.status === 'Audited - Match' || item.status === 'Verified'
  ).length;

  return {
    totalExpected,
    totalActual,
    flaggedCount,
    verifiedCount,
    reconciliationPercent: totalExpected > 0 && !hasInvalidQuantities
      ? Math.round(Math.max(0, 1 - totalVariance / totalExpected) * 100)
      : null,
  };
};
