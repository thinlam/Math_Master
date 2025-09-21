import { db } from '@/scripts/firebase';
import { collection, doc, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useMemo, useState } from 'react';

export type Ann = { id: string; title: string; body?: string | null; createdAt?: any | null };

export function useAnnouncements(uid?: string | null) {
  const [annList, setAnnList] = useState<Ann[]>([]);
  const [lastSeenAnn, setLastSeenAnn] = useState<Date | null>(null);
  const [bannerAnn, setBannerAnn] = useState<Ann | null>(null);
  const [initialLoaded, setInitialLoaded] = useState(false);

  useEffect(() => {
    if (!uid) return;
    const unsub = onSnapshot(doc(db, 'users', uid), (d) => {
      const v = d.get('lastSeenAnn');
      setLastSeenAnn(v?.toDate?.() || null);
    });
    return unsub;
  }, [uid]);

  useEffect(() => {
    const qAll = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qAll, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Ann[];
      setAnnList(items);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q1 = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q1, (snap) => {
      const latest = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))[0] as Ann | undefined;
      if (!latest) { setInitialLoaded(true); return; }
      if (!initialLoaded) { setInitialLoaded(true); return; }
      const created = (latest.createdAt as any)?.toDate?.() || new Date();
      if (!lastSeenAnn || created > lastSeenAnn) {
        setBannerAnn(latest);
        const t = setTimeout(() => setBannerAnn(null), 5000);
        return () => clearTimeout(t);
      }
    });
    return unsub;
  }, [initialLoaded, lastSeenAnn]);

  const unreadCount = useMemo(() => {
    if (!lastSeenAnn) return annList.length;
    return annList.filter((a) => ((a.createdAt as any)?.toDate?.() || new Date(0)) > lastSeenAnn).length;
  }, [annList, lastSeenAnn]);

  const markAllSeen = useCallback(async () => {
    if (!uid) return;
    try { await updateDoc(doc(db, 'users', uid), { lastSeenAnn: new Date() }); } catch {}
  }, [uid]);

  return { annList, unreadCount, bannerAnn, markAllSeen };
}
