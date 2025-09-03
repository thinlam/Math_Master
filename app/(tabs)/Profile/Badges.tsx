// app/(tabs)/Profile/Badges.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { memo, useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StatusBar,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase ---------- */
import { auth, db } from '@/scripts/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    serverTimestamp,
    setDoc,
} from 'firebase/firestore';

/* ---------- Theme ---------- */
import { useTheme } from '@/theme/ThemeProvider';

type CriteriaType =
  | 'streak_days'
  | 'quizzes_done'
  | 'correct_answers'
  | 'speed_score'
  | 'topic_mastery';

type TopicKey = 'add_sub' | 'mul_div' | 'geometry' | 'algebra' | 'numberSense' | 'time' | 'money';

type BadgeDef = {
  id: string;
  title: string;
  desc?: string;
  iconLib?: 'ion' | 'mci';
  iconName: string;
  color?: string;
  topic?: TopicKey;
  criteria: { type: CriteriaType; target: number };
};

type UserStats = Partial<{
  streak_days: number;
  quizzes_done: number;
  correct_answers: number;
  speed_score: number;
  topic_mastery: Record<TopicKey, number>;
}>;

type UserBadgeDoc = {
  id?: string;
  completed?: boolean;
  progress?: number; // 0..1
  unlockedAt?: any;
};

