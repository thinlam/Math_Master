// services/subscriptions.ts
import { db } from '@/scripts/firebase';
import {
    addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy,
    query, serverTimestamp, Timestamp, updateDoc, where
} from 'firebase/firestore';

/* ============================
   Types & constants
   ============================ */
export type PlanId =
  | 'premium1m'
  | 'premium3m'
  | 'premium6m'
  | 'premium12m'
  | 'premium1y'; // đồng nghĩa 12 tháng

export type Provider = 'iap' | 'momo' | 'zalopay' | 'vnpay' | 'sandbox';

export type Subscription = {
  id?: string;
  uid: string;
  planId: PlanId;
  provider?: Provider;
  status: 'active' | 'cancelled' | 'expired';
  startedAt: Timestamp;
  expiresAt: Timestamp;
  createdBy?: string;
  note?: string;
  updatedAt?: Timestamp;
};

const COL = 'subscriptions';

const PLAN_MONTHS: Record<PlanId, number> = {
  premium1m: 1,
  premium3m: 3,
  premium6m: 6,
  premium12m: 12,
  premium1y: 12,
};

/* ============================
   Helpers
   ============================ */
function addMonths(from: Date, months: number) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Tính expiresAt theo planId (từ một mốc start) */
export function calcExpires(start: Date, planId: PlanId) {
  const months = PLAN_MONTHS[planId];
  if (!months) throw new Error('Plan không hợp lệ');
  return Timestamp.fromDate(addMonths(start, months));
}

/** Đồng bộ role user theo số gói active còn lại */
export async function syncUserRole(uid: string) {
  const q = query(
    collection(db, COL),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    limit(1)
  );
  const snap = await getDocs(q);
  await updateDoc(doc(db, 'users', uid), {
    role: snap.empty ? 'user' : 'premium',
    updatedAt: serverTimestamp(),
  });
}

/* ============================
   CRUD cơ bản
   ============================ */

/** Tạo/cấp sub mới cho user (bắt đầu từ hiện tại, KHÔNG cộng dồn) */
export async function createSubscription(input: {
  uid: string;
  planId: PlanId;
  provider?: Provider;
  createdBy?: string; // admin uid nếu cần
  note?: string;
}) {
  const now = new Date();
  const startedAt = Timestamp.fromDate(now);
  const expiresAt = calcExpires(now, input.planId);

  const payload: Omit<Subscription, 'id'> = {
    uid: input.uid,
    planId: input.planId,
    provider: input.provider ?? 'sandbox',
    status: 'active',
    startedAt,
    expiresAt,
    createdBy: input.createdBy,
    note: input.note,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const ref = await addDoc(collection(db, COL), payload);
  await syncUserRole(input.uid);
  return { id: ref.id, ...payload };
}

/** Lấy sub active hiện tại (mới nhất) của 1 user */
export async function getActiveSubscriptionByUid(uid: string) {
  const qy = query(
    collection(db, COL),
    where('uid', '==', uid),
    where('status', '==', 'active'),
    orderBy('expiresAt', 'desc'),
    limit(1),
  );
  const snap = await getDocs(qy);
  if (snap.empty) return null;
  const doc0 = snap.docs[0];
  return { id: doc0.id, ...(doc0.data() as Subscription) };
}

/** List subscriptions (có filter) */
export async function listSubscriptions(opts?: {
  uid?: string;
  status?: Subscription['status'];
  limitN?: number;
}) {
  let qy = query(collection(db, COL), orderBy('startedAt', 'desc'));
  if (opts?.uid)    qy = query(qy, where('uid', '==', opts.uid));
  if (opts?.status) qy = query(qy, where('status', '==', opts.status));
  if (opts?.limitN) qy = query(qy, limit(opts.limitN));
  const snap = await getDocs(qy);
  return snap.docs.map(d => ({ id: d.id, ...(d.data() as Subscription) }));
}

/** Đọc 1 sub */
export async function getSubscriptionById(id: string) {
  const ref = doc(db, COL, id);
  const data = await getDoc(ref);
  if (!data.exists()) return null;
  return { id: data.id, ...(data.data() as Subscription) };
}

/** Update sub */
export async function updateSubscription(id: string, patch: Partial<Subscription>) {
  const ref = doc(db, COL, id);
  await updateDoc(ref, { ...patch, updatedAt: serverTimestamp() });
}

/** Xóa sub */
export async function deleteSubscription(id: string) {
  const sub = await getSubscriptionById(id);
  const ref = doc(db, COL, id);
  await deleteDoc(ref);
  if (sub) await syncUserRole(sub.uid);
}

/* ============================
   Business actions
   ============================ */

/**
 * grantPremium:
 * - Nếu user đang có gói active → cộng dồn từ ngày hết hạn hiện tại.
 * - Nếu không → tính từ "bây giờ".
 * - Ghi log vào `subscriptions`, set users/{uid}.role='premium'.
 */
export async function grantPremium(
  uid: string,
  planId: PlanId,
  provider: Provider = 'iap',
  createdBy?: string,
  note: string = 'grant via app'
) {
  const now = new Date();

  // Tìm gói active mới nhất để cộng dồn
  const latest = await getActiveSubscriptionByUid(uid);
  const startFrom = latest
    ? Math.max(latest.expiresAt.toDate().getTime(), now.getTime())
    : now.getTime();

  const startedAt = Timestamp.fromDate(now);
  const expiresAt = calcExpires(new Date(startFrom), planId);

  const payload: Omit<Subscription, 'id'> = {
    uid,
    planId,
    provider,
    status: 'active',
    startedAt,
    expiresAt,
    note,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  };

  const ref = await addDoc(collection(db, COL), payload);
  await syncUserRole(uid);
  return { id: ref.id, ...payload };
}

/** Đánh dấu hủy gia hạn (không xóa) */
export async function cancelSubscription(id: string) {
  const sub = await getSubscriptionById(id);
  if (!sub) return;
  await updateSubscription(id, { status: 'cancelled' });
  await syncUserRole(sub.uid);
}

/** Đánh dấu hết hạn thủ công (trường hợp xử lý tay) */
export async function markExpired(id: string) {
  const sub = await getSubscriptionById(id);
  if (!sub) return;
  await updateSubscription(id, { status: 'expired' });
  await syncUserRole(sub.uid);
}
