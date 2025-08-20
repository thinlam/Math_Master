import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* Firebase */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

/* i18n (rút gọn) */
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
    coins: 'Xu',
    topup: 'Nạp xu',
  },
} as const;

type Lang = 'vi';
const LANG: Lang = 'vi';
function t(key: keyof typeof I18N['vi']) { return I18N[LANG][key]; }

type BadgeItem = { id: string; title: string; icon: string };
type UserProfile = {
  uid: string;
  name: string;
  email: string;
  level: string | null;
  points: number;
  badges: BadgeItem[];
  streak: number;
  photoURL?: string | null;
  coins: number;
  role?: 'user' | 'premium' | 'admin';
};

const CLASS_OPTIONS = [
  'Lớp 1','Lớp 2','Lớp 3','Lớp 4','Lớp 5-Chuyển cấp',
  'Lớp 6','Lớp 7','Lớp 8','Lớp 9-Chuyển cấp',
  'Lớp 10','Lớp 11','Lớp 12-THPTQG',
];

function classToGradeNumber(levelStr: string): number | null {
  const m = levelStr.match(/\d+/); if (!m) return null;
  const n = Number(m[0]); return n >= 1 && n <= 12 ? n : null;
}
function formatCoins(n: number) { return new Intl.NumberFormat('vi-VN').format(n); }