/* ===================== BADGE CATALOG ===================== */
const LOCAL_BADGES: BadgeDef[] = [
  /* STREAK: Chuỗi ngày */
  { id: 'streak_1',   title: '🔥 Ngày đầu tiên (Đồng)',  desc: 'Mở app 1 ngày — mở màn hành trình!', iconLib: 'ion', iconName: 'flame', color: '#F59E0B', criteria: { type: 'streak_days', target: 1 } },
  { id: 'streak_3',   title: '🔥 Chuỗi 3 (Bạc)',         desc: 'Giữ lửa 3 ngày liên tiếp',           iconLib: 'ion', iconName: 'flame', color: '#FDBA74', criteria: { type: 'streak_days', target: 3 } },
  { id: 'streak_7',   title: '🔥 Chuỗi 7 (Vàng)',        desc: '1 tuần không bỏ cuộc',                iconLib: 'ion', iconName: 'flame', color: '#FACC15', criteria: { type: 'streak_days', target: 7 } },
  { id: 'streak_14',  title: '🔥 Chuỗi 14 (Platinum)',   desc: '2 tuần bền bỉ – quá chất!',           iconLib: 'ion', iconName: 'flame', color: '#EAB308', criteria: { type: 'streak_days', target: 14 } },
  { id: 'streak_21',  title: '🔥 Chuỗi 21 (Kim cương)',  desc: '21 ngày tạo thói quen',               iconLib: 'ion', iconName: 'flame', color: '#D97706', criteria: { type: 'streak_days', target: 21 } },
  { id: 'streak_30',  title: '🔥 Chuỗi 30 (Huyền thoại)',desc: 'Một tháng chăm chỉ!',                 iconLib: 'ion', iconName: 'flame', color: '#EA580C', criteria: { type: 'streak_days', target: 30 } },
  { id: 'streak_45',  title: '🔥 Chuỗi 45 – Đà thăng hoa',desc: 'Đà này là vô địch!',                 iconLib: 'ion', iconName: 'flame', color: '#F97316', criteria: { type: 'streak_days', target: 45 } },
  { id: 'streak_60',  title: '🔥 Chuỗi 60 – Máy cày',    desc: 'Bền bỉ làm nên khác biệt',            iconLib: 'ion', iconName: 'flame', color: '#FB923C', criteria: { type: 'streak_days', target: 60 } },
  { id: 'streak_90',  title: '🔥 Chuỗi 90 – Bất khuất',  desc: '3 tháng liền tay',                    iconLib: 'ion', iconName: 'flame', color: '#F59E0B', criteria: { type: 'streak_days', target: 90 } },
  { id: 'streak_120', title: '🔥 Chuỗi 120 – Truyền thuyết', desc: 'Thanh danh lưu danh',             iconLib: 'ion', iconName: 'flame', color: '#B45309', criteria: { type: 'streak_days', target: 120 } },

  /* QUIZZES */
  { id: 'quiz_1',   title: '🎯 Phát súng đầu',        desc: 'Hoàn thành bài đầu tiên',           iconLib: 'mci', iconName: 'target-account', color: '#22C55E', criteria: { type: 'quizzes_done', target: 1 } },
  { id: 'quiz_10',  title: '🎯 Tân binh 10',          desc: '10 bài – khởi động nóng máy',      iconLib: 'mci', iconName: 'target-account', color: '#34D399', criteria: { type: 'quizzes_done', target: 10 } },
  { id: 'quiz_25',  title: '🎯 Tay săn 25',           desc: 'Nhịp đều tay, đều trình',           iconLib: 'mci', iconName: 'target',          color: '#10B981', criteria: { type: 'quizzes_done', target: 25 } },
  { id: 'quiz_50',  title: '🎯 Xạ thủ 50',            desc: 'Nâng trình qua từng bài',           iconLib: 'mci', iconName: 'target',          color: '#059669', criteria: { type: 'quizzes_done', target: 50 } },
  { id: 'quiz_75',  title: '🎯 Cao thủ 75',           desc: 'Bứt tốc ngoạn mục',                  iconLib: 'mci', iconName: 'bullseye-arrow',  color: '#16A34A', criteria: { type: 'quizzes_done', target: 75 } },
  { id: 'quiz_100', title: '🏆 Trăm trận trăm thắng', desc: '100 bài — dấu mốc lớn!',            iconLib: 'mci', iconName: 'bullseye-arrow',  color: '#22C55E', criteria: { type: 'quizzes_done', target: 100 } },
  { id: 'quiz_150', title: '🏆 Lì đòn 150',           desc: 'Chịu khó là chìa khoá',              iconLib: 'mci', iconName: 'bullseye-arrow',  color: '#22C55E', criteria: { type: 'quizzes_done', target: 150 } },
  { id: 'quiz_200', title: '🏆 Cày 200',              desc: 'Đường dài mới biết ngựa hay',        iconLib: 'mci', iconName: 'bullseye-arrow',  color: '#16A34A', criteria: { type: 'quizzes_done', target: 200 } },
  { id: 'quiz_300', title: '👑 Siêng 300',            desc: 'Bạn của kỷ luật',                    iconLib: 'mci', iconName: 'bullseye-arrow',  color: '#0EA5E9', criteria: { type: 'quizzes_done', target: 300 } },
  { id: 'quiz_500', title: '👑 Huyền thoại 500',      desc: '500 bài – đẳng cấp khác biệt',       iconLib: 'mci', iconName: 'bullseye-arrow',  color: '#6366F1', criteria: { type: 'quizzes_done', target: 500 } },

  /* CORRECT ANSWERS */
  { id: 'correct_10',   title: '✅ 10 chuẩn',   desc: 'Bắt đầu vào form',         iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#10B981', criteria: { type: 'correct_answers', target: 10 } },
  { id: 'correct_50',   title: '✅ 50 chuẩn',   desc: 'Chuẩn đến mức khó tin',    iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#34D399', criteria: { type: 'correct_answers', target: 50 } },
  { id: 'correct_100',  title: '✅ 100 chuẩn',  desc: 'Chính xác là thói quen',   iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#22C55E', criteria: { type: 'correct_answers', target: 100 } },
  { id: 'correct_200',  title: '✅ 200 chuẩn',  desc: 'Nhịp điệu hoàn hảo',       iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#16A34A', criteria: { type: 'correct_answers', target: 200 } },
  { id: 'correct_300',  title: '✅ 300 chuẩn',  desc: 'Độ chính xác đỉnh cao',    iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#0EA5E9', criteria: { type: 'correct_answers', target: 300 } },
  { id: 'correct_500',  title: '🏅 500 chuẩn',  desc: 'Cú nhảy chất lượng',       iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#3B82F6', criteria: { type: 'correct_answers', target: 500 } },
  { id: 'correct_1000', title: '🏅 1000 chuẩn', desc: 'Người chơi hệ chính xác',  iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#6366F1', criteria: { type: 'correct_answers', target: 1000 } },
  { id: 'correct_2000', title: '🏅 2000 chuẩn', desc: 'Kỷ lục gia đúng chuẩn',    iconLib: 'ion', iconName: 'checkmark-done-circle', color: '#8B5CF6', criteria: { type: 'correct_answers', target: 2000 } },

  /* SPEED SCORE */
  { id: 'speed_300',  title: '⚡️ Tốc độ 300',  desc: 'Nhanh tay – gọn não',            iconLib: 'mci', iconName: 'speedometer', color: '#3B82F6', criteria: { type: 'speed_score', target: 300 } },
  { id: 'speed_500',  title: '⚡️ Tốc độ 500',  desc: 'Bắt đầu thấy gió',               iconLib: 'mci', iconName: 'speedometer', color: '#2563EB', criteria: { type: 'speed_score', target: 500 } },
  { id: 'speed_650',  title: '⚡️ Tốc độ 650',  desc: 'Phản xạ nhanh như chớp',         iconLib: 'mci', iconName: 'speedometer', color: '#1D4ED8', criteria: { type: 'speed_score', target: 650 } },
  { id: 'speed_800',  title: '⚡️ Tốc độ 800',  desc: 'Bật chế độ siêu tốc',            iconLib: 'mci', iconName: 'speedometer', color: '#0EA5E9', criteria: { type: 'speed_score', target: 800 } },
  { id: 'speed_900',  title: '⚡️ Tốc độ 900',  desc: 'Đường đua thuộc về bạn',         iconLib: 'mci', iconName: 'speedometer', color: '#14B8A6', criteria: { type: 'speed_score', target: 900 } },
  { id: 'speed_1000', title: '🚀 Tốc độ 1000', desc: 'Tên lửa bật thầy số học',         iconLib: 'mci', iconName: 'speedometer', color: '#1E3A8A', criteria: { type: 'speed_score', target: 1000 } },

  /* TOPIC 30% */
  { id: 'master30_add_sub',     title: '📚 Cộng–Trừ 30%',     desc: 'Chạm ngưỡng khởi động',   iconLib: 'ion', iconName: 'add-circle',          color: '#A78BFA', topic: 'add_sub',     criteria: { type: 'topic_mastery', target: 30 } },
  { id: 'master30_mul_div',     title: '📚 Nhân–Chia 30%',    desc: 'Bước đầu vững vàng',      iconLib: 'ion', iconName: 'close-circle',        color: '#C084FC', topic: 'mul_div',     criteria: { type: 'topic_mastery', target: 30 } },
  { id: 'master30_geometry',    title: '📚 Hình học 30%',     desc: 'Điểm tựa nền tảng',       iconLib: 'mci', iconName: 'shape',               color: '#F472B6', topic: 'geometry',    criteria: { type: 'topic_mastery', target: 30 } },
  { id: 'master30_algebra',     title: '📚 Đại số 30%',       desc: 'Làm quen công thức',      iconLib: 'mci', iconName: 'function-variant',    color: '#22D3EE', topic: 'algebra',     criteria: { type: 'topic_mastery', target: 30 } },
  { id: 'master30_numbersense', title: '📚 Cảm số 30%',       desc: 'Cảm nhận con số',         iconLib: 'mci', iconName: 'numeric',             color: '#2DD4BF', topic: 'numberSense', criteria: { type: 'topic_mastery', target: 30 } },
  { id: 'master30_time',        title: '📚 Giờ–Phút 30%',     desc: 'Bắt nhịp thời gian',      iconLib: 'ion', iconName: 'time',                color: '#38BDF8', topic: 'time',        criteria: { type: 'topic_mastery', target: 30 } },
  { id: 'master30_money',       title: '📚 Tiền tệ 30%',      desc: 'Tư duy giá trị',          iconLib: 'ion', iconName: 'cash',                color: '#67E8F9', topic: 'money',       criteria: { type: 'topic_mastery', target: 30 } },

  /* TOPIC 50% */
  { id: 'master50_add_sub',     title: '🥈 Cộng–Trừ 50%',     desc: 'Nền móng vững chắc',      iconLib: 'ion', iconName: 'add-circle',          color: '#8B5CF6', topic: 'add_sub',     criteria: { type: 'topic_mastery', target: 50 } },
  { id: 'master50_mul_div',     title: '🥈 Nhân–Chia 50%',    desc: 'Tăng lực bứt phá',        iconLib: 'ion', iconName: 'close-circle',        color: '#A855F7', topic: 'mul_div',     criteria: { type: 'topic_mastery', target: 50 } },
  { id: 'master50_geometry',    title: '🥈 Hình học 50%',     desc: 'Hình – diện – góc',       iconLib: 'mci', iconName: 'shape',               color: '#EC4899', topic: 'geometry',    criteria: { type: 'topic_mastery', target: 50 } },
  { id: 'master50_algebra',     title: '🥈 Đại số 50%',       desc: 'Công thức không khó',     iconLib: 'mci', iconName: 'function-variant',    color: '#06B6D4', topic: 'algebra',     criteria: { type: 'topic_mastery', target: 50 } },
  { id: 'master50_numbersense', title: '🥈 Cảm số 50%',       desc: 'Mượt mà hơn mỗi ngày',     iconLib: 'mci', iconName: 'numeric',             color: '#14B8A6', topic: 'numberSense', criteria: { type: 'topic_mastery', target: 50 } },
  { id: 'master50_time',        title: '🥈 Giờ–Phút 50%',     desc: 'Thời gian trong tay',     iconLib: 'ion', iconName: 'time',                color: '#0EA5E9', topic: 'time',        criteria: { type: 'topic_mastery', target: 50 } },
  { id: 'master50_money',       title: '🥈 Tiền tệ 50%',      desc: 'Tư duy tài chính sớm',    iconLib: 'ion', iconName: 'cash',                color: '#22D3EE', topic: 'money',       criteria: { type: 'topic_mastery', target: 50 } },

  /* TOPIC 80% */
  { id: 'master_add_sub',       title: '🥇 Cộng–Trừ 80%',     desc: 'Chạm ngưỡng chuyên gia',  iconLib: 'ion', iconName: 'add-circle',          color: '#7C3AED', topic: 'add_sub',     criteria: { type: 'topic_mastery', target: 80 } },
  { id: 'master_mul_div',       title: '🥇 Nhân–Chia 80%',    desc: 'Nhanh – đúng – gọn',      iconLib: 'ion', iconName: 'close-circle',        color: '#9333EA', topic: 'mul_div',     criteria: { type: 'topic_mastery', target: 80 } },
  { id: 'master_geometry',      title: '🥇 Hình học 80%',     desc: 'Tư duy hình không ngán',  iconLib: 'mci', iconName: 'shape',               color: '#DB2777', topic: 'geometry',    criteria: { type: 'topic_mastery', target: 80 } },
  { id: 'master_algebra',       title: '🥇 Đại số 80%',       desc: 'Biến đổi thần sầu',        iconLib: 'mci', iconName: 'function-variant',    color: '#0891B2', topic: 'algebra',     criteria: { type: 'topic_mastery', target: 80 } },
  { id: 'master_numbersense',   title: '🥇 Cảm số 80%',       desc: 'Cảm giác số nhạy bén',     iconLib: 'mci', iconName: 'numeric',             color: '#0D9488', topic: 'numberSense', criteria: { type: 'topic_mastery', target: 80 } },
  { id: 'master_time',          title: '🥇 Giờ–Phút 80%',     desc: 'Không lỡ nhịp phút giây', iconLib: 'ion', iconName: 'time',                color: '#0284C7', topic: 'time',        criteria: { type: 'topic_mastery', target: 80 } },
  { id: 'master_money',         title: '🥇 Tiền tệ 80%',      desc: 'Quản trị con số',          iconLib: 'ion', iconName: 'cash',                color: '#06B6D4', topic: 'money',       criteria: { type: 'topic_mastery', target: 80 } },

  /* TOPIC 100% */
  { id: 'master100_add_sub',     title: '👑 Cộng–Trừ 100%',    desc: 'Toàn năng chủ đề',        iconLib: 'ion', iconName: 'add-circle',          color: '#6D28D9', topic: 'add_sub',     criteria: { type: 'topic_mastery', target: 100 } },
  { id: 'master100_mul_div',     title: '👑 Nhân–Chia 100%',   desc: 'Chinh phục hoàn toàn',     iconLib: 'ion', iconName: 'close-circle',        color: '#7E22CE', topic: 'mul_div',     criteria: { type: 'topic_mastery', target: 100 } },
  { id: 'master100_geometry',    title: '👑 Hình học 100%',    desc: 'Thấu hiểu mọi hình',       iconLib: 'mci', iconName: 'shape',               color: '#BE185D', topic: 'geometry',    criteria: { type: 'topic_mastery', target: 100 } },
  { id: 'master100_algebra',     title: '👑 Đại số 100%',      desc: 'Cao thủ công thức',         iconLib: 'mci', iconName: 'function-variant',    color: '#155E75', topic: 'algebra',     criteria: { type: 'topic_mastery', target: 100 } },
  { id: 'master100_numbersense', title: '👑 Cảm số 100%',      desc: 'Đọc vị con số',            iconLib: 'mci', iconName: 'numeric',             color: '#115E59', topic: 'numberSense', criteria: { type: 'topic_mastery', target: 100 } },
  { id: 'master100_time',        title: '👑 Giờ–Phút 100%',    desc: 'Bậc thầy thời gian',       iconLib: 'ion', iconName: 'time',                color: '#075985', topic: 'time',        criteria: { type: 'topic_mastery', target: 100 } },
  { id: 'master100_money',       title: '👑 Tiền tệ 100%',     desc: 'Tính tiền như thở',        iconLib: 'ion', iconName: 'cash',                color: '#0E7490', topic: 'money',       criteria: { type: 'topic_mastery', target: 100 } },

  /* FUN / EASTER */
  { id: 'first_try',  title: '✨ Bắt đầu!',          desc: 'Nhận huy hiệu đầu tay',                 iconLib: 'ion', iconName: 'sparkles',     color: '#F97316', criteria: { type: 'quizzes_done', target: 1 } },
  { id: 'no_mistake', title: '🛡️ Chuẩn khỏi chỉnh', desc: 'Hoàn thành 1 bài không sai câu nào',    iconLib: 'mci', iconName: 'shield-check', color: '#22C55E', criteria: { type: 'correct_answers', target: 10 } },
];

/* ===================== COLORS ===================== */
function useColors() {
  const { palette } = useTheme();
  return {
    bg: palette?.bg ?? '#0b1220',
    card: palette?.card ?? 'rgba(255,255,255,0.06)',
    line: palette?.line ?? 'rgba(255,255,255,0.08)',
    text: palette?.text ?? '#E5E7EB',
    sub: palette?.subtext ?? 'rgba(255,255,255,0.7)',
    primary: palette?.primary ?? '#7C3AED',
    success: palette?.success ?? '#22C55E',
    danger: palette?.danger ?? '#EF4444',
    warning: palette?.warning ?? '#F59E0B',
    muted: palette?.muted ?? '#94A3B8',
  };
}

/* ===================== HELPERS ===================== */
function clamp01(n: number) {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
function computeProgress(def: BadgeDef, stats: UserStats): number {
  const t = def.criteria.target || 0;
  if (!t) return 0;
  switch (def.criteria.type) {
    case 'streak_days': return clamp01((stats.streak_days ?? 0) / t);
    case 'quizzes_done': return clamp01((stats.quizzes_done ?? 0) / t);
    case 'correct_answers': return clamp01((stats.correct_answers ?? 0) / t);
    case 'speed_score': return clamp01((stats.speed_score ?? 0) / t);
    case 'topic_mastery': {
      const topic = def.topic!;
      const m = stats.topic_mastery?.[topic] ?? 0;
      return clamp01(m / t);
    }
    default: return 0;
  }
}
function Icon({ lib, name, size, color }: { lib?: 'ion' | 'mci'; name: string; size: number; color: string }) {
  if (lib === 'mci') return <MaterialCommunityIcons name={name as any} size={size} color={color} />;
  return <Ionicons name={name as any} size={size} color={color} />;
}

/* === Ngày theo múi giờ Việt Nam + tính streak === */
function vnTodayStr() {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(new Date());
  const y = parts.find(p => p.type === 'year')?.value ?? '1970';
  const m = parts.find(p => p.type === 'month')?.value ?? '01';
  const d = parts.find(p => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${d}`; // yyyy-mm-dd
}
function isYesterday(vnDateStr: string) {
  const [y, m, d] = vnDateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  const [ty, tm, td] = vnTodayStr().split('-').map(Number);
  const today = new Date(Date.UTC(ty, tm - 1, td));
  const diffMs = today.getTime() - dt.getTime();
  const diffDays = Math.round(diffMs / (24 * 3600 * 1000));
  return diffDays === 1;
}

/* ===================== HEADER (memo) ===================== */
type HeaderBarProps = {
  C: ReturnType<typeof useColors>;
  search: string;
  setSearch: (s: string) => void;
  filter: 'all' | 'unlocked' | 'locked';
  setFilter: (f: 'all' | 'unlocked' | 'locked') => void;
  unlockedCount: number;
  total: number;
  onBack: () => void;
};
const HeaderBar = memo(function HeaderBar({
  C, search, setSearch, filter, setFilter, unlockedCount, total, onBack,
}: HeaderBarProps) {
  return (
    <View style={{
      paddingTop: 6,
      paddingHorizontal: 16,
      paddingBottom: 12,
      backgroundColor: C.bg,
      borderBottomWidth: 1,
      borderBottomColor: C.line
    }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <TouchableOpacity onPress={onBack} hitSlop={10} style={{ padding: 6 }}>
          <Ionicons name="chevron-back" size={22} color={C.text} />
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 20, fontWeight: '700' }}>Huy hiệu</Text>
        <View style={{ flex: 1 }} />
        <View style={{ backgroundColor: C.card, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="trophy" size={16} color={C.warning} />
          <Text style={{ color: C.text, fontWeight: '600' }}>{unlockedCount}/{total}</Text>
        </View>
      </View>

      <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
        {(['all', 'unlocked', 'locked'] as const).map((k) => (
          <TouchableOpacity key={k} onPress={() => setFilter(k)} style={{
            backgroundColor: filter === k ? C.primary : C.card,
            paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: C.line
          }}>
            <Text style={{ color: filter === k ? '#fff' : C.text, fontWeight: '600' }}>
              {k === 'all' ? 'Tất cả' : k === 'unlocked' ? 'Đã mở' : 'Chưa mở'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={{ marginTop: 10, backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.line, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10 }}>
        <Ionicons name="search" size={18} color={C.sub} />
        <TextInput
          placeholder="Tìm huy hiệu..."
          placeholderTextColor={C.sub}
          value={search}
          onChangeText={setSearch}
          style={{ flex: 1, color: C.text, paddingVertical: Platform.OS === 'ios' ? 10 : 8, marginLeft: 6 }}
          autoCorrect={false}
          blurOnSubmit={false}        // giữ bàn phím
          returnKeyType="search"
        />
        {search ? (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={C.sub} />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
});

/* ===================== SCREEN ===================== */
export default function BadgesScreen() {
  const router = useRouter();
  const C = useColors();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<BadgeDef[]>(LOCAL_BADGES);
  const [userStats, setUserStats] = useState<UserStats>({});
  const [userBadges, setUserBadges] = useState<Record<string, UserBadgeDoc>>({});
  const [filter, setFilter] = useState<'all' | 'unlocked' | 'locked'>('all');
  const [search, setSearch] = useState('');

  const uid = auth.currentUser?.uid;

  /* -------- Load catalog (optional Firestore override) -------- */
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const snap = await getDocs(collection(db, 'badges'));
        if (!active) return;
        if (!snap.empty) {
          const defs: BadgeDef[] = [];
          snap.forEach((d) => {
            const data = d.data() as any;
            if (data?.criteria?.type && data?.criteria?.target) {
              defs.push({
                id: d.id,
                title: data.title ?? d.id,
                desc: data.desc ?? '',
                iconLib: (data.iconLib as any) ?? 'ion',
                iconName: data.iconName ?? 'trophy',
                color: data.color ?? '#7C3AED',
                topic: data.topic,
                criteria: data.criteria,
              });
            }
          });
          if (defs.length) setCatalog(defs);
        } else setCatalog(LOCAL_BADGES);
      } catch {
        setCatalog(LOCAL_BADGES);
      }
    })();
    return () => { active = false; };
  }, []);

  /* -------- BƯỚC QUAN TRỌNG: Cộng streak theo ngày VN khi có uid -------- */
  useEffect(() => {
    if (!uid) return;

    (async () => {
      const uref = doc(db, 'users', uid);
      const snap = await getDoc(uref);
      const today = vnTodayStr();

      if (!snap.exists()) {
        await setDoc(uref, {
          streak_days: 1,
          quizzes_done: 0,
          correct_answers: 0,
          speed_score: 0,
          topic_mastery: {},
          last_active_vn: today,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true });
        return;
      }

      const data = snap.data() || {};
      const lastActive = data.last_active_vn as string | undefined;

      if (lastActive === today) return;

      let nextStreak = Number(data.streak_days ?? data.streakDays ?? 0);
      if (!lastActive) {
        nextStreak = Math.max(1, nextStreak || 0);
      } else if (isYesterday(lastActive)) {
        nextStreak = (nextStreak || 0) + 1;
      } else {
        nextStreak = 1; // miss ≥1 ngày
      }

      await setDoc(uref, {
        streak_days: nextStreak,
        last_active_vn: today,
        updatedAt: serverTimestamp(),
      }, { merge: true });
    })();
  }, [uid]);

  /* -------- Subscribe user stats + badges -------- */
  useEffect(() => {
    if (!uid) {
      setLoading(false);
      setError('Bạn chưa đăng nhập.');
      return;
    }
    const unsubUser = onSnapshot(doc(db, 'users', uid), (d) => {
      const data = d.data() || {};
      setUserStats({
        streak_days: data.streak_days ?? data.streakDays ?? 0,
        quizzes_done: data.quizzes_done ?? data.quizzesCompleted ?? 0,
        correct_answers: data.correct_answers ?? data.correctAnswers ?? 0,
        speed_score: data.speed_score ?? data.bestSpeed ?? 0,
        topic_mastery: data.topic_mastery ?? data.topicMastery ?? {},
      });
    });
    const unsubBadges = onSnapshot(collection(db, 'users', uid, 'badges'), (qs) => {
      const m: Record<string, UserBadgeDoc> = {};
      qs.forEach((d) => (m[d.id] = { id: d.id, ...(d.data() as any) }));
      setUserBadges(m);
      setLoading(false);
    });
    return () => { unsubUser(); unsubBadges(); };
  }, [uid]);

  /* -------- Auto-claim mọi badge đạt ngưỡng -------- */
  useEffect(() => {
    if (!uid) return;
    if (!catalog.length) return;

    const run = async () => {
      const tasks: Promise<any>[] = [];
      for (const b of catalog) {
        const prog = computeProgress(b, userStats);
        const already = userBadges[b.id]?.completed;
        if (prog >= 1 && !already) {
          const bref = doc(db, 'users', uid, 'badges', b.id);
          tasks.push(setDoc(bref, {
            completed: true,
            progress: 1,
            unlockedAt: serverTimestamp(),
          }, { merge: true }));
        }
      }
      if (tasks.length) {
        try { await Promise.all(tasks); } catch {}
      }
    };
    run();
  }, [uid, catalog, userStats, userBadges]);

  /* -------- Derived list -------- */
  const computed = useMemo(() => {
    const list = catalog
      .filter(b => (search ? (b.title + ' ' + (b.desc ?? '')).toLowerCase().includes(search.toLowerCase()) : true))
      .map((b) => {
        const prog = computeProgress(b, userStats);
        const unlocked = userBadges[b.id]?.completed || prog >= 1;
        return { def: b, progress: clamp01(prog), unlocked, unlockedAt: userBadges[b.id]?.unlockedAt };
      });

    const filtered = list.filter(item =>
      filter === 'all' ? true : filter === 'unlocked' ? item.unlocked : !item.unlocked
    );

    const unlockedCount = list.filter(i => i.unlocked).length;
    return { list, filtered, unlockedCount, total: list.length };
  }, [catalog, userStats, userBadges, filter, search]);

  /* -------- Pull to refresh -------- */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (uid) {
        const ud = await getDoc(doc(db, 'users', uid));
        const data = ud.data() || {};
        setUserStats({
          streak_days: data.streak_days ?? data.streakDays ?? 0,
          quizzes_done: data.quizzes_done ?? data.quizzesCompleted ?? 0,
          correct_answers: data.correct_answers ?? data.correctAnswers ?? 0,
          speed_score: data.speed_score ?? data.bestSpeed ?? 0,
          topic_mastery: data.topic_mastery ?? data.topicMastery ?? {},
        });
        const qs = await getDocs(collection(db, 'users', uid, 'badges'));
        const m: Record<string, UserBadgeDoc> = {};
        qs.forEach((d) => (m[d.id] = { id: d.id, ...(d.data() as any) }));
        setUserBadges(m);
      }
    } finally {
      setRefreshing(false);
    }
  }, [uid]);

  /* -------- Claim button (manual) -------- */
  const claimIfReady = useCallback(async (badgeId: string) => {
    if (!uid) return;
    const docRef = doc(db, 'users', uid, 'badges', badgeId);
    await setDoc(docRef, { completed: true, progress: 1, unlockedAt: serverTimestamp() }, { merge: true });
  }, [uid]);

  /* -------- Item -------- */
  const Item = ({ item }: { item: { def: BadgeDef; progress: number; unlocked: boolean } }) => {
    const size = 94;
    const ringColor = item.unlocked ? (item.def.color ?? C.success) : C.line;
    return (
      <TouchableOpacity
        onPress={() => openDetail(item)}
        onLongPress={__DEV__ ? () => claimIfReady(item.def.id) : undefined}
        delayLongPress={300}
        style={{ width: '33.333%', padding: 8 }}
      >
        <View style={{
          backgroundColor: C.card,
          borderColor: item.unlocked ? ringColor : C.line,
          borderWidth: 1.5,
          borderRadius: 16,
          alignItems: 'center',
          padding: 10,
        }}>
          <View style={{
            width: size, height: size, borderRadius: size / 2,
            justifyContent: 'center', alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.25)', borderWidth: 2, borderColor: ringColor,
          }}>
            <Icon lib={item.def.iconLib} name={item.def.iconName} size={36} color={item.unlocked ? (item.def.color ?? '#fff') : C.muted} />
            {!item.unlocked ? (
              <View style={{ position: 'absolute', right: -4, top: -4, backgroundColor: C.bg, borderRadius: 999, padding: 4, borderWidth: 1, borderColor: C.line }}>
                <Ionicons name="lock-closed" size={16} color={C.muted} />
              </View>
            ) : null}
          </View>
          <Text style={{ color: C.text, fontWeight: '700', marginTop: 8, textAlign: 'center' }} numberOfLines={1}>
            {item.def.title}
          </Text>
          <View style={{ height: 8, width: '100%', backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
            <View style={{ width: `${Math.round(item.progress * 100)}%`, height: '100%', backgroundColor: ringColor }} />
          </View>
          <Text style={{ color: C.sub, fontSize: 12, marginTop: 4 }}>
            {Math.round(item.progress * 100)}%
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  /* -------- Modal -------- */
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState<{
    id: string;
    title: string;
    desc?: string;
    progress: number;
    unlocked: boolean;
    color?: string;
    criteria: BadgeDef['criteria'];
  } | null>(null);
  const openDetail = (item: { def: BadgeDef; progress: number; unlocked: boolean }) => {
    const { def, progress, unlocked } = item;
    setCurrent({
      id: def.id,
      title: def.title,
      desc: def.desc,
      progress,
      unlocked,
      color: def.color,
      criteria: def.criteria,
    });
    setOpen(true);
  };

  /* -------- Loading / Error -------- */
  if (loading) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <HeaderBar
          C={C}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          unlockedCount={0}
          total={0}
          onBack={() => router.replace('/(tabs)/Profile')}
        />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={C.primary} />
          <Text style={{ color: C.sub, marginTop: 10 }}>Đang tải huy hiệu...</Text>
        </View>
      </SafeAreaView>
    );
  }
  if (error) {
    return (
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <HeaderBar
          C={C}
          search={search}
          setSearch={setSearch}
          filter={filter}
          setFilter={setFilter}
          unlockedCount={0}
          total={0}
          onBack={() => router.replace('/(tabs)/Profile')}
        />
        <View style={{ padding: 24 }}>
          <Text style={{ color: C.danger, fontWeight: '700' }}>{error}</Text>
          <Text style={{ color: C.sub, marginTop: 6 }}>Vui lòng đăng nhập để xem huy hiệu.</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* -------- Main -------- */
  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <HeaderBar
        C={C}
        search={search}
        setSearch={setSearch}
        filter={filter}
        setFilter={setFilter}
        unlockedCount={computed.unlockedCount}
        total={computed.total}
        onBack={() => router.replace('/(tabs)/Profile')}
      />

      <FlatList
        data={computed.filtered}
        keyExtractor={(it) => it.def.id}
        numColumns={3}
        renderItem={({ item }) => <Item item={item} />}
        ListEmptyComponent={
          <View style={{ padding: 24, alignItems: 'center' }}>
            <Ionicons name="trophy-outline" size={28} color={C.sub} />
            <Text style={{ color: C.sub, marginTop: 8 }}>Không tìm thấy huy hiệu nào.</Text>
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: 8,
          paddingBottom: insets.bottom + 40,
          paddingTop: 8
        }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} />}
        keyboardShouldPersistTaps="handled"   // không ẩn bàn phím khi chạm list
      />

      {/* Detail Modal */}
      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: C.bg,
            borderTopLeftRadius: 18, borderTopRightRadius: 18,
            paddingBottom: insets.bottom + 16,
            paddingHorizontal: 16, paddingTop: 12,
            borderTopWidth: 1, borderColor: C.line
          }}>
            <View style={{ alignItems: 'center' }}>
              <View style={{ width: 48, height: 4, borderRadius: 2, backgroundColor: C.line, marginBottom: 12 }} />
            </View>
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
              <View style={{ backgroundColor: C.card, borderRadius: 12, padding: 10, borderWidth: 1, borderColor: C.line }}>
                <Ionicons name={current?.unlocked ? 'trophy' : 'trophy-outline'} size={24} color={current?.unlocked ? (current?.color ?? C.warning) : C.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>{current?.title}</Text>
                <Text style={{ color: C.sub, marginTop: 2 }}>{current?.desc}</Text>
              </View>
            </View>

            <View style={{ marginTop: 14 }}>
              <Text style={{ color: C.text, fontWeight: '700' }}>Tiến độ</Text>
              <View style={{ height: 10, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 999, marginTop: 8, overflow: 'hidden' }}>
                <View style={{ width: `${Math.round((current?.progress ?? 0) * 100)}%`, height: '100%', backgroundColor: current?.color ?? C.primary }} />
              </View>
              <Text style={{ color: C.sub, marginTop: 6 }}>
                {Math.round((current?.progress ?? 0) * 100)}% — Mục tiêu: {current?.criteria?.target}
              </Text>
            </View>

            <View style={{ marginTop: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name={current?.unlocked ? 'checkmark-circle' : 'lock-closed'} size={18} color={current?.unlocked ? C.success : C.muted} />
              <Text style={{ color: current?.unlocked ? C.success : C.sub }}>
                {current?.unlocked ? 'Đã mở khóa' : 'Chưa mở khóa'}
              </Text>
            </View>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
              <TouchableOpacity onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: C.card, borderColor: C.line, borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                <Text style={{ color: C.text, fontWeight: '700' }}>Đóng</Text>
              </TouchableOpacity>
              {(!current?.unlocked && (current?.progress ?? 0) >= 1) ? (
                <TouchableOpacity
                  onPress={async () => {
                    await claimIfReady(current!.id);
                    setOpen(false);
                  }}
                  style={{ flex: 1, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12, alignItems: 'center' }}>
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Nhận huy hiệu</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
