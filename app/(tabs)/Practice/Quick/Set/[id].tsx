// app/(tabs)/Practice/Quick/Set/[id].tsx
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/* ---------- Firebase ---------- */
import { auth, db } from "@/scripts/firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";

/* ---------- Types ---------- */
type QOption = { id: string; text: string; correct?: boolean };
type QuickQuestion = { id: string; text?: string; options: QOption[] };
type QuickPractice = {
  id: string;
  class: number;
  difficulty: "easy" | "medium" | "hard" | string;
  createdAt?: Timestamp | Date | null;
  title?: string;
  description?: string;
  questions: QuickQuestion[];
};

/* ---------- UI ---------- */
const C = {
  bg: "#0b1220",
  card: "rgba(255,255,255,0.06)",
  line: "rgba(255,255,255,0.08)",
  text: "#fff",
  sub: "#cbd5e1",
  danger: "#ffb4b4",
  primary: "#7c3aed",
  success: "#10b981",
  warn: "#f59e0b",
};

export default function QuickSetScreen() {
  const router = useRouter();
  const { id: raw } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<QuickPractice | null>(null);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [showResult, setShowResult] = useState(false);
  const startAtRef = useRef<number>(Date.now());

  // điều hướng câu hiện tại (dot + phím tắt)
  const [focusIdx, setFocusIdx] = useState(0);
  const currentIndex = () =>
    Math.max(0, Math.min((data?.questions.length || 1) - 1, focusIdx));
  const move = (delta: number) =>
    setFocusIdx((i) =>
      Math.max(0, Math.min((data?.questions.length || 1) - 1, i + delta))
    );

  const progress = useMemo(() => {
    const total = data?.questions?.length ?? 0;
    const picked = Object.values(answers).filter(Boolean).length;
    return { picked, total };
  }, [answers, data]);

  const score = useMemo(() => {
    if (!data) return { correct: 0, total: 0 };
    let correct = 0;
    const total = data.questions?.length ?? 0;
    for (const q of data.questions ?? []) {
      const chosen = answers[q.id ?? ""] ?? null;
      const opt = q.options?.find((o) => o.id === chosen);
      if (opt?.correct) correct++;
    }
    return { correct, total };
  }, [answers, data]);

  // helper trạng thái câu
  type QStatus = "unanswered" | "correct" | "wrong";
  const getQuestionStatus = (
    q: QuickQuestion,
    chosenId?: string | null
  ): QStatus => {
    if (!chosenId) return "unanswered";
    const ok = !!q.options.find((o) => o.id === chosenId && o.correct);
    return ok ? "correct" : "wrong";
  };

  // phím tắt web
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const onKey = (e: KeyboardEvent) => {
      if (!data) return;
      const map: Record<string, number> = { "1": 0, "2": 1, "3": 2, "4": 3 };
      if (map[e.key] != null) {
        const i = currentIndex();
        const q = data.questions[i];
        const opt = q.options[map[e.key]];
        if (opt) choose(q.id, opt.id);
      } else if (e.key === "Enter") {
        submit();
      } else if (e.key.toLowerCase() === "j") {
        move(1);
      } else if (e.key.toLowerCase() === "k") {
        move(-1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [data, answers, focusIdx]);

  // tải đề
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setErr(null);
        let id = Array.isArray(raw) ? raw[0] : raw;
        if (!id) throw new Error("Thiếu id trên URL");
        id = decodeURIComponent(String(id).trim());

        const snap = await getDoc(doc(db, "quick_practice", id));
        if (!snap.exists())
          throw new Error("Không tìm thấy doc trong quick_practice");

        if (!mounted) return;
        const docData = snap.data() as any;
        const parsed: QuickPractice = {
          id: snap.id,
          class: Number(docData.class ?? 0),
          difficulty: String(docData.difficulty ?? ""),
          createdAt: docData.createdAt ?? null,
          title:
            docData.title ??
            `Bộ đề lớp ${docData.class ?? ""} - ${docData.difficulty ?? ""}`,
          description: docData.description ?? "",
          questions: Array.isArray(docData.questions)
            ? docData.questions.map((q: any, idx: number) => ({
                id: String(q?.id ?? `q_${idx}`),
                text: q?.text ?? `Câu ${idx + 1}`,
                options: Array.isArray(q?.options)
                  ? q.options.map((o: any, j: number) => ({
                      id: String(o?.id ?? `o_${idx}_${j}`),
                      text: String(o?.text ?? ""),
                      correct: Boolean(o?.correct ?? false),
                    }))
                  : [],
              }))
            : [],
        };

        setData(parsed);

        const init: Record<string, string | null> = {};
        for (const q of parsed.questions) init[q.id] = null;
        setAnswers(init);

        startAtRef.current = Date.now();
        setFocusIdx(0);
      } catch (e: any) {
        if (!mounted) return;
        setErr(e?.message ?? "Lỗi không xác định");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [raw]);

  const choose = (qid: string, oid: string) => {
    setAnswers((prev) => ({ ...prev, [qid]: oid }));
  };

  const humanizeDuration = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const m = Math.floor(s / 60);
    const ss = s % 60;
    return m ? `${m} phút ${ss}s` : `${ss}s`;
  };

  const submit = async () => {
    if (!data) return;
    const unanswered = (data?.questions ?? []).filter((q) => !answers[q.id]);

    if (unanswered.length > 0 && Platform.OS === "web") {
      const ok = window.confirm(
        `Bạn còn ${unanswered.length} câu chưa chọn. Vẫn nộp bài?`
      );
      if (!ok) return;
    }

    // LƯU KẾT QUẢ vào quick_results
    try {
      await addDoc(collection(db, "quick_results"), {
        userId: auth.currentUser?.uid ?? null,
        setId: data.id,
        score: score.correct,
        total: score.total,
        durationMs: Date.now() - startAtRef.current,
        submittedAt: serverTimestamp(),
      });
    } catch (e) {
      console.error("Lỗi khi lưu kết quả:", e);
    }

    setShowResult(true);
  };

  const WebCursor =
    Platform.OS === "web" ? ({ cursor: "pointer" } as const) : null;

  // ----- UI -----
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator />
          <Text style={{ color: C.text, marginTop: 8 }}>Đang tải…</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (err) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ padding: 16 }}>
          <Text style={{ color: C.danger, fontWeight: "700" }}>Lỗi: {err}</Text>
          <Text style={{ color: C.sub, marginTop: 6 }}>
            Kiểm tra collection{" "}
            <Text style={{ color: C.text, fontWeight: "700" }}>
              quick_practice
            </Text>{" "}
            và id khớp URL.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  if (!data) return null;

  const q = data.questions[currentIndex()];
  const selected = answers[q.id];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top", "bottom"]}>
      {/* Header */}
      <View
        style={{
          paddingTop: 4,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: "row",
          alignItems: "center",
          borderBottomWidth: 1,
          borderBottomColor: C.line,
          gap: 8,
        }}
      >
        <TouchableOpacity
                      onPress={() => router.push('/Practice')}

          hitSlop={10}
          accessibilityRole="button"
          style={WebCursor ?? undefined}
        >
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>

        <Text
          style={{ color: C.text, fontSize: 18, fontWeight: "700", flex: 1 }}
          numberOfLines={1}
        >
          {data.title || "Quick Set"}
        </Text>

        {!!data && (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 6,
              backgroundColor: C.card,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
            }}
          >
            {data.class ? (
              <Text style={{ color: C.sub, fontSize: 12 }}>Lớp {data.class}</Text>
            ) : null}
            {data.difficulty ? (
              <>
                <Text style={{ color: C.line }}>•</Text>
                <Text style={{ color: C.sub, fontSize: 12 }}>
                  {String(data.difficulty).toUpperCase()}
                </Text>
              </>
            ) : null}
          </View>
        )}

        <TouchableOpacity
          onPress={submit}
          accessibilityRole="button"
          style={[
            {
              marginLeft: 10,
              backgroundColor: C.primary,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
            },
            WebCursor ?? {},
          ]}
        >
          <Text style={{ color: "#fff", fontWeight: "800" }}>Nộp bài</Text>
        </TouchableOpacity>
      </View>

      {/* Dot Navigator (3 trạng thái) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ borderBottomWidth: 1, borderBottomColor: C.line }}
        contentContainerStyle={{ paddingVertical: 10, paddingHorizontal: 12, gap: 8 }}
      >
        {data.questions.map((qq, i) => {
          const chosen = answers[qq.id];
          const status = getQuestionStatus(qq, chosen);
          const active = i === currentIndex();

        const bg =
          status === "unanswered"
            ? C.card
            : status === "correct"
            ? "rgba(16,185,129,0.22)"
            : "rgba(244,63,94,0.18)";

          return (
            <TouchableOpacity
              key={qq.id}
              onPress={() => setFocusIdx(i)}
              style={[
                {
                  width: 30,
                  height: 30,
                  borderRadius: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: bg,
                  borderWidth: 1,
                  borderColor: active ? C.primary : "transparent",
                },
                WebCursor ?? {},
              ]}
            >
              <Text style={{ color: "#fff", fontWeight: "800" }}>{i + 1}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Nội dung câu hỏi hiện tại */}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          padding: 16,
          gap: 12,
          paddingBottom: 100 + insets.bottom,
        }}
      >
        {!!data.description && (
          <Text style={{ color: C.sub }}>{data.description}</Text>
        )}

        <View
          style={{
            borderRadius: 16,
            backgroundColor: C.card,
            padding: 12,
            borderWidth: 1,
            borderColor: "transparent",
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 8,
              gap: 8,
            }}
          >
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 6,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "rgba(124,58,237,0.18)",
              }}
            >
              <Text style={{ color: C.primary, fontWeight: "800" }}>
                {currentIndex() + 1}
              </Text>
            </View>
            <Text
              style={{ color: C.text, fontWeight: "700", flex: 1 }}
              numberOfLines={3}
            >
              {q.text ?? `Câu ${currentIndex() + 1}`}
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {q.options?.map((o) => {
              const active = selected === o.id;
              return (
                <TouchableOpacity
                  key={o.id}
                  onPress={() => choose(q.id, o.id)}
                  accessibilityRole="button"
                  style={[
                    {
                      paddingVertical: 10,
                      paddingHorizontal: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: active ? C.primary : "transparent",
                      backgroundColor: active
                        ? "rgba(124,58,237,0.15)"
                        : "transparent",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    },
                    WebCursor ?? {},
                  ]}
                >
                  <Ionicons
                    name={active ? "radio-button-on" : "radio-button-off"}
                    size={18}
                    color={active ? C.primary : "#9ca3af"}
                  />
                  <Text style={{ color: C.text, flex: 1 }}>{o.text}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Điều hướng nhanh */}
        <View style={{ flexDirection: "row", gap: 10 }}>
          <TouchableOpacity
            onPress={() => move(-1)}
            style={[btnGhost(), WebCursor ?? {}]}
          >
            <Text style={btnGhostText()}>Trước</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => move(1)}
            style={[btnGhost(), WebCursor ?? {}]}
          >
            <Text style={btnGhostText()}>Sau</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
        </View>
      </ScrollView>

      {/* Footer */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          borderTopWidth: 1,
          borderTopColor: C.line,
          paddingHorizontal: 12,
          paddingTop: 12,
          paddingBottom: 12 + insets.bottom,
          backgroundColor: C.bg,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: C.sub, marginBottom: 6 }}>
              Tiến độ:{" "}
              <Text style={{ color: C.text, fontWeight: "800" }}>
                {progress.picked}/{progress.total}
              </Text>
            </Text>
            <View
              style={{
                height: 8,
                borderRadius: 999,
                backgroundColor: "rgba(255,255,255,0.12)",
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${
                    progress.total
                      ? Math.round((progress.picked / progress.total) * 100)
                      : 0
                  }%`,
                  height: "100%",
                  backgroundColor: C.primary,
                }}
              />
            </View>
          </View>
        </View>
      </View>

      {/* Result Modal */}
      <Modal
        visible={showResult}
        animationType="slide"
        transparent
        onRequestClose={() => setShowResult(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              width: "100%",
              backgroundColor: C.bg,
              borderTopLeftRadius: 20,
              borderTopRightRadius: 20,
              paddingHorizontal: 16,
              paddingTop: 16,
              paddingBottom: 16 + insets.bottom,
              borderTopWidth: 1,
              borderColor: C.line,
              maxHeight: "80%",
            }}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <Ionicons
                name={score.correct === score.total ? "trophy" : "stats-chart"}
                size={20}
                color={C.success}
              />
              <Text
                style={{
                  color: C.text,
                  fontWeight: "800",
                  fontSize: 18,
                  marginLeft: 8,
                }}
              >
                Kết quả
              </Text>
              <View style={{ flex: 1 }} />
              <TouchableOpacity
                onPress={() => setShowResult(false)}
                style={WebCursor ?? undefined}
              >
                <Ionicons name="close" size={20} color={C.sub} />
              </TouchableOpacity>
            </View>

            <View
              style={{
                flexDirection: "row",
                gap: 12,
                marginBottom: 12,
                flexWrap: "wrap",
              }}
            >
              <Pill
                icon="checkmark-circle"
                text={`Điểm: ${score.correct}/${score.total}`}
                color={C.success}
              />
              <Pill
                icon="time"
                text={`Thời gian: ${humanizeDuration(
                  Date.now() - startAtRef.current
                )}`}
                color={C.warn}
              />
            </View>

            {/* Review nhanh: Chưa làm / Đúng / Sai */}
            <ScrollView style={{ maxHeight: 360 }}>
              {data.questions.map((qq, idx) => {
                const chosen = answers[qq.id];
                const status = getQuestionStatus(qq, chosen);

                const label =
                  status === "unanswered"
                    ? "Chưa làm"
                    : status === "correct"
                    ? "Đúng"
                    : "Sai";

                const color =
                  status === "unanswered"
                    ? C.sub
                    : status === "correct"
                    ? C.success
                    : C.danger;

                return (
                  <View
                    key={qq.id}
                    style={{
                      paddingVertical: 10,
                      borderBottomWidth: 1,
                      borderBottomColor: C.line,
                    }}
                  >
                    <Text
                      style={{ color: C.text, fontWeight: "700", marginBottom: 4 }}
                    >
                      {idx + 1}. {qq.text}
                    </Text>
                    <Text style={{ color, fontWeight: "600" }}>{label}</Text>
                  </View>
                );
              })}
            </ScrollView>

            <View
              style={{
                flexDirection: "row",
                gap: 10,
                marginTop: 12,
                justifyContent: "flex-end",
              }}
            >
              <TouchableOpacity
                onPress={() => setShowResult(false)}
                style={[
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: C.card,
                    borderWidth: 1,
                    borderColor: C.line,
                  },
                  WebCursor ?? {},
                ]}
              >
                <Text style={{ color: C.text, fontWeight: "700" }}>Đóng</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const init: Record<string, string | null> = {};
                  for (const qq of data.questions) init[qq.id] = null;
                  setAnswers(init);
                  startAtRef.current = Date.now();
                  setShowResult(false);
                  setFocusIdx(0);
                  if (Platform.OS === "web" && typeof window !== "undefined") {
                    window.scrollTo(0, 0);
                  }
                }}
                style={[
                  {
                    paddingVertical: 10,
                    paddingHorizontal: 16,
                    borderRadius: 12,
                    backgroundColor: C.primary,
                  },
                  WebCursor ?? {},
                ]}
              >
                <Text style={{ color: "#fff", fontWeight: "800" }}>Làm lại</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Small components ---------- */
function Pill({
  icon,
  text,
  color,
}: {
  icon: any;
  text: string;
  color: string;
}) {
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(255,255,255,0.06)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <Ionicons name={icon} size={16} color={color} />
      <Text style={{ color: "#fff" }}>{text}</Text>
    </View>
  );
}

function btnGhost() {
  return {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.line,
  } as const;
}
function btnGhostText() {
  return { color: "#fff", fontWeight: "700" } as const;
}
