/* ---------- Imports ---------- */
import { db } from '@/scripts/firebase';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  Timestamp,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* Styles + Subcomponents */
import QuickAction from '@/components/admin/home/QuickAction';
import RecentListSimple from '@/components/admin/home/RecentListSimple';
import Section from '@/components/admin/home/Section';
import { AdminHomeStyles as s } from '@/components/style/admin/AdminHomeStyles';

/* ---------- Types ---------- */
export type RecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  createdAt?: any;
  type: 'user' | 'lesson' | 'report' | 'subscription';
  role?: 'admin' | 'premium' | 'user' | string;
  planId?: string;
  status?: 'active' | 'cancelled' | 'expired' | string;
  uid?: string;
  startedAt?: any;
  expiresAt?: any;
};

type QuickStat = {
  key: 'users' | 'lessons' | 'reports' | 'subscriptions';
  label: string;
  value: number;
  icon: React.ComponentProps<typeof Ionicons>['name'] | React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  bg: string;
  iconLib?: 'ion' | 'mci';
};

/* ---------- Utils: chuẩn hoá ngày ---------- */
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

export function formatDate(tsLike: any) {
  const d = safeDate(tsLike);
  if (!d) return '—';
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1,
  ).padStart(2, '0')}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}

/* ---------- Main Component ---------- */
export default function AdminHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState({
    users: 0,
    lessons: 0,
    reports: 0,
    subscriptions: 0,
  });

  const [recentUsers, setRecentUsers] = useState<RecentItem[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentItem[]>([]);
  const [recentReports, setRecentReports] = useState<RecentItem[]>([]);
  const [recentSubs, setRecentSubs] = useState<RecentItem[]>([]);

  /* ---------- Load Data ---------- */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersSnap, lessonsSnap, reportsSnap, subsSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'lessons')),
        getCountFromServer(collection(db, 'reports')),
        getCountFromServer(collection(db, 'subscriptions')),
      ]);

      setStats({
        users: usersSnap.data().count,
        lessons: lessonsSnap.data().count,
        reports: reportsSnap.data().count,
        subscriptions: subsSnap.data().count,
      });

      const recentUsersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
      const recentLessonsQ = query(collection(db, 'lessons'), orderBy('createdAt', 'desc'), limit(5));
      const recentReportsQ = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(5));
      const recentSubsQ = query(collection(db, 'subscriptions'), orderBy('startedAt', 'desc'), limit(5));

      const [uDocs, lDocs, rDocs, sDocs] = await Promise.all([
        getDocs(recentUsersQ),
        getDocs(recentLessonsQ),
        getDocs(recentReportsQ),
        getDocs(recentSubsQ),
      ]);

      setRecentUsers(
        uDocs.docs.map((d) => {
          const data: any = d.data() || {};
          return {
            id: d.id,
            title: (data.name as string) || (data.email as string) || d.id,
            subtitle: data.email ?? undefined,
            createdAt: data.createdAt ?? null,
            type: 'user',
            role: (data.role as any) || 'user',
          };
        }),
      );

      setRecentLessons(
        lDocs.docs.map((d) => {
          const data: any = d.data() || {};
          return {
            id: d.id,
            title: (data.title as string) || d.id,
            subtitle: data.grade ? `Lớp ${data.grade}` : undefined,
            createdAt: data.createdAt ?? null,
            type: 'lesson',
          };
        }),
      );

      setRecentReports(
        rDocs.docs.map((d) => {
          const data: any = d.data() || {};
          return {
            id: d.id,
            title: (data.title as string) || `Report #${d.id.slice(0, 6)}`,
            subtitle: data.reason ?? data.status ?? undefined,
            createdAt: data.createdAt ?? null,
            type: 'report',
          };
        }),
      );

      setRecentSubs(
        sDocs.docs.map((d) => {
          const data: any = d.data() || {};
          return {
            id: d.id,
            title: data.planId ? String(data.planId) : `Sub #${d.id.slice(0, 6)}`,
            subtitle: `UID: ${data.uid ?? '—'}`,
            createdAt: data.startedAt ?? data.createdAt ?? null,
            type: 'subscription',
            planId: data.planId ?? undefined,
            status: data.status ?? undefined,
            uid: data.uid ?? undefined,
            startedAt: data.startedAt ?? null,
            expiresAt: data.expiresAt ?? null,
          };
        }),
      );
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được dữ liệu admin.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  /* ---------- Quick Stats ---------- */
  const quickStats: QuickStat[] = useMemo(
    () => [
      {
        key: 'users',
        label: 'Người dùng',
        value: stats.users,
        icon: 'people-outline',
        color: '#2563eb',
        bg: 'rgba(37,99,235,0.1)',
        iconLib: 'ion',
      },
      {
        key: 'lessons',
        label: 'Bài học',
        value: stats.lessons,
        icon: 'book-open-page-variant-outline',
        color: '#16a34a',
        bg: 'rgba(22,163,74,0.1)',
        iconLib: 'mci',
      },
      {
        key: 'reports',
        label: 'Báo cáo',
        value: stats.reports,
        icon: 'alert-circle-outline',
        color: '#ea580c',
        bg: 'rgba(234,88,12,0.1)',
        iconLib: 'mci',
      },
      {
        key: 'subscriptions',
        label: 'Gói Premium',
        value: stats.subscriptions,
        icon: 'star-outline',
        color: '#a855f7',
        bg: 'rgba(168,85,247,0.12)',
        iconLib: 'ion',
      },
    ],
    [stats],
  );

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  /* ---------- Render ---------- */
  return (
    <View style={s.root}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })}
      />

      <FlatList
        data={[]}
        keyExtractor={() => 'header-only'}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop, paddingBottom }}>
            {/* Header */}
            <View style={s.header}>
              <Text style={s.headerTitle}>Bảng điều khiển</Text>
              <TouchableOpacity
                onPress={() => go(router, 'settings')}
                style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <Ionicons name="settings-outline" color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            {/* Quick Stats */}
            <View style={s.quickStatsWrap}>
              {quickStats.map((sItem) => (
                <View key={sItem.key} style={s.quickStatCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: sItem.bg, padding: 8, borderRadius: 12 }}>
                      {sItem.iconLib === 'mci' ? (
                        <MaterialCommunityIcons name={sItem.icon as any} size={18} color={sItem.color} />
                      ) : (
                        <Ionicons name={sItem.icon as any} size={18} color={sItem.color} />
                      )}
                    </View>
                    <Text style={s.quickStatLabel}>{sItem.label}</Text>
                  </View>
                  <Text style={s.quickStatValue}>{loading ? '…' : sItem.value}</Text>
                </View>
              ))}
            </View>

            {/* Quick Actions */}
            <View style={s.quickActionWrap}>
              <Text style={s.quickActionTitle}>Tác vụ nhanh</Text>
              <View style={s.quickActionRow}>
                <QuickAction icon="person-outline" label="Quản lý user" onPress={() => go(router, 'users')} />
                <QuickAction icon="book-outline" label="Quản lý bài học" onPress={() => go(router, 'lessons')} />
                <QuickAction icon="warning-outline" label="Xử lý báo cáo" onPress={() => go(router, 'reports')} />
                <QuickAction icon="stats-chart-outline" label="Phân tích" onPress={() => go(router, 'analytics')} />
                <QuickAction icon="megaphone-outline" label="Thông báo" onPress={() => go(router, 'announcements')} />
                <QuickAction icon="settings-outline" label="Cấu hình" onPress={() => go(router, 'admin-config')} />
                <QuickAction icon="library-outline" label="Quản lý Library" onPress={() => go(router, 'library')} />
                <QuickAction icon="star-outline" label="Quản lý gói" onPress={() => go(router, 'subscriptions')} />
              </View>
            </View>

            {/* Recent Data */}
            <Section title="Bài học mới" actionLabel="Xem tất cả" onAction={() => go(router, 'lessons')}>
              <RecentListSimple data={recentLessons} empty="Chưa có dữ liệu." />
            </Section>

            <Section title="Báo cáo gần đây" actionLabel="Xem tất cả" onAction={() => go(router, 'reports')}>
              <RecentListSimple data={recentReports} empty="Không có báo cáo." />
            </Section>
          </View>
        }
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
      />

      {/* FAB */}
      {/* <TouchableOpacity
        onPress={() => router.push('/(admin)/lessons/create')}
        style={[s.fab, { bottom: 18 + insets.bottom }]}
      >
        <Ionicons name="add" color="#fff" size={22} />
        <Text style={s.fabText}>Thêm bài học</Text>
      </TouchableOpacity> */}
    </View>
  );
}

/* ---------- Navigation Helper ---------- */
function go(
  router: ReturnType<typeof useRouter>,
  dest: 'users' | 'lessons' | 'reports' | 'settings' | 'announcements' | 'analytics' | 'admin-config' | 'library' | 'subscriptions',
) {
  switch (dest) {
    case 'users': router.push('../users'); break;
    case 'lessons': router.push('../lessons'); break;
    case 'reports': router.push('../reports'); break;
    case 'analytics': router.push('/(admin)/analytics'); break;
    case 'announcements': router.push('./announcements'); break;
    case 'settings': router.push('/(admin)/settings'); break;
    case 'admin-config': router.push('/(admin)/admin-config'); break;
    case 'library': router.push('/(admin)/library'); break;
    case 'subscriptions': router.push('/(admin)/subscriptions'); break;
  }
}
