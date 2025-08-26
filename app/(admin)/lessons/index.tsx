// app/(admin)/lessons/index.tsx

/* ---------- Imports ---------- */
import { db } from '@/scripts/firebase';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
} from 'firebase/firestore';
import React, { useCallback, useEffect, useState } from 'react';
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
type Lesson = {
  id: string;
  title: string;
  grade?: string | number;
  /** Chuẩn hoá về Date | null để render an toàn */
  createdAt?: Date | null;
};

/* ---------- Main Component ---------- */
export default function LessonsScreen() {
  /* ---------- Hooks & States ---------- */
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [list, setList] = useState<Lesson[]>([]);

  /* ---------- Load Data ---------- */
  const load = useCallback(async () => {
    try {
      setLoading(true);
      const q = query(
        collection(db, 'lessons'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );
      const rs = await getDocs(q);

      const items: Lesson[] = rs.docs.map((d) => {
        const data = d.data() as any;
        const ca = data?.createdAt;

        // Chuẩn hoá createdAt về Date | null
        let createdAt: Date | null = null;
        if (ca && typeof ca?.toDate === 'function') {
          createdAt = ca.toDate();
        } else if (ca && typeof ca?.seconds === 'number') {
          createdAt = new Date(ca.seconds * 1000);
        } else if (ca instanceof Date) {
          createdAt = ca;
        } else if (typeof ca === 'string' || typeof ca === 'number') {
          const tmp = new Date(ca);
          createdAt = isNaN(tmp.getTime()) ? null : tmp;
        }

        return {
          id: d.id,
          title: data?.title ?? '(Không tiêu đề)',
          grade: data?.grade,
          createdAt,
        };
      });

      setList(items);
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không tải được bài học.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ---------- Refresh List ---------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  /* ---------- Delete Item ---------- */
  const del = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'lessons', id));
      setList((prev) => prev.filter((x) => x.id !== id));
    } catch (e: any) {
      Alert.alert('Lỗi', e?.message ?? 'Không xoá được bài học.');
    }
  };

  /* ---------- Safe Area Padding ---------- */
  const paddingTop = Math.max(insets.top - 8, 0);
  const paddingBottom = Math.max(insets.bottom, 16);

  /* ---------- Render ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: '#0b1220' }}>
      {/* StatusBar */}
      <StatusBar
        translucent
        barStyle="light-content"
        backgroundColor={Platform.select({
          android: 'transparent',
          ios: 'transparent',
        })}
      />

      {/* ---------- Header ---------- */}
      <View style={{ paddingHorizontal: 16, paddingTop, paddingBottom: 8 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          {/* Back Button */}
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: 'rgba(255,255,255,0.06)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.12)',
            }}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </TouchableOpacity>

          {/* Title */}
          <Text
            style={{
              color: '#fff',
              fontSize: 20,
              fontWeight: '800',
              textAlign: 'center',
              flex: 1,
            }}
            numberOfLines={1}
          >
            Quản lý bài học
          </Text>

          {/* Add Button */}
          <TouchableOpacity
            onPress={() => router.push('/(admin)/lessons/create')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: '#2563eb',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(37,99,235,0.9)',
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ---------- Lesson List ---------- */}
      <FlatList
        data={list}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: paddingBottom + 16,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
          />
        }
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        renderItem={({ item }) => {
          const createdStr = formatDate(item.createdAt);
          return (
            <View
              style={{
                backgroundColor: 'rgba(255,255,255,0.06)',
                borderRadius: 14,
                padding: 12,
                borderWidth: 1,
                borderColor: 'rgba(255,255,255,0.12)',
              }}
            >
              <Text style={{ color: '#e2e8f0', fontWeight: '800' }}>
                {item.title}
              </Text>

              {!!item.grade && (
                <Text style={{ color: '#94a3b8', marginTop: 2 }}>
                  Lớp {item.grade}
                </Text>
              )}

              {createdStr ? (
                <Text style={{ color: '#64748b', marginTop: 2, fontSize: 12 }}>
                  {createdStr}
                </Text>
              ) : null}

              {/* ---------- Action Buttons ---------- */}
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                {/* Edit */}
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/(admin)/lessons/create',
                      params: { editId: item.id },
                    })
                  }
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(59,130,246,0.25)',
                    borderWidth: 1,
                    borderColor: 'rgba(59,130,246,0.6)',
                  }}
                >
                  <Text style={{ color: '#bfdbfe', fontWeight: '700' }}>Sửa</Text>
                </TouchableOpacity>

                {/* Delete */}
                <TouchableOpacity
                  onPress={() => del(item.id)}
                  style={{
                    paddingVertical: 8,
                    paddingHorizontal: 12,
                    borderRadius: 10,
                    backgroundColor: 'rgba(239,68,68,0.15)',
                    borderWidth: 1,
                    borderColor: 'rgba(239,68,68,0.4)',
                  }}
                >
                  <Text style={{ color: '#ef4444', fontWeight: '700' }}>Xoá</Text>
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <Text
            style={{
              color: '#94a3b8',
              textAlign: 'center',
              marginTop: 40,
            }}
          >
            {loading ? 'Đang tải...' : 'Chưa có bài học.'}
          </Text>
        }
      />
    </View>
  );
}

/* ---------- Utils ---------- */
/** Nhận mọi kiểu giá trị ngày từ Firestore & JS và trả về chuỗi hiển thị; nếu không hợp lệ thì trả '' */
function formatDate(ts: unknown): string {
  if (!ts) return '';

  let d: Date | null = null;

  // 1) Firestore Timestamp
  if (typeof (ts as any)?.toDate === 'function') d = (ts as any).toDate();
  // 2) Object { seconds, nanoseconds }
  else if (typeof (ts as any)?.seconds === 'number')
    d = new Date((ts as any).seconds * 1000);
  // 3) Date instance
  else if (ts instanceof Date) d = ts;
  // 4) string/number parse được
  else if (typeof ts === 'string' || typeof ts === 'number') d = new Date(ts);

  if (!d || isNaN(d.getTime())) return '';

  const dd = `${String(d.getDate()).padStart(2, '0')}/${String(
    d.getMonth() + 1
  ).padStart(2, '0')}/${d.getFullYear()}`;
  const hh = `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes()
  ).padStart(2, '0')}`;
  return `${hh} • ${dd}`;
}
