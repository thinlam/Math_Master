// app/(tabs)/Profile/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { makeProfileStyles, ProfileStatCardStyles } from '@/components/style/tab/ProfileStyles';

/* Firebase core + Firestore */
import { auth, db } from '@/scripts/firebase';
import { FirebaseError } from 'firebase/app';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';

/* Theme */
import { useTheme, type Palette } from '@/theme/ThemeProvider';

/* ---------------- I18N ---------------- */
const I18N = {
  vi: {
    user: 'Người dùng',
    noClass: 'Chưa chọn lớp',
    points: 'Điểm',
    badges: 'Huy hiệu',
    streak: 'Chuỗi ngày',
    days: 'ngày',
    earnedBadges: 'Huy hiệu đã đạt',
    viewAll: 'Xem tất cả',
    account: 'Tài khoản',
    changePassword: 'Đổi mật khẩu',
    linkGoogle: 'Liên kết Google',
    appSettings: 'Cài đặt ứng dụng',
    darkMode: 'Chế độ tối',
    language: 'Ngôn ngữ',
    notifications: 'Thông báo',
    notifStudy: 'Nhắc học bài hằng ngày',
    notifMarketing: 'Nhận tin khuyến mãi',
    edit: 'Sửa',
    logout: 'Đăng xuất',
    loggedOut: 'Bạn đã đăng xuất.',
    noBadges: 'Chưa có huy hiệu nào — bắt đầu học để nhận huy hiệu nhé!',
    demoEmail: 'user@example.com',
    loading: 'Đang tải...',
    errorLoad: 'Tải hồ sơ thất bại.',
    pullToRefresh: 'Kéo để làm mới',
  },
  en: {
    user: 'User',
    noClass: 'No class selected',
    points: 'Points',
    badges: 'Badges',
    streak: 'Streak',
    days: 'days',
    earnedBadges: 'Earned Badges',
    viewAll: 'View all',
    account: 'Account',
    changePassword: 'Change password',
    linkGoogle: 'Link Google',
    appSettings: 'App settings',
    darkMode: 'Dark mode',
    language: 'Language',
    notifications: 'Notifications',
    notifStudy: 'Daily study reminder',
    notifMarketing: 'Receive promotions',
    edit: 'Edit',
    logout: 'Log out',
    loggedOut: 'You have logged out.',
    noBadges: 'No badges yet — start learning to earn some!',
    demoEmail: 'user@example.com',
    loading: 'Loading...',
    errorLoad: 'Failed to load profile.',
    pullToRefresh: 'Pull to refresh',
  },
} as const;
type Lang = 'vi' | 'en';
const SETTINGS_KEYS = {
  language: 'profile_language',
  notifStudy: 'profile_notif_study',
  notifMarketing: 'profile_notif_marketing',
};
function t(lang: Lang, key: keyof typeof I18N['vi']) {
  return I18N[lang][key];
}

/* ---------------- Types ---------------- */
type BadgeItem = { id: string; title: string; icon: string };
type UserProfile = {
  uid: string;
  name: string;
  email: string;
  level: string | null;
  points: number;
  streak: number;
  photoURL?: string | null;
};

/* ========= Helpers tính streak theo mốc ngày UTC ========= */
function startOfUTCDay(d: Date) { return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); }
function diffDaysUTC(a: Date, b: Date) { return Math.floor((startOfUTCDay(b) - startOfUTCDay(a)) / 86400000); }

/* ========= Transaction cập nhật streak ========= */
async function updateStreakOnLogin(uid: string) {
  const ref = doc(db, 'users', uid);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    const now = new Date();

    if (!snap.exists()) {
      tx.set(ref, { streak_days: 1, lastLoginAt: serverTimestamp(), _touchedAt: serverTimestamp() }, { merge: true });
      return;
    }

    const data = snap.data() as any;
    const prevStreak = typeof data.streak_days === 'number' ? data.streak_days : 0;
    const lastTs: Timestamp | null = data.lastLoginAt ?? null;

    if (!lastTs) {
      tx.update(ref, { streak_days: Math.max(1, prevStreak || 1), lastLoginAt: serverTimestamp(), _touchedAt: serverTimestamp() });
      return;
    }

    const gap = diffDaysUTC(lastTs.toDate(), now);
    if (gap <= 0) {
      tx.set(ref, { _touchedAt: serverTimestamp(), lastLoginAt: serverTimestamp() }, { merge: true });
    } else if (gap === 1) {
      tx.update(ref, { streak_days: (prevStreak || 0) + 1, lastLoginAt: serverTimestamp(), _touchedAt: serverTimestamp() });
    } else {
      tx.update(ref, { streak_days: 1, lastLoginAt: serverTimestamp(), _touchedAt: serverTimestamp() });
    }
  });
}

