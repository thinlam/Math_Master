import { useTheme, type Palette } from '@/theme/ThemeProvider';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert,
  Animated, Easing,
  Image, Modal,
  Platform,
  RefreshControl, ScrollView,
  StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

/* Rainbow text deps */
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';

/* Firebase */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import {
  collection, doc, getDoc, limit, onSnapshot, orderBy, query,
  runTransaction, serverTimestamp,
  Timestamp, updateDoc, where,
} from 'firebase/firestore';

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
    earnedBadges: 'Huy hiệu đã đạt',
    viewAll: 'Xem tất cả',
    noBadges: 'Chưa có huy hiệu nào.',
  },
} as const;
type Lang = 'vi';
const LANG: Lang = 'vi';
function t(key: keyof typeof I18N['vi']) { return I18N[LANG][key]; }

/* Types */
type BadgeItem = { id: string; title: string; icon: string; unlockedAt?: Timestamp | null };
type UserProfile = {
  uid: string; name: string; email: string; level: string | null;
  points: number; badges: BadgeItem[]; streak: number;
  photoURL?: string | null; coins: number; role?: 'user' | 'premium' | 'admin';
};

const CLASS_OPTIONS = [
  'Lớp 1','Lớp 2','Lớp 3','Lớp 4','Lớp 5-Chuyển cấp',
  'Lớp 6','Lớp 7','Lớp 8','Lớp 9-Chuyển cấp',
  'Lớp 10','Lớp 11','Lớp 12-THPTQG',
];

function colorMix(bg: string, fg: string, alpha = 0.1) {
  const a = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase();
  return `${fg}${hexAlpha}`;
}

/* ===== Helpers cho streak theo múi giờ VN ===== */
const VN_TZ = 'Asia/Ho_Chi_Minh';
function localDayString(tz = VN_TZ, d = new Date()) {
  const parts = new Intl.DateTimeFormat('vi-VN', {
    timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(d);
  const dd = parts.find(p => p.type === 'day')?.value ?? '01';
  const mm = parts.find(p => p.type === 'month')?.value ?? '01';
  const yyyy = parts.find(p => p.type === 'year')?.value ?? '1970';
  return `${yyyy}-${mm}-${dd}`;
}
function diffDaysLocal(aYYYYMMDD: string, bYYYYMMDD: string) {
  const [ay, am, ad] = aYYYYMMDD.split('-').map(Number);
  const [by, bm, bd] = bYYYYMMDD.split('-').map(Number);
  const a = Date.UTC(ay, am - 1, ad);
  const b = Date.UTC(by, bm - 1, bd);
  return Math.round((b - a) / 86400000);
}
/** Cập nhật chuỗi ngày an toàn (merge để không lỗi khi field chưa tồn tại) */
async function ensureDailyStreak(uid: string) {
  const userRef = doc(db, 'users', uid);
  const today = localDayString(VN_TZ);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(userRef);
    const data = snap.exists() ? (snap.data() as any) : {};

    let streak = Number(data?.streak ?? 0);
    const last: string | undefined = data?.lastActiveLocalDay;

    if (last === today) return; // đã tính cho hôm nay

    if (!last) {
      streak = Math.max(1, streak || 0) || 1;
    } else {
      const d = diffDaysLocal(last, today);
      if (d === 1) streak = (streak || 0) + 1;
      else if (d > 1) streak = 1;
    }

    tx.set(userRef, {
      streak,
      lastActiveLocalDay: today,
      lastActiveAt: serverTimestamp(),
    }, { merge: true });
  });
}

/* ====== THÔNG BÁO ====== */
type Ann = { id: string; title: string; body?: string | null; createdAt?: Timestamp | null };

