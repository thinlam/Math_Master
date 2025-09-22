// types/admin.ts
import { Timestamp } from 'firebase/firestore';

/** Item dùng cho các list “gần đây” ở Admin */
export type RecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  createdAt?: any; // Timestamp | Date | string | null
  type: 'user' | 'lesson' | 'report' | 'subscription';
  role?: 'admin' | 'premium' | 'user' | string;

  // Subscriptions
  planId?: string;
  status?: 'active' | 'cancelled' | 'expired' | string;
  uid?: string;
  startedAt?: any;
  expiresAt?: any;
};

/* -------- Utils ngày giờ dùng chung -------- */
function safeDate(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  if (typeof ts === 'string') {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/** Định dạng “HH:mm • dd/MM/yyyy” */
export function formatDate(tsLike: any) {
  const d = safeDate(tsLike);
  if (!d) return '—';
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}
