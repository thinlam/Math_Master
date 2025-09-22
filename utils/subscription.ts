// utils/subscription.ts
export function computeIsPremium(data: any): boolean {
  if (!data) return false;
  if (data.role === 'premium') return true;
  if (data.premium === true) return true;

  try {
    const until =
      data?.premiumUntil?.toDate?.() ??
      (data?.premiumUntil instanceof Date ? data.premiumUntil : null);
    if (until && until.getTime() > Date.now()) return true;
  } catch {}

  const s = String(data?.stripe?.subscriptionStatus || '').toLowerCase();
  if (['active', 'trialing', 'past_due'].includes(s)) return true;

  return false;
}
