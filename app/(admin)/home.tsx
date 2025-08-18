// app/(admin)/home.tsx

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

/* ---------- Types ---------- */
type QuickStat = {
  key: 'users' | 'lessons' | 'reports';
  label: string;
  value: number;
  icon:
    | React.ComponentProps<typeof Ionicons>['name']
    | React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  bg: string;
  iconLib?: 'ion' | 'mci';
};

type RecentItem = {
  id: string;
  title: string;
  subtitle?: string;
  /** có thể là Timestamp | Date | string | null (khi serverTimestamp chưa resolve) */
  createdAt?: any;
  type: 'user' | 'lesson' | 'report';
  role?: 'admin' | 'premium' | 'user' | string;
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
  // FieldValue (serverTimestamp) hoặc kiểu lạ -> bỏ qua
  return null;
}

function formatDate(tsLike: any) {
  const d = safeDate(tsLike);
  if (!d) return '—';
  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}

/* ---------- Main Component ---------- */
export default function AdminHome() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [stats, setStats] = useState<{ users: number; lessons: number; reports: number }>({
    users: 0,
    lessons: 0,
    reports: 0,
  });

  const [recentUsers, setRecentUsers] = useState<RecentItem[]>([]);
  const [recentLessons, setRecentLessons] = useState<RecentItem[]>([]);
  const [recentReports, setRecentReports] = useState<RecentItem[]>([]);

  /* ---------- Load Data ---------- */
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      const [usersSnap, lessonsSnap, reportsSnap] = await Promise.all([
        getCountFromServer(collection(db, 'users')),
        getCountFromServer(collection(db, 'lessons')),
        getCountFromServer(collection(db, 'reports')),
      ]);

      setStats({
        users: usersSnap.data().count,
        lessons: lessonsSnap.data().count,
        reports: reportsSnap.data().count,
      });

      const recentUsersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(5));
      const recentLessonsQ = query(collection(db, 'lessons'), orderBy('createdAt', 'desc'), limit(5));
      const recentReportsQ = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(5));

      const [uDocs, lDocs, rDocs] = await Promise.all([
        getDocs(recentUsersQ),
        getDocs(recentLessonsQ),
        getDocs(recentReportsQ),
      ]);

      setRecentUsers(
        uDocs.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: (data.name as string) || (data.email as string) || d.id,
            subtitle: data.email ?? undefined,
            createdAt: data.createdAt ?? null, // có thể là FieldValue -> để any, formatDate sẽ an toàn
            type: 'user',
            role: (data.role as RecentItem['role']) || 'user',
          } satisfies RecentItem;
        })
      );

      setRecentLessons(
        lDocs.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: (data.title as string) || d.id,
            subtitle: data.grade ? `Lớp ${data.grade}` : undefined,
            createdAt: data.createdAt ?? null,
            type: 'lesson',
          } satisfies RecentItem;
        })
      );

      setRecentReports(
        rDocs.docs.map((d) => {
          const data = d.data() || {};
          return {
            id: d.id,
            title: (data.title as string) || `Report #${d.id.slice(0, 6)}`,
            subtitle: data.reason ?? data.status ?? undefined,
            createdAt: data.createdAt ?? null,
            type: 'report',
          } satisfies RecentItem;
        })
      );
    } catch (e: any) {
      console.error(e);
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

  /* ---------- Quick Stats Data ---------- */
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
    ],
    [stats]
  );

  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  /* ---------- Render ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({ android: 'transparent', ios: 'transparent' })}
      />

      {/* Dùng FlatList cha (VirtualizedList) để cuộn toàn trang - KHÔNG có FlatList con */}
      <FlatList
        data={[]}
        keyExtractor={() => 'header-only'}
        ListHeaderComponent={
          <View style={{ paddingHorizontal: 16, paddingTop, paddingBottom }}>
            {/* ---------- Header ---------- */}
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 10,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 22, fontWeight: '800' }}>Bảng điều khiển</Text>
              <TouchableOpacity
                onPress={() => go(router, 'settings')}
                style={{ padding: 8, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.06)' }}
              >
                <Ionicons name="settings-outline" color="#fff" size={20} />
              </TouchableOpacity>
            </View>

            {/* ---------- Quick Stats ---------- */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              {quickStats.map((s) => (
                <View
                  key={s.key}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    padding: 14,
                    borderWidth: 1,
                    borderColor: 'rgba(255,255,255,0.12)',
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={{ backgroundColor: s.bg, padding: 8, borderRadius: 12 }}>
                      {s.iconLib === 'mci' ? (
                        <MaterialCommunityIcons name={s.icon as any} size={18} color={s.color} />
                      ) : (
                        <Ionicons name={s.icon as any} size={18} color={s.color} />
                      )}
                    </View>
                    <Text style={{ color: '#cbd5e1', fontSize: 13 }}>{s.label}</Text>
                  </View>
                  <Text style={{ color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 6 }}>
                    {loading ? '...' : s.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* ---------- Quick Actions ---------- */}
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 16,
                padding: 14,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
                marginBottom: 12,
              }}
            >
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 }}>
                Tác vụ nhanh
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
                <QuickAction icon="person-outline" label="Quản lý user" onPress={() => go(router, 'users')} />
                <QuickAction icon="book-outline" label="Quản lý bài học" onPress={() => go(router, 'lessons')} />
                <QuickAction icon="warning-outline" label="Xử lý báo cáo" onPress={() => go(router, 'reports')} />
                <QuickAction icon="stats-chart-outline" label="Phân tích" onPress={() => go(router, 'analytics')} />
                <QuickAction icon="megaphone-outline" label="Thông báo" onPress={() => go(router, 'announcements')} />
                <QuickAction icon="settings-outline" label="Cấu hình" onPress={() => go(router, 'admin-config')} />
                <QuickAction icon="library-outline" label="Quản lý Library" onPress={() => go(router, 'library')} />

              </View>
            </View>

            {/* ---------- Recent Lists ---------- */}
            {/* <Section title="Người dùng mới" actionLabel="Xem tất cả" onAction={() => go(router, 'users')}>
              <RecentListSimple data={recentUsers} empty="Chưa có dữ liệu." />
            </Section> */}

            <Section title="Bài học mới" actionLabel="Xem tất cả" onAction={() => go(router, 'lessons')}>
              <RecentListSimple data={recentLessons} empty="Chưa có dữ liệu." />
            </Section>

            <Section title="Báo cáo gần đây" actionLabel="Xem tất cả" onAction={() => go(router, 'reports')}>
              <RecentListSimple data={recentReports} empty="Không có báo cáo." />
            </Section>
          </View>
        }
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />
        }
        contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
      />

      {/* ---------- Floating Action Button ---------- */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/lessons/create')}
        style={{
          position: 'absolute',
          right: 18,
          bottom: 18 + insets.bottom,
          backgroundColor: '#3b82f6',
          borderRadius: 28,
          alignItems: 'center',
          justifyContent: 'center',
          paddingHorizontal: 18,
          height: 56,
          flexDirection: 'row',
          gap: 8,
          shadowColor: '#000',
          shadowOpacity: 0.25,
          shadowRadius: 12,
          shadowOffset: { width: 0, height: 6 },
        }}
        accessibilityRole="button"
        accessibilityLabel="Thêm bài học"
      >
        <Ionicons name="add" color="#fff" size={22} />
        <Text style={{ color: '#fff', fontWeight: '700' }}>Thêm bài học</Text>
      </TouchableOpacity>
    </View>
  );
}

