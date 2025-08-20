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
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

import { useTheme, type Palette } from '@/theme/ThemeProvider';

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
function t(lang: Lang, key: keyof typeof I18N['vi']) { return I18N[lang][key]; }

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
};

function makeStyles(p: Palette) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    scroll: { padding: 16, gap: 12 },
    card: { backgroundColor: p.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.cardBorder },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
    avatar: { width: 60, height: 60, borderRadius: 999, backgroundColor: p.cardBorder, justifyContent: 'center', alignItems: 'center' },
    avatarTxt: { color: p.brand, fontSize: 20, fontWeight: '700' },
    name: { fontSize: 18, fontWeight: '700', color: p.text },
    email: { fontSize: 13, color: p.textMuted, marginTop: 2 },
    levelPill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: p.pillBg, borderWidth: 1, borderColor: p.pillBorder },
    levelTxt: { color: p.textFaint, fontSize: 12, fontWeight: '600' },
    statsRow: { flexDirection: 'row', gap: 12 },
    statIconWrap: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
    logoutBtn: { marginTop: 6, backgroundColor: p.danger, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    logoutTxt: { color: '#fff', fontWeight: '700' },
    editBtn: { flexDirection: 'row', gap: 6, backgroundColor: p.editBtnBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
    editTxt: { color: p.editBtnText, fontWeight: '700' },
    link: { color: p.link, fontSize: 13, fontWeight: '600' },
  });
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colorScheme, palette, setTheme } = useTheme();
  const styles = useMemo(() => makeStyles(palette), [palette]);

  const [language, setLanguage] = useState<Lang>('vi');
  const [notifStudy, setNotifStudy] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) router.replace('/(auth)/login');
    });
    return unsub;
  }, [router]);

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
        streak: typeof data.streak === 'number' ? data.streak : 0,
        badges: Array.isArray(data.badges) ? data.badges : [],
      };
      setUser(profile);
    } catch (e) { console.error(e); setError(t(language, 'errorLoad')); }
    finally { setLoading(false); }
  }, [language]);

  useEffect(() => { if (firebaseUser) fetchProfile(firebaseUser); }, [firebaseUser, fetchProfile]);

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => { if (active && firebaseUser) await fetchProfile(firebaseUser); })();
    return () => { active = false; };
  }, [firebaseUser, fetchProfile]));

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

  if (!firebaseUser || loading) {
    return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} translucent={false} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ActivityIndicator size="large" />
          <Text style={{ color: palette.textMuted }}>{t(language, 'loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={styles.container} edges={['top','left','right']}>
        <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} backgroundColor={palette.bg} translucent={false} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ color: palette.danger }}>{error || t(language, 'errorLoad')}</Text>
          <TouchableOpacity style={{ backgroundColor: palette.brandSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 }} onPress={() => firebaseUser && fetchProfile(firebaseUser)}>
            <Text style={{ color: palette.editBtnText, fontWeight: '700' }}>{t(language, 'pullToRefresh')}</Text>
          </TouchableOpacity>
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
        <View style={styles.card}>
          <View style={styles.row}>
            {user.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={{ width: 60, height: 60, borderRadius: 999, backgroundColor: palette.cardBorder }} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
            )}

            <View style={{ flex: 1 }}>
              <Text style={styles.name} numberOfLines={1}>{user.name}</Text>
              <Text style={styles.email} numberOfLines={1}>{user.email}</Text>

              <View style={[styles.levelPill, { marginTop: 8 }, !user.level && { borderStyle: 'dashed', backgroundColor: 'transparent' }]}>
                <Ionicons name="school-outline" size={16} color={palette.ionMain} />
                <Text style={styles.levelTxt}>{user.level || t(language, 'noClass')}</Text>
              </View>
            </View>

            <TouchableOpacity style={{ flexDirection: 'row', gap: 6, backgroundColor: palette.editBtnBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' }} onPress={() => router.push('/(EditProfile)/edit')}>
              <Ionicons name="create-outline" size={18} color={palette.editBtnText} />
              <Text style={{ color: palette.editBtnText, fontWeight: '700' }}>{t(language, 'edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats */}
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <StatCard icon="diamond-stone" color="#9333EA" label={t(language, 'points')} value={String(user.points)} palette={palette} />
          <StatCard icon="medal-outline" color={palette.mciGold} label={t(language, 'badges')} value={String(user.badges?.length || 0)} palette={palette} />
          <StatCard icon="fire" color={palette.streak} label={t(language, 'streak')} value={`${user.streak} ${t(language, 'days')}`} palette={palette} />
        </View>

        {/* Badges */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{t(language, 'earnedBadges')}</Text>
            <TouchableOpacity onPress={() => router.push('/profile/Badges')}>
              <Text style={styles.link}>{t(language, 'viewAll')}</Text>
            </TouchableOpacity>
          </View>

          {user.badges?.length ? (
            <FlatList
              data={user.badges}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 12 }}
              keyExtractor={(b) => b.id}
              renderItem={({ item }) => (
                <View style={{ width: 110, height: 78, borderRadius: 12, borderWidth: 1, borderColor: palette.cardBorder, backgroundColor: palette.bg, padding: 10, justifyContent: 'center', gap: 6 }}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color={palette.mciGold} />
                  <Text style={{ color: palette.textFaint, fontSize: 12, fontWeight: '600' }} numberOfLines={1}>{item.title}</Text>
                </View>
              )}
            />
          ) : (
            <Text style={{ marginTop: 10, color: palette.textMuted, fontSize: 13 }}>{t(language, 'noBadges')}</Text>
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
          <SettingPicker icon="language-outline" label={t(language, 'language')} value={language === 'vi' ? 'Tiếng Việt' : 'English'} onPress={async () => {
            const next = language === 'vi' ? 'en' : 'vi';
            setLanguage(next);
            await AsyncStorage.setItem(SETTINGS_KEYS.language, next);
            if (firebaseUser) fetchProfile(firebaseUser);
          }} palette={palette} />
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

/* ---------- Sub Components ---------- */
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

function Section({ title, children, palette }: { title: string; children: React.ReactNode; palette: Palette; }) {
  return (
    <View style={{ backgroundColor: palette.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: palette.cardBorder }}>
      <Text style={{ color: palette.text, fontSize: 16, fontWeight: '700' }}>{title}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}

function SettingItem({ icon, label, onPress, palette }: { icon: any; label: string; onPress?: () => void; palette: Palette; }) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.divider }} onPress={onPress}>
      <Ionicons name={icon} size={20} color={palette.ionMain} />
      <Text style={{ flex: 1, color: palette.brand, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={palette.ionMuted} />
    </TouchableOpacity>
  );
}

function SettingSwitch({ icon, label, value, onValueChange, palette }: { icon: any; label: string; value: boolean; onValueChange: (v: boolean) => void; palette: Palette; }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.divider }}>
      <Ionicons name={icon} size={20} color={palette.ionMain} />
      <Text style={{ flex: 1, color: palette.brand, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} trackColor={{ false: '#CBD5E1', true: '#93C5FD' }} thumbColor={value ? '#2563EB' : '#ffffff'} />
    </View>
  );
}

function SettingPicker({ icon, label, value, onPress, palette }: { icon: any; label: string; value: string; onPress?: () => void; palette: Palette; }) {
  return (
    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: palette.divider }} onPress={onPress}>
      <Ionicons name={icon} size={20} color={palette.ionMain} />
      <Text style={{ flex: 1, color: palette.brand, fontSize: 14, fontWeight: '600' }}>{label}</Text>
      <Text style={{ marginRight: 6, color: palette.textMuted, fontSize: 13 }}>{value}</Text>
      <Ionicons name="swap-vertical" size={18} color={palette.ionMuted} />
    </TouchableOpacity>
  );
}
