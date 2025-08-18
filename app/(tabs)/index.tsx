// app/(tabs)/index.tsx hoặc app/(tabs)/home.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/* ===========================
   Firebase
   =========================== */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/* ===========================
   i18n (ngắn gọn)
   =========================== */
const I18N = {
  vi: {
    hello: 'Xin chào',
    noClass: 'Chưa chọn lớp',
    chooseClass: 'Chọn lớp',
    changeClass: 'Đổi lớp',
    yourClass: 'Lớp của bạn',
    quickActions: 'Bắt đầu nhanh',
    startLearning: 'Bắt đầu học',
    practice: 'Luyện tập',
    challenge: 'Thử thách',
    stats: 'Thống kê',
    points: 'Điểm',
    badges: 'Huy hiệu',
    streak: 'Chuỗi ngày',
    days: 'ngày',
    selectTitle: 'Chọn lớp của bạn',
    saving: 'Đang lưu...',
    save: 'Lưu',
    cancel: 'Hủy',
    loading: 'Đang tải...',
  },
} as const;

type Lang = 'vi';
const LANG: Lang = 'vi';
function t(key: keyof typeof I18N['vi']) {
  return I18N[LANG][key];
}

/* ===========================
   Kiểu dữ liệu
   =========================== */
type BadgeItem = { id: string; title: string; icon: string };
type UserProfile = {
  uid: string;
  name: string;
  email: string;
  level: string | null; // chuỗi: "Lớp 1"
  points: number;
  badges: BadgeItem[];
  streak: number;
  photoURL?: string | null;
};

/* ===========================
   Danh sách lớp
   =========================== */
const CLASS_OPTIONS = [
  'Lớp 1', 'Lớp 2', 'Lớp 3', 'Lớp 4', 'Lớp 5-Chuyển cấp',
  'Lớp 6', 'Lớp 7', 'Lớp 8', 'Lớp 9-Chuyển cấp',
  'Lớp 10', 'Lớp 11', 'Lớp 12-THPTQG',
];

/* ===========================
   Helper: chuyển “Lớp X” -> number
   =========================== */
function classToGradeNumber(levelStr: string): number | null {
  const m = levelStr.match(/\d+/);
  if (!m) return null;
  const n = Number(m[0]);
  return n >= 1 && n <= 12 ? n : null;
}

/* ===========================
   Home Screen
   =========================== */
