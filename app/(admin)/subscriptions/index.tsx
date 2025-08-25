// app/(admin)/subscriptions/index.tsx
import { listSubscriptions, type Subscription } from '@/services/subscription';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Timestamp } from 'firebase/firestore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ========= helpers ========= */
function toDateSafe(ts: any): Date | null {
  if (!ts) return null;
  if (ts instanceof Timestamp) return ts.toDate();
  if (ts instanceof Date) return ts;
  return new Date(ts);
}
function fmt(dt: Date | null) {
  if (!dt) return '—';
  try {
    return dt.toLocaleString('vi-VN', { hour12: false });
  } catch {
    return dt.toISOString();
  }
}
function useDebounce<T>(value: T, delay = 350) {
  const [v, setV] = useState(value);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (t.current) clearTimeout(t.current);
    t.current = setTimeout(() => setV(value), delay);
    return () => { if (t.current) clearTimeout(t.current); };
  }, [value, delay]);
  return v;
}

export default function AdminSubscriptions() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';

  /* ======= theme tokens (khớp app) ======= */
  const C = useMemo(() => ({
    bg: isDark ? '#0B1020' : '#F6F7FF',
    card: isDark ? '#141A33' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,29,76,0.08)',
    text: isDark ? '#EAF0FF' : '#1B2559',
    sub: isDark ? '#A9B5D9' : '#667085',
    primary: '#6C63FF',
    primary2: '#8D84FF',
    success: '#16A34A',
    warn: '#F59E0B',
    mute: '#6B7280',
    chipBg: isDark ? 'rgba(255,255,255,0.05)' : '#EEF2FF',
  }), [isDark]);

  /* ======= states ======= */
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<Subscription[]>([]);
  const [status, setStatus] = useState<'all' | Subscription['status']>('all');
  const [uidQuery, setUidQuery] = useState('');
  const debouncedUid = useDebounce(uidQuery, 350);

  /* ======= data ======= */
  const load = async () => {
    try {
      setLoading(true);
      const data = await listSubscriptions({
        uid: debouncedUid || undefined,
        status: status === 'all' ? undefined : status,
        limitN: 100,
      });
      setItems(data);
    } catch (e: any) {
      // tránh Alert spam trong admin: show inline empty state
      console.error('load subscriptions failed:', e?.message || e);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []); // first mount
  useEffect(() => { load(); }, [status, debouncedUid]); // filters

  /* ======= UI ======= */
  const Header = () => (
    <View style={[S.headerWrap, { backgroundColor: C.bg, borderColor: C.border }]}>
      <Text style={[S.title, { color: C.text }]}>Quản lý gói Premium</Text>

      {/* Search */}
      <View style={[S.searchBox, { borderColor: C.border, backgroundColor: C.card }]}>
        <Ionicons name="search" size={18} color={C.sub} style={{ marginRight: 8 }} />
        <TextInput
          placeholder="Tìm theo UID người dùng"
          placeholderTextColor={C.sub}
          autoCapitalize="none"
          autoCorrect={false}
          value={uidQuery}
          onChangeText={setUidQuery}
          style={[S.searchInput, { color: C.text }]}
          returnKeyType="search"
        />
        {uidQuery ? (
          <TouchableOpacity onPress={() => setUidQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close-circle" size={18} color={C.sub} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Segmented filter */}
      <View style={S.segmentWrap}>
        {(['all','active','cancelled','expired'] as const).map(s => {
          const active = status === s;
          return (
            <TouchableOpacity
              key={s}
              onPress={() => setStatus(s)}
              style={[
                S.segmentItem,
                { borderColor: C.border, backgroundColor: active ? C.primary : C.chipBg }
              ]}
            >
              <Text style={[S.segmentText, { color: active ? '#fff' : C.text, opacity: active ? 1 : 0.85 }]}>
                {s}
              </Text>
            </TouchableOpacity>
          );
        })}
        <TouchableOpacity
          onPress={load}
          style={[S.segmentReload, { borderColor: C.border, backgroundColor: C.card }]}
        >
          <Ionicons name="reload" size={18} color={C.text} />
        </TouchableOpacity>
      </View>

      {/* Create button (top) */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/subscriptions/new')}
        style={[S.createTop, { backgroundColor: C.card, borderColor: C.border }]}
      >
        <Ionicons name="add" size={18} color={C.primary} />
        <Text style={{ marginLeft: 8, color: C.text, fontWeight: '600' }}>Tạo gói thủ công</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: Subscription }) => {
    const start = toDateSafe(item.startedAt);
    const end = toDateSafe(item.expiresAt);
    const badgeStyle =
      item.status === 'active' ? { bg: C.success } :
      item.status === 'cancelled' ? { bg: C.warn } :
      { bg: C.mute };

    return (
      <TouchableOpacity
        style={[
          S.card,
          {
            backgroundColor: C.card,
            borderColor: C.border,
            shadowColor: isDark ? '#000' : C.primary2,
          },
        ]}
        onPress={() => router.push(`/(admin)/subscriptions/${item.id}`)}
        activeOpacity={0.9}
      >
        <View style={S.cardHeader}>
          <Text style={[S.plan, { color: C.text }]}>{item.planId}</Text>
          <View style={[S.badge, { backgroundColor: badgeStyle.bg }]}>
            <Text style={S.badgeText}>{item.status}</Text>
          </View>
        </View>

        <View style={S.metaRow}>
          <Ionicons name="person-circle" size={16} color={C.sub} />
          <Text style={[S.metaText, { color: C.sub }]}>UID:</Text>
          <Text style={[S.metaValue, { color: C.text }]} numberOfLines={1}>{item.uid}</Text>
        </View>

        <View style={S.metaRow}>
          <Ionicons name="time" size={16} color={C.sub} />
          <Text style={[S.metaText, { color: C.sub }]}>Bắt đầu:</Text>
          <Text style={[S.metaValue, { color: C.text }]}>{fmt(start)}</Text>
        </View>

        <View style={S.metaRow}>
          <Ionicons name="alarm" size={16} color={C.sub} />
          <Text style={[S.metaText, { color: C.sub }]}>Hết hạn:</Text>
          <Text style={[S.metaValue, { color: C.text }]}>{fmt(end)}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={[S.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        data={items}
        keyExtractor={(it) => it.id!}
        ListHeaderComponent={<Header />}
        stickyHeaderIndices={[0]} // header dính trên cùng
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={C.primary} />}
        renderItem={renderItem}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Ionicons name="cloud-offline" size={28} color={C.sub} />
              <Text style={{ color: C.sub, marginTop: 8 }}>Không có dữ liệu phù hợp</Text>
            </View>
          )
        }
      />

      {/* FAB tạo mới */}
      <TouchableOpacity
        onPress={() => router.push('/(admin)/subscriptions/new')}
        activeOpacity={0.9}
        style={[
          S.fab,
          {
            backgroundColor: C.primary,
            shadowColor: isDark ? '#000' : C.primary2,
            bottom: (Platform.OS === 'ios' ? 24 : 20) + insets.bottom,
          },
        ]}
      >
        <Ionicons name="add" size={22} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

/* ========= styles ========= */
const S = StyleSheet.create({
  root: { flex: 1 },
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  searchBox: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 15 },

  segmentWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  segmentItem: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  segmentText: { fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
  segmentReload: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginLeft: 'auto',
  },

  createTop: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plan: { fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'lowercase' },

  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { fontSize: 13, marginLeft: 6, marginRight: 6 },
  metaValue: { fontSize: 13, fontWeight: '600', flexShrink: 1 },

  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
