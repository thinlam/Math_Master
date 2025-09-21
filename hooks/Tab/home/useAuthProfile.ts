import { auth, db } from '@/scripts/firebase';
import { diffDaysLocal, localDayString, VN_TZ } from '@/utils/dateVN';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type BadgeItem = { id: string; title: string; icon: string; unlockedAt?: FirebaseFirestore.Timestamp | null };
export type AppRole = 'user' | 'premium' | 'admin';
export type UserProfile = {
  uid: string; name: string; email: string; level: string | null;
  points: number; badges: BadgeItem[]; streak: number;
  photoURL?: string | null; coins: number; role?: AppRole;
};

async function ensureDailyStreak(uid: string) {
  const userRef = doc(db, 'users', uid);
  const today = localDayString(VN_TZ);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? (snap.data() as any) : {};
    let streak = Number(data?.streak ?? 0);
    const last: string | undefined = data?.lastActiveLocalDay;

    if (last === today) return;

    if (!last) {
      streak = Math.max(1, streak || 0) || 1;
    } else {
      const d = diffDaysLocal(last, today);
      if (d === 1) streak = (streak || 0) + 1;
      else if (d > 1) streak = 1;
    }

    tx.set(userRef, {
      streak,
      lastActiveLocalDay: today,
      lastActiveAt: serverTimestamp(),
    }, { merge: true });
  });
}

export function useAuthProfile() {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setFirebaseUser(u);
    });
    return unsub;
  }, []);

  const fetchProfile = useCallback(async (u: User) => {
    const ref = doc(db, 'users', u.uid);
    const snap = await getDoc(ref);
    const data = snap.exists() ? (snap.data() as any) : {};
    const p: UserProfile = {
      uid: u.uid,
      name: u.displayName || data.name || 'User',
      email: u.email || data.email || 'user@example.com',
      photoURL: (data.photoURL as string) ?? u.photoURL ?? null,
      level: data.level ?? null,
      points: typeof data.points === 'number' ? data.points : 0,
      streak: typeof data.streak === 'number' ? data.streak : 0,
      badges: [],
      coins: typeof data.coins === 'number' ? data.coins : 0,
      role: (data.role as any) ?? 'user',
    };
    setProfile(p);
  }, []);

  useEffect(() => {
    let canceled = false;
    (async () => {
      try {
        if (!firebaseUser) { setLoading(false); return; }
        await ensureDailyStreak(firebaseUser.uid);
        if (!canceled) await fetchProfile(firebaseUser);
      } finally {
        if (!canceled) setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, [firebaseUser, fetchProfile]);

  const initials = useMemo(() => {
    const n = profile?.name?.trim() || '';
    const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2) || 'U';
  }, [profile?.name]);

  return { firebaseUser, profile, setProfile, loading, initials };
}