/* ---------- RainbowTextAnimated (Animated gradient + fallback web) ---------- */
function RainbowTextAnimated({ children, style }: { children: string; style?: any }) {
  // Dịch trái/phải vô hạn (qua lại êm)
  const t = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    const loop = () => {
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 3500, easing: Easing.linear, useNativeDriver: true }),
      ]).start(() => loop());
    };
    loop();
  }, [t]);

  const translate = t.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200], // độ dài trượt; có thể tăng/giảm tùy fontSize
  });

  if (Platform.OS === 'web') {
    // Fallback Web: màu vàng + shadow (đỡ bị trống)
    return (
      <Text style={[style, { color: '#FACC15', textShadowColor: '#0003', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 }]}>
        {children}
      </Text>
    );
  }

  return (
    <MaskedView maskElement={<Text style={[style, { backgroundColor: 'transparent' }]}>{children}</Text>}>
      <Animated.View style={{ transform: [{ translateX: translate }] }}>
        <LinearGradient
          colors={['#FF0000','#FF7F00','#FFFF00','#00FF00','#0000FF','#4B0082','#8B00FF','#FF0000']}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
          /* Tấm gradient rộng & cao hơn chữ để chạy mượt */
          style={{ width: 600, height: 64 }}
        />
      </Animated.View>
    </MaskedView>
  );
}

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

  /* ===== Announcements state ===== */
  const [annList, setAnnList] = useState<Ann[]>([]);
  const [annModalVisible, setAnnModalVisible] = useState(false);
  const [bannerAnn, setBannerAnn] = useState<Ann | null>(null);
  const [lastSeenAnn, setLastSeenAnn] = useState<Date | null>(null);
  const [initialAnnLoaded, setInitialAnnLoaded] = useState(false);

  /* ===== Badges ===== */
  const [badgeCount, setBadgeCount] = useState(0);
  const [latestBadges, setLatestBadges] = useState<BadgeItem[]>([]);

  /* ===== Subscription active flag ===== */
  const [subActive, setSubActive] = useState(false);

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
          badges: [],
          coins: typeof data.coins === 'number' ? data.coins : 0,
          role: (data.role as 'user' | 'premium' | 'admin') ?? 'user',
        };
        setUser(profile);
        setSelectedClass(profile.level);
      } finally { setLoading(false); }
    }, []
  );

  // Lần vào Home: cập nhật streak rồi refetch
  useEffect(() => {
    if (!firebaseUser) return;
    ensureDailyStreak(firebaseUser.uid)
      .then(() => fetchProfile(firebaseUser))
      .catch(console.error);
  }, [firebaseUser, fetchProfile]);

  /* === Subscribe badges === */
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    const unsub = onSnapshot(collection(db, 'users', uid, 'badges'), (qs) => {
      let count = 0;
      const list: BadgeItem[] = [];
      qs.forEach((d) => {
        const data = d.data() as any;
        if (data?.completed) {
          count++;
          list.push({
            id: d.id,
            title: data.title ?? d.id,
            icon: data.icon ?? 'medal-outline',
            unlockedAt: data.unlockedAt ?? null,
          });
        }
      });
      list.sort((a, b) => {
        const ta = (a.unlockedAt as any)?.seconds ?? 0;
        const tb = (b.unlockedAt as any)?.seconds ?? 0;
        return tb - ta;
      });
      setBadgeCount(count);
      setLatestBadges(list.slice(0, 8));
    });
    return () => unsub();
  }, [firebaseUser]);

  /* === Subscribe subscription active/trialing === */
  useEffect(() => {
    if (!firebaseUser) return;
    const now = new Date();
    const colRef = collection(db, 'users', firebaseUser.uid, 'subscriptions');
    const qActive = query(
      colRef,
      where('status', 'in', ['active', 'trialing']),
      orderBy('createdAt', 'desc'),
      limit(3)
    );
    const unsub = onSnapshot(qActive, (qs) => {
      let active = false;
      qs.forEach((d) => {
        const end = d.data()?.current_period_end?.toDate?.() as Date | undefined;
        if (!end || end > now) active = true; // còn hạn
      });
      setSubActive(active);
    });
    return unsub;
  }, [firebaseUser]);

  const onRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    try {
      await ensureDailyStreak(firebaseUser.uid);
      await fetchProfile(firebaseUser);
    } finally {
      setRefreshing(false);
    }
  }, [firebaseUser, fetchProfile]);

  const initials = useMemo(() => {
    const n = user?.name?.trim() || ''; const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2) || 'U';
  }, [user?.name]);

  /* === PREMIUM FLAG & DISPLAY NAME === */
  const isPremium = (user?.role === 'premium') || subActive;
  const premiumDisplay = `Super ${(user?.name?.trim() && user?.name) || 'User'}`;

  const openClassModal = () => setClassModalVisible(true);
  const saveClass = async () => {
    if (!firebaseUser) return;
    if (!selectedClass) { Alert.alert(t('chooseClass'), t('noClass')); return; }
    try {
      setSavingClass(true);
      await updateDoc(doc(db, 'users', firebaseUser.uid), { level: selectedClass });
      setUser((prev) => (prev ? { ...prev, level: selectedClass } : prev));
      const m = selectedClass.match(/\d+/); if (m) await AsyncStorage.setItem('selectedGrade', String(Number(m[0])));
    } catch (e) { console.error(e); Alert.alert('Lỗi', 'Không thể lưu lớp. Vui lòng thử lại.'); }
    finally { setSavingClass(false); setClassModalVisible(false); }
  };

  const handleStartLearning = useCallback(async () => {
    const levelStr = user?.level ?? selectedClass;
    const m = levelStr?.match(/\d+/);
    if (m) await AsyncStorage.setItem('selectedGrade', String(Number(m[0])));
    router.push('/Learnning/Learn');
  }, [router, user?.level, selectedClass]);

  /* ====== SUBSCRIBE THÔNG BÁO ====== */
  useEffect(() => {
    if (!firebaseUser) return;
    const unsub = onSnapshot(doc(db, 'users', firebaseUser.uid), (d) => {
      const v = d.get('lastSeenAnn');
      setLastSeenAnn(v?.toDate?.() || null);
    });
    return unsub;
  }, [firebaseUser]);

  useEffect(() => {
    const qAll = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(qAll, (snap) => {
      const items = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Ann[];
      setAnnList(items);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const q1 = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(1));
    const unsub = onSnapshot(q1, (snap) => {
      const latest = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) }))[0] as Ann | undefined;

      if (!latest) { setInitialAnnLoaded(true); return; }
      if (!initialAnnLoaded) { setInitialAnnLoaded(true); return; }

      const created = (latest.createdAt as any)?.toDate?.() || new Date();
      if (!lastSeenAnn || created > lastSeenAnn) {
        setBannerAnn(latest);
        const t = setTimeout(() => setBannerAnn(null), 5000);
        return () => clearTimeout(t);
      }
    });
    return unsub;
  }, [initialAnnLoaded, lastSeenAnn]);

  const unreadCount = useMemo(() => {
    if (!lastSeenAnn) return annList.length;
    return annList.filter((a) => {
      const d = (a.createdAt as any)?.toDate?.() || new Date(0);
      return d > lastSeenAnn!;
    }).length;
  }, [annList, lastSeenAnn]);

  const openAnnModal = async () => {
    setAnnModalVisible(true);
    if (firebaseUser) {
      try { await updateDoc(doc(db, 'users', firebaseUser.uid), { lastSeenAnn: new Date() }); } catch {}
    }
  };

  /* ====== UI ====== */
  if (!firebaseUser || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingTxt}>{t('loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top','left','right']}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />

      <ScrollView
        contentContainerStyle={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={palette.brandSoft} />}
      >
        {/* Header */}
        <View style={[styles.headerCard, { position: 'relative' }]}>
          <TouchableOpacity
            onPress={openAnnModal}
            style={{ position: 'absolute', right: 10, top: 10, padding: 6 }}
            hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
          >
            <Ionicons name="notifications-outline" size={22} color={palette.text} />
            {unreadCount > 0 && (
              <View style={{ position: 'absolute', right: 2, top: 2, minWidth: 16, height: 16, borderRadius: 8,
                backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 }}>
                <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '800' }}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: palette.cardBorder }} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{(user?.name?.[0] || 'U').toUpperCase()}</Text></View>
            )}

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* === Premium: Rainbow animated “Super …” | Normal: "Xin chào, Tên" === */}
                {isPremium ? (
                  <RainbowTextAnimated style={[styles.hello, styles.helloBolder]}>
                    {premiumDisplay}
                  </RainbowTextAnimated>
                ) : (
                  <Text style={styles.hello}>
                    {t('hello')}, {(user?.name?.trim() && user?.name) || 'User'}
                  </Text>
                )}

                {isPremium && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#7C3AED',
                    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, marginLeft: 6 }}>
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
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('stats')}</Text>
          <View style={styles.statsRow}>
            <StatCard palette={palette} icon="diamond-stone" color="#9333EA" label={t('points')} value={String(user?.points ?? 0)} />
            <StatCard palette={palette} icon="medal-outline" color={palette.mciGold} label={t('badges')} value={String(badgeCount)} />
            <StatCard palette={palette} icon="fire" color={palette.streak} label={t('streak')} value={`${user?.streak ?? 0} ${t('days')}`} />
          </View>
        </View>

        {/* Huy hiệu gần đây */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.cardTitle}>{t('earnedBadges')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/Profile/Badges')}>
              <Text style={{ color: palette.link, fontWeight: '700' }}>{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {latestBadges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {latestBadges.map((b) => (
                <View key={b.id} style={{
                  width: 110, height: 80, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder,
                  backgroundColor: palette.bg, padding: 10, justifyContent: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name={b.icon as any} size={22} color={palette.mciGold} />
                  <Text style={{ color: palette.textFaint, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{b.title}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={{ marginTop: 6, color: palette.textMuted, fontSize: 13 }}>{t('noBadges')}</Text>
          )}
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

      {/* Modal thông báo */}
      <Modal visible={annModalVisible} transparent animationType="fade" onRequestClose={() => setAnnModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '78%' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={styles.modalTitle}>Thông báo</Text>
              <TouchableOpacity onPress={() => setAnnModalVisible(false)} hitSlop={8}>
                <Ionicons name="close" size={20} color={palette.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {annList.length === 0 ? (
                <Text style={{ color: palette.textMuted, textAlign: 'center', marginVertical: 20 }}>
                  Chưa có thông báo.
                </Text>
              ) : (
                annList.map((a) => {
                  const d = (a.createdAt as any)?.toDate?.() || new Date();
                  return (
                    <View key={a.id} style={{
                      backgroundColor: palette.card, borderColor: palette.cardBorder, borderWidth: 1,
                      borderRadius: 12, padding: 12, marginBottom: 10 }}>
                      <Text style={{ color: palette.text, fontWeight: '800' }}>{a.title}</Text>
                      {!!a.body && <Text style={{ color: palette.textMuted, marginTop: 6 }}>{a.body}</Text>}
                      <Text style={{ color: palette.textMuted, fontSize: 12, marginTop: 6 }}>
                        {String(d.getHours()).padStart(2, '0')}:{String(d.getMinutes()).padStart(2, '0')}
                        {' • '}
                        {String(d.getDate()).padStart(2, '0')}/{String(d.getMonth() + 1).padStart(2, '0')}/{d.getFullYear()}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
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
    helloBolder: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 }, // dùng cho Rainbow “Super …”
    levelRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8 },
    levelPill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: p.pillBg, borderWidth: 1, borderColor: p.pillBorder },
    levelTxt: { color: p.textFaint, fontSize: 12, fontWeight: '600' },

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