/* ---------- Sub Components ---------- */
function go(
  router: ReturnType<typeof useRouter>,
  dest: 'users' | 'lessons' | 'reports' | 'settings' | 'announcements' | 'analytics' | 'admin-config'| 'library'
) {
  switch (dest) {
    case 'users': router.push('../users'); break;
    case 'lessons': router.push('../lessons'); break;
    case 'reports': router.push('../reports'); break;
    case 'analytics': router.push('/(admin)/analytics'); break;
    case 'announcements': router.push('./announcements'); break;
    case 'settings': router.push('/(admin)/settings'); break;
    case 'admin-config': router.push('/(admin)/admin-config'); break;
    case 'library': router.push('/(admin)/library/index'); break;
  }
}

function QuickAction({
  icon,
  label,
  onPress,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.04)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
      }}
    >
      <Ionicons name={icon} size={16} color="#93c5fd" />
      <Text style={{ color: '#e5e7eb', fontWeight: '600' }}>{label}</Text>
    </TouchableOpacity>
  );
}

function Section({
  title,
  children,
  actionLabel,
  onAction,
}: {
  title: string;
  children: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={{
        backgroundColor: 'rgba(255,255,255,0.06)',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.12)',
        marginBottom: 12,
      }}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>{title}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction} style={{ paddingVertical: 4, paddingHorizontal: 8 }}>
            <Text style={{ color: '#93c5fd', fontWeight: '700' }}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
      {children}
    </View>
  );
}

/** Danh sách hiển thị đơn giản (không FlatList con) để tránh nested VirtualizedList */
function RecentListSimple({ data, empty }: { data: RecentItem[]; empty: string }) {
  if (!data.length) return <Text style={{ color: '#94a3b8' }}>{empty}</Text>;
  return (
    <View>
      {data.map((item, idx) => (
        <View key={item.id}>
          <View
            style={{
              backgroundColor: 'rgba(255,255,255,0.04)',
              borderRadius: 12,
              padding: 12,
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.1)',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: '#e2e8f0', fontWeight: '700', flex: 1 }}>{item.title}</Text>
              {item.type === 'user' && <RoleBadge role={(item.role as any) ?? 'user'} />}
            </View>
            {!!item.subtitle && <Text style={{ color: '#94a3b8', marginTop: 2 }}>{item.subtitle}</Text>}
            <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
          {idx < data.length - 1 && <View style={{ height: 8 }} />}
        </View>
      ))}
    </View>
  );
}

function RoleBadge({ role }: { role: string }) {
  const map: Record<
    string,
    { label: string; bg: string; color: string; icon: React.ComponentProps<typeof Ionicons>['name'] }
  > = {
    admin: { label: 'Admin', bg: 'rgba(239,68,68,0.15)', color: '#ef4444', icon: 'shield-checkmark-outline' },
    premium: { label: 'Premium', bg: 'rgba(168,85,247,0.15)', color: '#a855f7', icon: 'star-outline' },
    user: { label: 'User', bg: 'rgba(148,163,184,0.15)', color: '#94a3b8', icon: 'person-outline' },
  };
  const style = map[role] ?? map.user;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 999, backgroundColor: style.bg }}>
      <Ionicons name={style.icon} size={14} color={style.color} />
      <Text style={{ color: style.color, fontWeight: '700', fontSize: 12 }}>{style.label}</Text>
    </View>
  );
}
