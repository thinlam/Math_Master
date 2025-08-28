// app/providers/EntitlementsProvider.tsx
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import {
    collection,
    doc,
    limit,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

type Sub = {
  id: string;
  uid: string;
  planId?: string;
  status?: 'active' | 'pending' | 'cancelled' | 'expired';
  startedAt?: Timestamp | Date | null;
  expiresAt?: Timestamp | Date | null;
};

type Ctx = {
  loading: boolean;
  uid: string | null;
  role: string;               // 'free' | 'premium' | ...
  premiumFlag: boolean;       // true nếu users/{uid}.premium || roles.premium
  activeSub: Sub | null;      // gói đang active/pending
  history: Sub[];             // lịch sử subs (mới -> cũ)
  refreshClaims: () => Promise<void>;
};

const EntitlementsContext = createContext<Ctx>({
  loading: true,
  uid: null,
  role: 'free',
  premiumFlag: false,
  activeSub: null,
  history: [],
  refreshClaims: async () => {},
});

function toDateSafe(v: any): Date | null {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v instanceof Timestamp) return v.toDate();
  return null;
}

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const [uid, setUid] = useState<string | null>(auth.currentUser?.uid ?? null);
  const [loading, setLoading] = useState(true);

  // user doc
  const [role, setRole] = useState<'free' | string>('free');
  const [premiumFlag, setPremiumFlag] = useState(false);

  // subs
  const [activeSub, setActiveSub] = useState<Sub | null>(null);
  const [history, setHistory] = useState<Sub[]>([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUid(u?.uid ?? null);
    });
    return () => unsubAuth();
  }, []);

  useEffect(() => {
    if (!uid) {
      setRole('free');
      setPremiumFlag(false);
      setActiveSub(null);
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);

    // 1) Listen user doc (role/premium flags)
    const unsubUser = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        const d = snap.data() || {};
        const r = d.role || 'free';
        const p =
          !!d.premium ||
          !!(d.roles && typeof d.roles === 'object' && d.roles.premium === true);
        setRole(r);
        setPremiumFlag(p);
        setLoading(false);
      },
      () => setLoading(false)
    );

    // 2) Listen subscriptions (real-time)
    const qy = query(
      collection(db, 'subscriptions'),
      where('uid', '==', uid),
      orderBy('startedAt', 'desc'),
      limit(50)
    );
    const unsubSubs = onSnapshot(qy, (snap) => {
      const arr: Sub[] = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
      setHistory(arr);
      const current = arr.find((s) => s.status === 'active' || s.status === 'pending');
      setActiveSub(current ?? null);
    });

    return () => {
      unsubUser();
      unsubSubs();
    };
  }, [uid]);

  const refreshClaims = async () => {
    try {
      await auth.currentUser?.getIdToken(true);
    } catch {}
  };

  const value = useMemo<Ctx>(
    () => ({
      loading,
      uid,
      role,
      premiumFlag,
      activeSub,
      history,
      refreshClaims,
    }),
    [loading, uid, role, premiumFlag, activeSub, history]
  );

  return (
    <EntitlementsContext.Provider value={value}>
      {children}
    </EntitlementsContext.Provider>
  );
}

export function useEntitlements() {
  return useContext(EntitlementsContext);
}