/* ========= Retry wrapper ========= */
async function updateStreakOnLoginWithRetry(uid: string) {
  const maxAttempts = 3;
  let attempt = 0;
  while (true) {
    try { await updateStreakOnLogin(uid); return; }
    catch (e: any) {
      const code = e instanceof FirebaseError ? e.code : e?.code;
      if (code !== 'failed-precondition' || ++attempt >= maxAttempts) throw e;
      await new Promise(r => setTimeout(r, 80 + Math.floor(Math.random() * 140)));
    }
  }
}

/* ========= Gate chống gọi trùng ========= */
const streakGateRef = { inFlight: false, lastRun: 0 };
async function safeUpdateStreak(uid: string) {
  if (streakGateRef.inFlight || Date.now() - streakGateRef.lastRun < 5000) return;
  streakGateRef.inFlight = true;
  try { await updateStreakOnLoginWithRetry(uid); streakGateRef.lastRun = Date.now(); }
  finally { streakGateRef.inFlight = false; }
}

/* ---------------- Screen ---------------- */
export default function ProfileScreen() {
  const router = useRouter();
  const { colorScheme, palette, setTheme } = useTheme();
  const styles = useMemo(() => makeProfileStyles(palette), [palette]);

  // Settings
  const [language, setLanguage] = useState<Lang>('vi');
  const [notifStudy, setNotifStudy] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // Firebase & data
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [badgeCount, setBadgeCount] = useState(0);
  const [latestBadges, setLatestBadges] = useState<BadgeItem[]>([]);

  // UI
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---- load local settings ---- */
  useEffect(() => {
    (async () => {
      const [l, s, m] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEYS.language),
        AsyncStorage.getItem(SETTINGS_KEYS.notifStudy),
        AsyncStorage.getItem(SETTINGS_KEYS.notifMarketing),
      ]);
      if (l === 'vi' || l === 'en') setLanguage(l);
      if (s !== null) setNotifStudy(s === 'true');
      if (m !== null) setNotifMarketing(m === 'true');
    })();
  }, []);

  /* ---- auth state ---- */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) router.replace('/(auth)/login');
    });
    return unsub;
  }, [router]);

  /* ---- fetch profile ---- */
  const fetchProfile = useCallback(async (u: User) => {
    setLoading(true); setError(null);
    try {
      const ref = doc(db, 'users', u.uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? (snap.data() as any) : {};
      const profile: UserProfile = {
        uid: u.uid,
        name: u.displayName || data.name || t(language, 'user'),
        email: u.email || data.email || t(language, 'demoEmail'),
        photoURL: (data.photoURL as string) ?? u.photoURL ?? null,
        level: data.level ?? null,
        points: typeof data.points === 'number' ? data.points : 0,
        streak:
          (typeof data.streak_days === 'number' && data.streak_days) ||
          (typeof data.streakDays === 'number' && data.streakDays) ||
          (typeof data.streak === 'number' && data.streak) || 0,
      };
      setUser(profile);
    } catch (e) {
      console.error(e);
      setError(t(language, 'errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [language]);

  useEffect(() => { if (firebaseUser) fetchProfile(firebaseUser); }, [firebaseUser, fetchProfile]);
  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { if (active && firebaseUser) await fetchProfile(firebaseUser); })();
    return () => { active = false; };
  }, [firebaseUser, fetchProfile]));

  /* ---- subscribe: user doc + badges ---- */
  useEffect(() => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;

    const unsubUser = onSnapshot(doc(db, 'users', uid), (snap) => {
      const d = snap.data() || {};
      setUser((prev) => prev ? {
        ...prev,
        level: d.level ?? prev.level ?? null,
        points: typeof d.points === 'number' ? d.points : prev.points,
        streak: (typeof d.streak_days === 'number' && d.streak_days) ||
                (typeof d.streakDays === 'number' && d.streakDays) ||
                (typeof d.streak === 'number' && d.streak) ||
                prev.streak || 0,
        photoURL: (d.photoURL as string) ?? prev.photoURL ?? null,
        name: d.name ?? prev.name,
        email: d.email ?? prev.email,
      } : null);
    });

    const colRef = collection(db, 'users', uid, 'badges');
    const unsubBadges = onSnapshot(colRef, (qs) => {
      let count = 0;
      const list: { id: string; title?: string; icon?: string; unlockedAt?: any }[] = [];
      qs.forEach((d) => {
        const data = d.data() as any;
        if (data?.completed) count++;
        list.push({ id: d.id, title: data?.title, icon: data?.icon, unlockedAt: data?.unlockedAt });
      });
      list.sort((a, b) => ((b.unlockedAt?.seconds ?? 0) - (a.unlockedAt?.seconds ?? 0)));
      setBadgeCount(count);
      const mapped: BadgeItem[] = list
        .filter((x) => !!x.title || !!x.icon)
        .slice(0, 3)
        .map((x) => ({ id: x.id, title: x.title ?? x.id, icon: x.icon ?? 'medal-outline' }));
      setLatestBadges(mapped);
    });

    return () => { unsubUser(); unsubBadges(); };
  }, [firebaseUser]);

  /* ---- cập nhật streak an toàn ---- */
  useEffect(() => { if (firebaseUser) safeUpdateStreak(firebaseUser.uid).catch(console.error); }, [firebaseUser]);
  useFocusEffect(useCallback(() => { if (firebaseUser) safeUpdateStreak(firebaseUser.uid).catch(console.error); }, [firebaseUser]));

  /* ---- helpers ---- */
  const initials = useMemo(() => {
    const n = user?.name?.trim() || ''; const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2) || 'U';
  }, [user?.name]);

  const onLogout = async () => {
    try { await signOut(auth); } catch (e) { console.error(e); }
    finally { Alert.alert(t(language, 'logout'), t(language, 'loggedOut')); router.replace('/(auth)/login'); }
  };

  const onRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    await fetchProfile(firebaseUser);
    setRefreshing(false);
  }, [firebaseUser, fetchProfile]);

  /* ---- Loading / Error ---- */
  if (!firebaseUser || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <View style={styles.center}>
          <ActivityIndicator size="large" />
          <Text style={{ color: palette.textMuted }}>{t(language, 'loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} />
        <View style={styles.errorWrap}>
          <Text style={{ color: palette.danger }}>{error || t(language, 'errorLoad')}</Text>
          <TouchableOpacity style={styles.errorBtn} onPress={() => firebaseUser && fetchProfile(firebaseUser)}>
            <Text style={styles.errorBtnTxt}>{t(language, 'pullToRefresh')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  /* ---- Render ---- */
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
        <View style={styles.card}>
          <View style={styles.row}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.email} numberOfLines={1}>{user.email}</Text>

              <View style={[styles.levelPill, !user.level && styles.levelPillEmpty]}>
                <Ionicons name="school-outline" size={16} color={palette.ionMain} />
                <Text style={styles.levelTxt}>{user.level || t(language, 'noClass')}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/(EditProfile)/edit')}>
              <Ionicons name="create-outline" size={18} color={palette.editBtnText} />
              <Text style={styles.editBtnTxt}>{t(language, 'edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard icon="diamond-stone" color="#9333EA" label={t(language, 'points')} value={String(user.points)} palette={palette} />
          <StatCard icon="medal-outline" color={palette.mciGold} label={t(language, 'badges')} value={String(badgeCount)} palette={palette} />
          <StatCard icon="fire" color={palette.streak} label={t(language, 'streak')} value={`${user.streak} ${t(language, 'days')}`} palette={palette} />
        </View>

        {/* Earned Badges (latest 3) */}
        <View style={styles.card}>
          <View style={styles.earnedHeader}>
            <Text style={styles.earnedTitle}>{t(language, 'earnedBadges')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/Profile/Badges')}>
              <Text style={styles.earnedLink}>{t(language, 'viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {latestBadges.length ? (
            <FlatList
              data={latestBadges}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.earnedList as any}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => (
                <View style={styles.badgeItem}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color={palette.mciGold} />
                  <Text style={styles.badgeTitle} numberOfLines={1}>{item.title}</Text>
                </View>
              )}
            />
          ) : (
            <Text style={styles.noBadges}>{t(language, 'noBadges')}</Text>
          )}
        </View>

        {/* Account */}
        <Section title={t(language, 'account')} palette={palette}>
          <SettingItem icon="key-outline" label={t(language, 'changePassword')} onPress={() => router.push('/profile/ChangePassword')} palette={palette} />
          <SettingItem icon="logo-google" label={t(language, 'linkGoogle')} onPress={() => Alert.alert(t(language, 'linkGoogle'), 'Demo')} palette={palette} />
        </Section>

        {/* App Settings */}
        <Section title={t(language, 'appSettings')} palette={palette}>
          <SettingSwitch icon="moon-outline" label={t(language, 'darkMode')} value={colorScheme === 'dark'} onValueChange={(v) => setTheme(v ? 'dark' : 'light')} palette={palette} />
          <SettingPicker
            icon="language-outline"
            label={t(language, 'language')}
            value={language === 'vi' ? 'Tiếng Việt' : 'English'}
            onPress={async () => {
              const next = language === 'vi' ? 'en' : 'vi';
              setLanguage(next);
              await AsyncStorage.setItem(SETTINGS_KEYS.language, next);
              if (firebaseUser) fetchProfile(firebaseUser);
            }}
            palette={palette}
          />
        </Section>

        {/* Notifications */}
        <Section title={t(language, 'notifications')} palette={palette}>
          <SettingSwitch icon="notifications-outline" label={t(language, 'notifStudy')} value={notifStudy} onValueChange={(v) => { setNotifStudy(v); AsyncStorage.setItem(SETTINGS_KEYS.notifStudy, String(v)); }} palette={palette} />
          <SettingSwitch icon="megaphone-outline" label={t(language, 'notifMarketing')} value={notifMarketing} onValueChange={(v) => { setNotifMarketing(v); AsyncStorage.setItem(SETTINGS_KEYS.notifMarketing, String(v)); }} palette={palette} />
        </Section>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={onLogout}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutTxt}>{t(language, 'logout')}</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------------- Sub Components ---------------- */
function StatCard({ icon, label, value, color, palette }: { icon: any; label: string; value: string; color: string; palette: Palette; }) {
  return (
    <View style={[ProfileStatCardStyles.container, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <View style={[ProfileStatCardStyles.iconWrap, { backgroundColor: `${color}${palette.statIconBgAlpha}` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[ProfileStatCardStyles.value, { color: palette.text }]}>{value}</Text>
      <Text style={[ProfileStatCardStyles.label, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}

function Section({ title, children, palette }: { title: string; children: React.ReactNode; palette: Palette; }) {
  const styles = useMemo(() => makeProfileStyles(palette), [palette]); // reuse tokens safely
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

function SettingItem({ icon, label, onPress, palette }: { icon: any; label: string; onPress?: () => void; palette: Palette; }) {
  const s = useMemo(() => makeProfileStyles(palette), [palette]);
  return (
    <TouchableOpacity style={[s.settingRow, s.settingBorder]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={palette.ionMain} />
      <Text style={s.settingLabel}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.ionMuted} style={s.settingChevron} />
    </TouchableOpacity>
  );
}

function SettingSwitch({ icon, label, value, onValueChange, palette }: { icon: any; label: string; value: boolean; onValueChange: (v: boolean) => void; palette: Palette; }) {
  const s = useMemo(() => makeProfileStyles(palette), [palette]);
  return (
    <View style={[s.settingRow, s.settingBorder]}>
      <Ionicons name={icon} size={20} color={palette.ionMain} />
      <Text style={s.settingLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={value ? '#2563EB' : '#ffffff'} />
    </View>
  );
}

function SettingPicker({ icon, label, value, onPress, palette }: { icon: any; label: string; value: string; onPress?: () => void; palette: Palette; }) {
  const s = useMemo(() => makeProfileStyles(palette), [palette]);
  return (
    <TouchableOpacity style={[s.settingRow, s.settingBorder]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={palette.ionMain} />
      <Text style={s.settingLabel}>{label}</Text>
      <Text style={s.pickerValue}>{value}</Text>
      <Ionicons name="swap-vertical" size={18} color={palette.ionMuted} />
    </TouchableOpacity>
  );
}
