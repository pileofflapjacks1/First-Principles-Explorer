export const PRO_MONTHLY_IMAGE_LIMIT = 100;

export function getMonthlyLimit(isPro: boolean): number {
  return isPro ? PRO_MONTHLY_IMAGE_LIMIT : 0;
}

export function isStaleResetWindow(resetAt: Date): boolean {
  const now = new Date();
  return (
    resetAt.getUTCMonth() !== now.getUTCMonth() ||
    resetAt.getUTCFullYear() !== now.getUTCFullYear()
  );
}
