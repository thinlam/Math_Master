import { db } from '@/scripts/firebase';
import { collection, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { useEffect, useState } from 'react';

export function useSubscriptions(uid?: string | null) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (!uid) return;
    const now = new Date();
    const colRef = collection(db, 'users', uid, 'subscriptions');
    const q = query(colRef, where('status', 'in', ['active', 'trialing']), orderBy('createdAt', 'desc'), limit(3));
    const unsub = onSnapshot(q, (qs) => {
      let a = false;
      qs.forEach((d) => {
        const end = d.data()?.current_period_end?.toDate?.() as Date | undefined;
        if (!end || end > now) a = true;
      });
      setActive(a);
    });
    return unsub;
  }, [uid]);
  return { subActive: active };
}
