// app/(tabs)/Practice/Quick/index.tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/* Firestore */
import { auth, db } from "@/scripts/firebase";
import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
  Timestamp,
  where,
} from "firebase/firestore";

type QuickDoc = {
  id: string;
  title: string;
  class: number;
  topic?: string;
  difficulty?: string; // 'easy' | 'medium' | 'hard'
  createdAt?: any;
  result?: {
    score: number;
    total: number;
    submittedAt?: Timestamp;
  };
};

const C = {
  bg: "#0b1220",
  card: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.12)",
  text: "#fff",
  sub: "rgba(255,255,255,0.70)",
  primary: "#7c3aed",
};

const PAGE = 20;

export default function QuickScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { grade, topic, difficulty } = useLocalSearchParams<{
    grade?: string;
    topic?: string;
    difficulty?: string;
  }>();

  const [items, setItems] = useState<QuickDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [paging, setPaging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const lastRef = useRef<QueryDocumentSnapshot | null>(null);

  const g = useMemo(() => {
    const n = Number(grade);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [grade]);
  const t = topic ? String(topic) : null;
  const d = difficulty ? String(difficulty) : null;

  const WebCursor = Platform.OS === "web" ? ({ cursor: "pointer" } as const) : undefined;

  const buildQuery = useCallback(() => {
    const col = collection(db, "quick_practice");
    const conds: any[] = [];
    if (g !== null) conds.push(where("class", "==", g));
    if (t) conds.push(where("topic", "==", t));
    if (d) conds.push(where("difficulty", "==", d));
    return query(col, ...conds, orderBy("createdAt", "desc"), limit(PAGE));
  }, [g, t, d]);

  /** Lấy quick_results theo user và ghép vào rows */
  const attachUserResults = useCallback(async (rows: QuickDoc[]): Promise<QuickDoc[]> => {
    const uid = auth.currentUser?.uid;
    if (!uid || rows.length === 0) return rows;

    const results: Record<string, any> = {};
    // chia batch 10 id
    for (let i = 0; i < rows.length; i += 10) {
      const batchIds = rows.slice(i, i + 10).map((r) => r.id);
      const q = query(
        collection(db, "quick_results"),
        where("userId", "==", uid),
        where("setId", "in", batchIds)
      );
      const snap = await getDocs(q);
      snap.forEach((docu) => {
        const d = docu.data();
        results[d.setId] = d;
      });
    }

    return rows.map((r) => ({ ...r, result: results[r.id] }));
  }, []);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    setErr(null);
    setHasMore(true);
    lastRef.current = null;
    try {
      const q = buildQuery();
      const snap = await getDocs(q);
      let rows: QuickDoc[] = [];
      snap.forEach((docu) => rows.push({ id: docu.id, ...(docu.data() as any) }));
      rows = await attachUserResults(rows);
      setItems(rows);
      if (snap.docs.length < PAGE) setHasMore(false);
      else lastRef.current = snap.docs[snap.docs.length - 1];
    } catch (e: any) {
      setErr(e?.message ?? "Không tải được dữ liệu");
      setItems([]);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [buildQuery, attachUserResults]);

  const loadMore = useCallback(async () => {
    if (!hasMore || paging || !lastRef.current) return;
    setPaging(true);
    try {
      const q = query(buildQuery(), startAfter(lastRef.current));
      const snap = await getDocs(q);
      let rows: QuickDoc[] = [];
      snap.forEach((docu) => rows.push({ id: docu.id, ...(docu.data() as any) }));
      rows = await attachUserResults(rows);
      setItems((prev) => [...prev, ...rows]);
      if (snap.docs.length < PAGE) setHasMore(false);
      else lastRef.current = snap.docs[snap.docs.length - 1];
    } finally {
      setPaging(false);
    }
  }, [buildQuery, hasMore, paging, attachUserResults]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadFirst();
    setRefreshing(false);
  }, [loadFirst]);

  useEffect(() => {
    loadFirst();
  }, [g, t, d, loadFirst]);

  const goToSet = (id: string) =>
    router.push(`/Practice/Quick/Set/${encodeURIComponent(id)}`);

  const FilterChips = () => {
    const chips = [
      g != null ? `Lớp ${g}` : null,
      t ? t : null,
      d ? String(d).toUpperCase() : null,
    ].filter(Boolean) as string[];
    if (!chips.length) return null;
    return (
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 12, paddingBottom: 8 }}>
        {chips.map((c, i) => (
          <View
            key={i}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: C.card,
              borderWidth: 1,
              borderColor: C.line,
            }}
          >
            <Ionicons name="pricetag" size={12} color={C.sub} />
            <Text style={{ color: C.text, fontSize: 12 }}>{c}</Text>
          </View>
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView edges={["top", "left", "right"]} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* Header */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingBottom: 8,
          paddingTop: 6,
          borderBottomWidth: 1,
          borderBottomColor: C.line,
        }}
      >
        <TouchableOpacity
          onPress={() => router.replace("/(tabs)/Practice")}
          hitSlop={10}
          accessibilityRole="button"
          style={WebCursor}
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text
          style={{ color: C.text, fontWeight: "800", fontSize: 18, marginLeft: 8, flex: 1 }}
          numberOfLines={1}
        >
          Luyện nhanh
        </Text>

        <TouchableOpacity onPress={onRefresh} accessibilityRole="button" style={WebCursor}>
          <Ionicons name="refresh" size={18} color={C.sub} />
        </TouchableOpacity>
      </View>

      {/* Active filters */}
      <FilterChips />

      {loading ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: C.sub, marginTop: 8 }}>Đang tải…</Text>
        </View>
      ) : err ? (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 }}>
          <Ionicons name="alert-circle" size={24} color={C.sub} />
          <Text style={{ color: C.sub, marginTop: 8, textAlign: "center" }}>{err}</Text>
          <TouchableOpacity
            onPress={loadFirst}
            style={[{ marginTop: 12, backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 }, WebCursor]}
          >
            <Text style={{ color: "#fff", fontWeight: "800" }}>Thử lại</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => goToSet(item.id)}
              accessibilityRole="button"
              activeOpacity={0.85}
              style={[
                {
                  backgroundColor: C.card,
                  borderColor: C.line,
                  borderWidth: 1,
                  marginHorizontal: 12,
                  marginVertical: 6,
                  borderRadius: 14,
                  padding: 12,
                },
                WebCursor,
              ]}
            >
              <Text style={{ color: C.text, fontWeight: "700" }} numberOfLines={1}>
                {item.title}
              </Text>

              <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <Badge text={`Lớp ${item.class}`} />
                {!!item.topic && <Badge text={item.topic} />}
                {!!item.difficulty && <Badge text={String(item.difficulty).toUpperCase()} />}
              </View>

              {/* Hiện thời gian nộp của user */}
              {!!item.result?.submittedAt && (
                <Text style={{ color: C.sub, fontSize: 12, marginTop: 6 }}>
                  Đã nộp: {formatDate(item.result.submittedAt)}
                </Text>
              )}
            </TouchableOpacity>
          )}
          onEndReachedThreshold={0.4}
          onEndReached={loadMore}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ color: C.sub, textAlign: "center", marginTop: 24 }}>
              Không có dữ liệu phù hợp bộ lọc.
            </Text>
          }
          ListFooterComponent={
            paging ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator />
              </View>
            ) : null
          }
          contentContainerStyle={{ paddingBottom: 16 + insets.bottom }}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#fff"
              titleColor="#fff"
              colors={["#fff"]}
              progressBackgroundColor="#333"
            />
          }
        />
      )}
    </SafeAreaView>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View
      style={{
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        backgroundColor: "rgba(255,255,255,0.06)",
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.10)",
      }}
    >
      <Text style={{ color: C.text, fontSize: 12 }}>{text}</Text>
    </View>
  );
}

function formatDate(ts?: any) {
  if (!ts) return "";
  const d: Date =
    ts?.toDate?.() instanceof Date ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const dd = d.getDate().toString().padStart(2, "0");
  const mm = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh = d.getHours().toString().padStart(2, "0");
  const mi = d.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
}
