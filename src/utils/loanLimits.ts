type BorrowerLimitInput = {
  type: string;
  maxBorrowLimit?: number | null;
};

/**
 * The live system setting is the authoritative maximum for student loans.
 * Other member types continue to use their per-member borrowing allowance.
 */
export const getEffectiveBorrowLimit = (
  member: BorrowerLimitInput,
  maxStudentBooks?: number | null
): number => {
  const configuredStudentLimit = Number(maxStudentBooks);
  if (member.type === 'student' && Number.isFinite(configuredStudentLimit) && configuredStudentLimit >= 1) {
    return Math.floor(configuredStudentLimit);
  }

  const memberLimit = Number(member.maxBorrowLimit);
  return Number.isFinite(memberLimit) && memberLimit >= 1 ? Math.floor(memberLimit) : 1;
};
