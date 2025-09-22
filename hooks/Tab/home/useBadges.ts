import { db } from '@/scripts/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useEffect, useMemo, useState } from 'react';

export type BadgeItem = { id: string; title: string; icon: string; unlockedAt?: any | null };

export function useBadges(uid?: string | null) {
  const [count, setCount] = useState(0);
  const [latest, setLatest] = useState<BadgeItem[]>([]);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(collection(db, 'users', uid, 'badges'), (qs) => {
      let c = 0; const list: BadgeItem[] = [];
      qs.forEach((d) => {
        const data = d.data() as any;
        if (data?.completed) {
          c++;
          list.push({ id: d.id, title: data.title ?? d.id, icon: data.icon ?? 'medal-outline', unlockedAt: data.unlockedAt ?? null });
        }
      });
      list.sort((a, b) => ((b.unlockedAt?.seconds ?? 0) - (a.unlockedAt?.seconds ?? 0)));
      setCount(c);
      setLatest(list.slice(0, 8));
    });
    return unsub;
  }, [uid]);

  const memoLatest = useMemo(() => latest, [latest]);
  return { badgeCount: count, latestBadges: memoLatest };
}
