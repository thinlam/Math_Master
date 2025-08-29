// app/(tabs)/Practice/Quick/Set/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, ScrollView, Text, TouchableOpacity, View } from "react-native";

/* ---------- Firestore ---------- */
import { db } from "@/scripts/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";

/* ---------- Types (khớp dữ liệu bạn chụp) ---------- */
type QOption = {
  id: string;
  text: string;
  correct?: boolean; // chỉ dùng để chấm (ẩn)
};

type QuickQuestion = {
  id: string;
  text?: string;          // nếu bạn có trường text cho câu hỏi
  options: QOption[];
};

type QuickPractice = {
  id: string;
  class: number;          // 1..12
  difficulty: "easy" | "medium" | "hard" | string;
  createdAt?: Timestamp | Date | null;
  title?: string;         // nếu có
  description?: string;   // nếu có
  questions: QuickQuestion[];
};

/* ---------- UI Helpers ---------- */
const C = {
  bg: "#0b1220",
  card: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.08)",
  text: "#fff",
  sub: "#cbd5e1",
  danger: "#ffb4b4",
  primary: "#7c3aed",
};

export default function QuickSetScreen() {
  const router = useRouter();
  const { id: raw } = useLocalSearchParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<QuickPractice | null>(null);

  // state chọn đáp án cho mỗi câu
  const [answers, setAnswers] = useState<Record<string, string | null>>({}); // questionId -> optionId

  const score = useMemo(() => {
    if (!data) return { correct: 0, total: 0 };
    let correct = 0;
    const total = data.questions?.length ?? 0;
    for (const q of data.questions ?? []) {
      const chosen = answers[q.id ?? ""] ?? null;
      const opt = q.options?.find(o => o.id === chosen);
      if (opt?.correct) correct++;
    }
    return { correct, total };
  }, [answers, data]);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        let id = Array.isArray(raw) ? raw[0] : raw;
        if (!id) throw new Error("Thiếu id trên URL");
        id = decodeURIComponent(String(id).trim());

        // LẤY THEO DOCUMENT ID từ collection "quick_practice"
        const snap = await getDoc(doc(db, "quick_practice", id));
        if (!snap.exists()) throw new Error("Không tìm thấy doc trong quick_practice");

        if (!mounted) return;
        const docData = snap.data() as any;

        const parsed: QuickPractice = {
          id: snap.id,
          class: Number(docData.class ?? 0),
          difficulty: String(docData.difficulty ?? ""),
          createdAt: docData.createdAt ?? null,
          title: docData.title ?? `Bộ đề lớp ${docData.class ?? ""} - ${docData.difficulty ?? ""}`,
          description: docData.description ?? "",
          questions: Array.isArray(docData.questions) ? docData.questions.map((q: any, idx: number) => ({
            id: String(q?.id ?? `q_${idx}`),
            text: q?.text ?? `Câu ${idx + 1}`,
            options: Array.isArray(q?.options) ? q.options.map((o: any, j: number) => ({
              id: String(o?.id ?? `o_${idx}_${j}`),
              text: String(o?.text ?? ""),
              correct: Boolean(o?.correct ?? false),
            })) : [],
          })) : [],
        };

        setData(parsed);

        // init answers rỗng
        const init: Record<string, string | null> = {};
        for (const q of parsed.questions) init[q.id] = null;
        setAnswers(init);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Lỗi không xác định");
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => { mounted = false; };
  }, [raw]);

  const choose = (qid: string, oid: string) => {
    setAnswers(prev => ({ ...prev, [qid]: oid }));
  };

  const submit = () => {
    if (!data) return;
    const { correct, total } = score;
    Alert.alert("Kết quả", `Bạn đúng ${correct}/${total}`);
  };

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      {/* Header */}
      <View style={{ flexDirection: "row", alignItems: "center", padding: 16, gap: 8 }}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 18, fontWeight: "600" }}>Quick Set</Text>
        <View style={{ flex: 1 }} />
        {!!data && (
          <Text style={{ color: C.sub }}>
            {data.class ? `Lớp ${data.class}` : ""}{data.difficulty ? ` · ${data.difficulty}` : ""}
          </Text>
        )}
      </View>

      {/* Loading */}
      {loading && (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: C.text, marginTop: 8 }}>Đang tải…</Text>
        </View>
      )}

      {/* Error */}
      {!loading && err && (
        <View style={{ paddingHorizontal: 16 }}>
          <Text style={{ color: C.danger }}>Lỗi: {err}</Text>
          <Text style={{ color: C.sub, marginTop: 6 }}>
            Kiểm tra lại: collection <Text style={{ fontWeight: "700", color: C.text }}>quick_practice</Text> và
            document id khớp URL.
          </Text>
        </View>
      )}

      {/* Content */}
      {!loading && !err && data && (
        <>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
            {!!data.title && <Text style={{ color: C.text, fontSize: 22, fontWeight: "700" }}>{data.title}</Text>}
            {!!data.description && <Text style={{ color: C.sub }}>{data.description}</Text>}

            <View style={{ height: 1, backgroundColor: C.line, marginVertical: 8 }} />

            {data.questions?.length ? (
              <FlatList
                data={data.questions}
                keyExtractor={(q) => q.id}
                renderItem={({ item: q, index }) => (
                  <View style={{ marginBottom: 12, borderRadius: 14, backgroundColor: C.card, padding: 12 }}>
                    <Text style={{ color: C.text, fontWeight: "600", marginBottom: 8 }}>
                      {index + 1}. {q.text ?? `Câu ${index + 1}`}
                    </Text>

                    {q.options?.map((o) => {
                      const active = answers[q.id] === o.id;
                      return (
                        <TouchableOpacity
                          key={o.id}
                          onPress={() => choose(q.id, o.id)}
                          style={{
                            paddingVertical: 10,
                            paddingHorizontal: 12,
                            borderRadius: 12,
                            marginTop: 8,
                            borderWidth: 1,
                            borderColor: active ? C.primary : "transparent",
                            backgroundColor: active ? "rgba(124,58,237,0.15)" : "transparent",
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <Ionicons
                            name={active ? "radio-button-on" : "radio-button-off"}
                            size={18}
                            color={active ? C.primary : "#9ca3af"}
                          />
                          <Text style={{ color: C.text }}>{o.text}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
                scrollEnabled={false}
              />
            ) : (
              <Text style={{ color: C.sub }}>Chưa có câu hỏi.</Text>
            )}
          </ScrollView>

          {/* Footer: điểm + Nộp bài */}
          <View style={{
            borderTopWidth: 1, borderTopColor: C.line, padding: 12, flexDirection: "row",
            alignItems: "center", gap: 12,
          }}>
            <Text style={{ color: C.sub, flex: 1 }}>
              Điểm tạm tính: <Text style={{ color: C.text, fontWeight: "700" }}>{score.correct}/{score.total}</Text>
            </Text>
            <TouchableOpacity
              onPress={submit}
              style={{
                backgroundColor: C.primary, paddingVertical: 10, paddingHorizontal: 16,
                borderRadius: 12,
              }}
            >
              <Text style={{ color: "#fff", fontWeight: "700" }}>Nộp bài</Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}