export default function HomeScreen() {
  const router = useRouter();

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [classModalVisible, setClassModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);

  // Theo dõi đăng nhập
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) router.replace('/(auth)/login');
    });
    return unsub;
  }, [router]);

  // Tải hồ sơ
  const fetchProfile = useCallback(
    async (u: User) => {
      setLoading(true);
      try {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as any) : {};
        const profile: UserProfile = {
          uid: u.uid,
          name: u.displayName || data.name || 'User',
          email: u.email || data.email || 'user@example.com',
          photoURL: u.photoURL || data.photoURL || null,
          level: data.level ?? null,
          points: typeof data.points === 'number' ? data.points : 0,
          streak: typeof data.streak === 'number' ? data.streak : 0,
          badges: Array.isArray(data.badges) ? data.badges : [],
        };
        setUser(profile);
        setSelectedClass(profile.level);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (firebaseUser) fetchProfile(firebaseUser);
  }, [firebaseUser, fetchProfile]);

  const onRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    await fetchProfile(firebaseUser);
    setRefreshing(false);
  }, [firebaseUser, fetchProfile]);

  const initials = useMemo(() => {
    const n = user?.name?.trim() || '';
    const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2) || 'U';
  }, [user?.name]);

  const openClassModal = () => setClassModalVisible(true);
  const closeClassModal = () => setClassModalVisible(false);

  // Lưu lớp mới
  const saveClass = async () => {
    if (!firebaseUser) return;
    if (!selectedClass) {
      Alert.alert(t('chooseClass'), t('noClass'));
      return;
    }
    try {
      setSavingClass(true);
      await updateDoc(doc(db, 'users', firebaseUser.uid), { level: selectedClass });
      setUser((prev) => (prev ? { ...prev, level: selectedClass } : prev));

      // sync sang AsyncStorage cho màn Learn
      const g = classToGradeNumber(selectedClass);
      if (g) {
        await AsyncStorage.setItem('selectedGrade', String(g));
      }

      closeClassModal();

      // điều hướng sang Learn luôn
      router.push('/');
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu lớp. Vui lòng thử lại.');
    } finally {
      setSavingClass(false);
    }
  };

  // nút "Bắt đầu học"
  const handleStartLearning = useCallback(async () => {
    const levelStr = user?.level ?? selectedClass;
    const g = levelStr ? classToGradeNumber(levelStr) : null;
    if (g) {
      await AsyncStorage.setItem('selectedGrade', String(g));
    }
    router.push('/Learnning/Learn');
  }, [router, user?.level, selectedClass]);

  /* ---------- Loading ---------- */
  if (!firebaseUser || loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingTxt}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  /* ---------- UI ---------- */
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#93C5FD" />
        }
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.row}>
            <View style={styles.avatar}>
              <Text style={styles.avatarTxt}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.hello}>
                {t('hello')}, {user?.name || 'User'} 👋
              </Text>

              <View style={styles.levelRow}>
                <View
                  style={[
                    styles.levelPill,
                    !user?.level && { borderStyle: 'dashed', backgroundColor: 'transparent' },
                  ]}
                >
                  <Ionicons name="school-outline" size={16} color="#4F46E5" />
                  <Text style={styles.levelTxt}>{user?.level || t('noClass')}</Text>
                </View>

                <TouchableOpacity style={styles.changeBtn} onPress={openClassModal}>
                  <Ionicons name="create-outline" size={16} color="#111827" />
                  <Text style={styles.changeTxt}>
                    {user?.level ? t('changeClass') : t('chooseClass')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('quickActions')}</Text>
          <View style={styles.quickRow}>
            <QuickButton icon="rocket-outline" label={t('startLearning')} onPress={handleStartLearning} />
            <QuickButton icon="create-outline" label={t('practice')} onPress={() => router.push('/(tabs)/Practice')} />
            <QuickButton icon="flash-outline" label={t('challenge')} onPress={() => router.push('/challenge')} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('stats')}</Text>
          <View style={styles.statsRow}>
            <StatCard icon="diamond-stone" color="#9333EA" label={t('points')} value={String(user?.points ?? 0)} />
            <StatCard icon="medal-outline" color="#F59E0B" label={t('badges')} value={String(user?.badges?.length ?? 0)} />
            <StatCard icon="fire" color="#EF4444" label={t('streak')} value={`${user?.streak ?? 0} ${t('days')}`} />
          </View>
        </View>
      </ScrollView>

      {/* Modal chọn lớp */}
      <Modal visible={classModalVisible} transparent animationType="fade" onRequestClose={closeClassModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('selectTitle')}</Text>
            <View style={styles.grid}>
              {CLASS_OPTIONS.map((cls) => {
                const active = selectedClass === cls;
                return (
                  <TouchableOpacity
                    key={cls}
                    style={[styles.classItem, active && styles.classItemActive]}
                    onPress={() => setSelectedClass(cls)}
                  >
                    <Text style={[styles.classTxt, active && styles.classTxtActive]}>{cls}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeClassModal} disabled={savingClass}>
                <Text style={styles.modalBtnTxt}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn, savingClass && { opacity: 0.6 }]}
                onPress={saveClass}
                disabled={savingClass}
              >
                <Text style={[styles.modalBtnTxt, { color: '#111827', fontWeight: '700' }]}>
                  {savingClass ? t('saving') : t('save')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- Sub Components ---------- */
function QuickButton({ icon, label, onPress }: { icon: any; label: string; onPress?: () => void }) {
  return (
    <TouchableOpacity style={styles.quickBtn} onPress={onPress}>
      <Ionicons name={icon} size={18} color="#111827" />
      <Text style={styles.quickTxt}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ icon, label, value, color }: { icon: any; label: string; value: string; color: string }) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1220' },
  scroll: { padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  loadingTxt: { color: '#CBD5E1' },
  headerCard: { backgroundColor: '#0F172A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1F2A44' },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  avatar: { width: 60, height: 60, borderRadius: 999, backgroundColor: '#1E293B', justifyContent: 'center', alignItems: 'center' },
  avatarTxt: { color: '#0EA5E9', fontSize: 20, fontWeight: '700' },
  hello: { fontSize: 18, fontWeight: '700', color: '#E5E7EB' },
  levelRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
  levelPill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#111827', borderWidth: 1, borderColor: '#1F2A44' },
  levelTxt: { color: '#CBD5E1', fontSize: 12, fontWeight: '600' },
  changeBtn: { flexDirection: 'row', gap: 6, backgroundColor: '#93C5FD', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
  changeTxt: { color: '#111827', fontWeight: '700' },
  card: { backgroundColor: '#0F172A', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#1F2A44' },
  cardTitle: { color: '#E5E7EB', fontSize: 16, fontWeight: '700', marginBottom: 10 },
  quickRow: { flexDirection: 'row', gap: 10 },
  quickBtn: { flex: 1, backgroundColor: '#93C5FD', paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 6 },
  quickTxt: { color: '#111827', fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: { flex: 1, backgroundColor: '#0F172A', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: '#1F2A44', alignItems: 'flex-start', gap: 6 },
  statIconWrap: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  statValue: { color: '#F8FAFC', fontSize: 18, fontWeight: '700' },
  statLabel: { color: '#94A3B8', fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
  modalCard: { width: '100%', backgroundColor: '#0F172A', borderRadius: 16, borderWidth: 1, borderColor: '#1F2A44', padding: 14 },
  modalTitle: { color: '#E5E7EB', fontWeight: '700', fontSize: 16, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  classItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1F2A44', backgroundColor: '#0B1220' },
  classItemActive: { borderColor: '#10B98155', backgroundColor: '#0B1A14' },
  classTxt: { color: '#CBD5E1', fontWeight: '600' },
  classTxtActive: { color: '#D1FAE5' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
  modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#1F2A44', backgroundColor: '#0B1220' },
  saveBtn: { backgroundColor: '#93C5FD', borderColor: '#93C5FD' },
  modalBtnTxt: { color: '#E5E7EB', fontWeight: '600' },
});
