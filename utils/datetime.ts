import { Timestamp } from 'firebase/firestore';

export function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  const d = new Date(ts);
  return isNaN(d.getTime()) ? null : d;
}

export function fmt(dt: Date | null) {
  if (!dt) return '—';
  try {
    return dt.toLocaleString('vi-VN', { hour12: false });
  } catch {
    return dt.toISOString();
  }
}