export default function HomeScreen() {
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [classModalVisible, setClassModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) router.replace('/(auth)/login');
    });
    return unsub;
  }, [router]);

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
          photoURL: (data.photoURL as string) ?? u.photoURL ?? null,
          level: data.level ?? null,
          points: typeof data.points === 'number' ? data.points : 0,
          streak: typeof data.streak === 'number' ? data.streak : 0,
          badges: Array.isArray(data.badges) ? data.badges : [],
          coins: typeof data.coins === 'number' ? data.coins : 0,
          role: (data.role as 'user' | 'premium' | 'admin') ?? 'user',
        };
        setUser(profile);
        setSelectedClass(profile.level);
      } finally { setLoading(false); }
    }, []
  );

  useEffect(() => { if (firebaseUser) fetchProfile(firebaseUser); }, [firebaseUser, fetchProfile]);

  const onRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    await fetchProfile(firebaseUser);
    setRefreshing(false);
  }, [firebaseUser, fetchProfile]);

  const initials = useMemo(() => {
    const n = user?.name?.trim() || ''; const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2) || 'U';
  }, [user?.name]);

  const openClassModal = () => setClassModalVisible(true);
  const closeClassModal = () => setClassModalVisible(false);

  const saveClass = async () => {
    if (!firebaseUser) return;
    if (!selectedClass) { Alert.alert(t('chooseClass'), t('noClass')); return; }
    try {
      setSavingClass(true);
      await updateDoc(doc(db, 'users', firebaseUser.uid), { level: selectedClass });
      setUser((prev) => (prev ? { ...prev, level: selectedClass } : prev));
      const g = classToGradeNumber(selectedClass); if (g) await AsyncStorage.setItem('selectedGrade', String(g));
      closeClassModal(); router.push('/');
    } catch (e) { console.error(e); Alert.alert('Lỗi', 'Không thể lưu lớp. Vui lòng thử lại.'); }
    finally { setSavingClass(false); }
  };

  const handleStartLearning = useCallback(async () => {
    const levelStr = user?.level ?? selectedClass;
    const g = levelStr ? classToGradeNumber(levelStr) : null;
    if (g) await AsyncStorage.setItem('selectedGrade', String(g));
    router.push('/Learnning/Learn');
  }, [router, user?.level, selectedClass]);

  // const goTopUp = useCallback(() => { router.push('/(tabs)/Store'); }, [router]);

  if (!firebaseUser || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} translucent={false} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingTxt}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','left','right']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} translucent={false} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brandSoft} />}
      >
        {/* Header */}
        <View style={styles.headerCard}>
          <View style={styles.row}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: palette.cardBorder }} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
            )}

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                <Text style={styles.hello}>{t('hello')}, {user?.name || 'User'}</Text>

                {user?.role === 'premium' && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 6 }}>
                    <Ionicons name="star" size={14} color="#FFF" />
                    <Text style={{ color: '#FFF', fontSize: 12, fontWeight: '700', marginLeft: 4 }}>Premium</Text>
                  </View>
                )}
                {user?.role === 'admin' && (
                  <MaterialCommunityIcons name="shield-crown" size={16} color="#60A5FA" style={{ marginLeft: 6 }} />
                )}
              </View>

              <View style={[styles.levelRow, { flexWrap: 'wrap' }]}>
                <View style={[styles.levelPill, !user?.level && { borderStyle: 'dashed', backgroundColor: 'transparent' }]}>
                  <Ionicons name="school-outline" size={16} color={palette.ionMain} />
                  <Text style={styles.levelTxt}>{user?.level || t('noClass')}</Text>
                </View>

                {/* <View style={styles.coinPill}>
                  <Ionicons name="cash-outline" size={16} color={palette.coinIcon} />
                  <Text style={styles.coinTxt}>{formatCoins(user?.coins ?? 0)} {t('coins')}</Text>
                  <TouchableOpacity style={styles.topupBtn} onPress={goTopUp}>
                    <Ionicons name="add" size={14} color={palette.editBtnText} />
                    <Text style={styles.topupTxt}>{t('topup')}</Text>
                  </TouchableOpacity>
                </View> */}

                <TouchableOpacity style={styles.changeBtn} onPress={() => setClassModalVisible(true)}>
                  <Ionicons name="create-outline" size={16} color={palette.editBtnText} />
                  <Text style={styles.changeTxt}>{user?.level ? t('changeClass') : t('chooseClass')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('quickActions')}</Text>
          <View style={styles.quickRow}>
            <QuickButton palette={palette} icon="rocket-outline" label={t('startLearning')} onPress={handleStartLearning} />
            <QuickButton palette={palette} icon="create-outline" label={t('practice')} onPress={() => router.push('/(tabs)/Practice')} />
            <QuickButton palette={palette} icon="flash-outline" label={t('challenge')} onPress={() => router.push('/challenge')} />
            {/* <QuickButton palette={palette} icon="wallet-outline" label={t('topup')} onPress={goTopUp} /> */}
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('stats')}</Text>
          <View style={styles.statsRow}>
            <StatCard palette={palette} icon="diamond-stone" color="#9333EA" label={t('points')} value={String(user?.points ?? 0)} />
            <StatCard palette={palette} icon="medal-outline" color={palette.mciGold} label={t('badges')} value={String(user?.badges?.length ?? 0)} />
            <StatCard palette={palette} icon="fire" color={palette.streak} label={t('streak')} value={`${user?.streak ?? 0} ${t('days')}`} />
          </View>
        </View>
      </ScrollView>

      {/* Modal chọn lớp */}
      <Modal visible={classModalVisible} transparent animationType="fade" onRequestClose={() => setClassModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('selectTitle')}</Text>
            <View style={styles.grid}>
              {CLASS_OPTIONS.map((cls) => {
                const active = selectedClass === cls;
                return (
                  <TouchableOpacity key={cls} style={[styles.classItem, active && styles.classItemActive]} onPress={() => setSelectedClass(cls)}>
                    <Text style={[styles.classTxt, active && styles.classTxtActive]}>{cls}</Text>
                    {active && <Ionicons name="checkmark-circle" size={18} color="#10B981" />}
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setClassModalVisible(false)} disabled={savingClass}>
                <Text style={styles.modalBtnTxt}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn, savingClass && { opacity: 0.6 }]} onPress={saveClass} disabled={savingClass}>
                <Text style={[styles.modalBtnTxt, { color: palette.editBtnText, fontWeight: '700' }]}>
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
function QuickButton({ icon, label, onPress, palette }: { icon: any; label: string; onPress?: () => void; palette: Palette; }) {
  return (
    <TouchableOpacity style={[quickStyles.btn, { backgroundColor: palette.editBtnBg }]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={palette.editBtnText} />
      <Text style={[quickStyles.txt, { color: palette.editBtnText }]}>{label}</Text>
    </TouchableOpacity>
  );
}
const quickStyles = StyleSheet.create({ btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 6 }, txt: { fontWeight: '700' } });

function StatCard({ icon, label, value, color, palette }: { icon: any; label: string; value: string; color: string; palette: Palette; }) {
  return (
    <View style={{ flex: 1, backgroundColor: palette.card, borderRadius: 14, padding: 12, borderWidth: 1, borderColor: palette.cardBorder, alignItems: 'flex-start', gap: 6 }}>
      <View style={{ borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6, backgroundColor: `${color}${palette.statIconBgAlpha}` }}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={{ color: palette.text, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: palette.textMuted, fontSize: 12 }}>{label}</Text>
    </View>
  );
}

/* ---------- Styles ---------- */
function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    scroll: { padding: 16, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    loadingTxt: { color: p.textMuted },

    headerCard: { backgroundColor: p.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.cardBorder },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center' },

    avatar: { width: 60, height: 60, borderRadius: 999, backgroundColor: p.cardBorder, justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { color: p.brand, fontSize: 20, fontWeight: '700' },

    hello: { fontSize: 18, fontWeight: '700', color: p.text },
    levelRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    levelPill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: p.pillBg, borderWidth: 1, borderColor: p.pillBorder },
    levelTxt: { color: p.textFaint, fontSize: 12, fontWeight: '600' },

    coinPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: p.pillBg, borderWidth: 1, borderColor: p.pillBorder },
    coinTxt: { color: p.textFaint, fontSize: 12, fontWeight: '700' },
    topupBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: p.editBtnBg, marginLeft: 4 },
    topupTxt: { color: p.editBtnText, fontWeight: '700', fontSize: 12 },

    changeBtn: { flexDirection: 'row', gap: 6, backgroundColor: p.editBtnBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    changeTxt: { color: p.editBtnText, fontWeight: '700' },

    card: { backgroundColor: p.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.cardBorder },
    cardTitle: { color: p.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },

    quickRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },

    statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { width: '100%', backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.cardBorder, padding: 14 },
    modalTitle: { color: p.text, fontWeight: '700', fontSize: 16, marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    classItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: p.cardBorder, backgroundColor: p.bg },
    classItemActive: { borderColor: '#10B98155', backgroundColor: colorMix(p.bg, '#10B981', 0.08) },
    classTxt: { color: p.textFaint, fontWeight: '600' },
    classTxtActive: { color: '#D1FAE5' },

    modalActions: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
    modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: p.cardBorder, backgroundColor: p.bg },
    cancelBtn: {},
    saveBtn: { backgroundColor: p.editBtnBg, borderColor: p.editBtnBg },
    modalBtnTxt: { color: p.text, fontWeight: '600' },
  });
}

function colorMix(bg: string, fg: string, alpha = 0.1) {
  const a = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase();
  return `${fg}${hexAlpha}`;
}
