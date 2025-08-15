// app/(tabs)/Profile.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Linking,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/* ===========================
   Firebase
   =========================== */
import { auth, db } from '@/scripts/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

/* ===========================
   i18n: Từ điển & helper t()
   =========================== */
const I18N = {
  vi: {
    user: 'Người dùng',
    levelSample: 'Lớp 5 – Nâng cao',
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
    supportLegal: 'Hỗ trợ & pháp lý',
    helpCenter: 'Trung tâm trợ giúp',
    terms: 'Điều khoản & Chính sách',
    edit: 'Sửa',
    logout: 'Đăng xuất',
    loggedOut: 'Bạn đã đăng xuất.',
    noBadges: 'Chưa có huy hiệu nào — bắt đầu học để nhận huy hiệu nhé!',
    demoEmail: 'user@example.com',
    linkDemo: 'Tính năng demo.',
    loading: 'Đang tải...',
    errorLoad: 'Tải hồ sơ thất bại.',
    pullToRefresh: 'Kéo để làm mới',
  },
  en: {
    user: 'User',
    levelSample: 'Grade 5 – Advanced',
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
    supportLegal: 'Support & legal',
    helpCenter: 'Help center',
    terms: 'Terms & Policy',
    edit: 'Edit',
    logout: 'Log out',
    loggedOut: 'You have logged out.',
    noBadges: 'No badges yet — start learning to earn some!',
    demoEmail: 'user@example.com',
    linkDemo: 'Demo feature.',
    loading: 'Loading...',
    errorLoad: 'Failed to load profile.',
    pullToRefresh: 'Pull to refresh',
  },
} as const;

type LangKey = keyof typeof I18N['vi'];
function t(lang: 'vi' | 'en', key: LangKey) {
  return I18N[lang][key] ?? key;
}

/* ===========================
   Kiểu dữ liệu & const
   =========================== */
type BadgeItem = { id: string; title: string; icon: string };
type UserProfile = {
  uid: string;
  name: string;
  email: string;
  level: string | null; // cho phép null nếu chưa chọn lớp
  points: number;
  badges: BadgeItem[];
  streak: number;
  photoURL?: string | null;
};

const SETTINGS_KEYS = {
  language: 'profile_language',
  darkMode: 'profile_dark_mode',
  notifStudy: 'profile_notif_study',
  notifMarketing: 'profile_notif_marketing',
};

/* ===========================
   Component chính
   =========================== */
export default function ProfileScreen() {
  const router = useRouter();

  // --------- UI/Settings state ----------
  const [language, setLanguage] = useState<'vi' | 'en'>('vi');
  const [darkMode, setDarkMode] = useState(false);
  const [notifStudy, setNotifStudy] = useState(true);
  const [notifMarketing, setNotifMarketing] = useState(false);

  // --------- User/Auth state ----------
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // --------- Load settings khi mount ----------
  useEffect(() => {
    (async () => {
      const [l, d, s, m] = await Promise.all([
        AsyncStorage.getItem(SETTINGS_KEYS.language),
        AsyncStorage.getItem(SETTINGS_KEYS.darkMode),
        AsyncStorage.getItem(SETTINGS_KEYS.notifStudy),
        AsyncStorage.getItem(SETTINGS_KEYS.notifMarketing),
      ]);
      if (l === 'vi' || l === 'en') setLanguage(l);
      if (d !== null) setDarkMode(d === 'true');
      if (s !== null) setNotifStudy(s === 'true');
      if (m !== null) setNotifMarketing(m === 'true');
    })();
  }, []);

  // --------- Lắng nghe đăng nhập/đăng xuất ----------
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      if (!u) {
        router.replace('/(auth)/login');
      }
    });
    return unsub;
  }, [router]);

  // --------- Tải hồ sơ từ Firestore ----------
  const fetchProfile = useCallback(
    async (u: User) => {
      setLoading(true);
      setError(null);
      try {
        const ref = doc(db, 'users', u.uid);
        const snap = await getDoc(ref);
        const data = snap.exists() ? (snap.data() as any) : {};

        const profile: UserProfile = {
          uid: u.uid,
          name: u.displayName || data.name || t(language, 'user'),
          email: u.email || data.email || t(language, 'demoEmail'),
          photoURL: u.photoURL || data.photoURL || null,
          level: data.level ?? null, // chỉ có khi user đã chọn
          points: typeof data.points === 'number' ? data.points : 0,
          streak: typeof data.streak === 'number' ? data.streak : 0,
          badges: Array.isArray(data.badges) ? data.badges : [],
        };
        setUser(profile);
      } catch (e) {
        console.error(e);
        setError(t(language, 'errorLoad'));
      } finally {
        setLoading(false);
      }
    },
    [language]
  );

  // --------- Tải khi có firebaseUser hoặc khi focus tab ----------
  useEffect(() => {
    if (firebaseUser) fetchProfile(firebaseUser);
  }, [firebaseUser, fetchProfile]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        if (active && firebaseUser) await fetchProfile(firebaseUser);
      })();
      return () => {
        active = false;
      };
    }, [firebaseUser, fetchProfile])
  );

  // --------- Persist helpers ----------
  const persist = async (k: string, v: string | boolean) => {
    await AsyncStorage.setItem(k, String(v));
  };

  const initials = useMemo(() => {
    const n = user?.name?.trim() || '';
    const parts = n.split(/\s+/);
    const a = (parts[0]?.[0] || '').toUpperCase();
    const b = (parts[1]?.[0] || parts[0]?.[1] || '').toUpperCase();
    return (a + b).slice(0, 2) || 'U';
  }, [user?.name]);

  const onLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error(e);
    } finally {
      Alert.alert(t(language, 'logout'), t(language, 'loggedOut'));
      router.replace('/(auth)/login');
    }
  };

  const onRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    await fetchProfile(firebaseUser);
    setRefreshing(false);
  }, [firebaseUser, fetchProfile]);

  // --------- UI: Loading / Error ----------
  if (!firebaseUser || loading) {
    return (
      <SafeAreaView style={[styles.container, darkMode && { backgroundColor: '#0B1020' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <ActivityIndicator size="large" />
          <Text style={{ color: '#CBD5E1' }}>{t(language, 'loading')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !user) {
    return (
      <SafeAreaView style={[styles.container, darkMode && { backgroundColor: '#0B1020' }]}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
          <Text style={{ color: '#FCA5A5' }}>{error || t(language, 'errorLoad')}</Text>
          <TouchableOpacity
            style={[styles.editBtn, { backgroundColor: '#60A5FA' }]}
            onPress={() => firebaseUser && fetchProfile(firebaseUser)}
          >
            <Ionicons name="refresh" size={18} color="#111827" />
            <Text style={styles.editTxt}>{t(language, 'pullToRefresh')}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, darkMode && { backgroundColor: '#0B1020' }]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#93C5FD" />
        }
      >
        {/* Header: Avatar + Tên + Email */}
        <View style={[styles.card, darkMode && styles.cardDark]}>
          <View style={styles.row}>
            <View style={[styles.avatar, darkMode && styles.avatarDark]}>
              {/* Nếu có URL ảnh thật, có thể dùng <Image source={{ uri: user.photoURL! }} style={{ width: 60, height: 60, borderRadius: 999 }} /> */}
              <Text style={[styles.avatarTxt, darkMode && { color: '#E5E7EB' }]}>{initials}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={[styles.name, darkMode && { color: '#F8FAFC' }]} numberOfLines={1}>
                {user.name}
              </Text>
              <Text style={[styles.email, darkMode && { color: '#94A3B8' }]} numberOfLines={1}>
                {user.email}
              </Text>

              {/* Lớp: nếu chưa chọn -> hiển thị "Chưa chọn lớp" (không có nút) */}
              <View
                style={[
                  styles.levelPill,
                  { marginTop: 8 },
                  !user.level && { borderStyle: 'dashed', backgroundColor: 'transparent' },
                ]}
              >
                <Ionicons name="school-outline" size={16} color="#4F46E5" />
                <Text style={styles.levelTxt}>{user.level || t(language, 'noClass')}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => router.push('/(EditProfile)/edit')}
            >
              <Ionicons name="create-outline" size={18} color="#111827" />
              <Text style={styles.editTxt}>{t(language, 'edit')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats: Points / Badges / Streak */}
        <View style={styles.statsRow}>
          <StatCard
            icon="diamond-stone"
            color="#9333EA"
            label={t(language, 'points')}
            value={String(user.points)}
            dark={darkMode}
          />
          <StatCard
            icon="medal-outline"
            color="#F59E0B"
            label={t(language, 'badges')}
            value={String(user.badges?.length || 0)}
            dark={darkMode}
          />
          <StatCard
            icon="fire"
            color="#EF4444"
            label={t(language, 'streak')}
            value={`${user.streak} ${t(language, 'days')}`}
            dark={darkMode}
          />
        </View>

        {/* Badges */}
        <View style={[styles.card, darkMode && styles.cardDark]}>
          <View style={styles.cardHead}>
            <Text style={[styles.cardTitle, darkMode && { color: '#F8FAFC' }]}>
              {t(language, 'earnedBadges')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/profile/Badges')}>
              <Text style={[styles.link, darkMode && { color: '#93C5FD' }]}>
                {t(language, 'viewAll')}
              </Text>
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
                <View style={[styles.badge, darkMode && styles.badgeDark]}>
                  <MaterialCommunityIcons name={item.icon as any} size={22} color="#F59E0B" />
                  <Text style={[styles.badgeTxt, darkMode && { color: '#E5E7EB' }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                </View>
              )}
            />
          ) : (
            <Text style={[styles.empty, darkMode && { color: '#94A3B8' }]}>
              {t(language, 'noBadges')}
            </Text>
          )}
        </View>

        {/* Account Settings */}
        <Section title={t(language, 'account')} dark={darkMode}>
          <SettingItem
            icon="key-outline"
            label={t(language, 'changePassword')}
            onPress={() => router.push('/profile/ChangePassword')}
            dark={darkMode}
          />
          <SettingItem
            icon="logo-google"
            label={t(language, 'linkGoogle')}
            onPress={() => Alert.alert(t(language, 'linkGoogle'), t(language, 'linkDemo'))}
            dark={darkMode}
          />
        </Section>

        {/* App Settings */}
        <Section title={t(language, 'appSettings')} dark={darkMode}>
          <SettingSwitch
            icon="moon-outline"
            label={t(language, 'darkMode')}
            value={darkMode}
            onValueChange={(v) => {
              setDarkMode(v);
              persist(SETTINGS_KEYS.darkMode, v);
            }}
            dark={darkMode}
          />
          <SettingPicker
            icon="language-outline"
            label={t(language, 'language')}
            value={language === 'vi' ? 'Tiếng Việt' : 'English'}
            onPress={async () => {
              const next = language === 'vi' ? 'en' : 'vi';
              setLanguage(next);
              await persist(SETTINGS_KEYS.language, next);
              if (firebaseUser) fetchProfile(firebaseUser);
            }}
            dark={darkMode}
          />
        </Section>

        {/* Notifications */}
        <Section title={t(language, 'notifications')} dark={darkMode}>
          <SettingSwitch
            icon="notifications-outline"
            label={t(language, 'notifStudy')}
            value={notifStudy}
            onValueChange={(v) => {
              setNotifStudy(v);
              persist(SETTINGS_KEYS.notifStudy, v);
            }}
            dark={darkMode}
          />
          <SettingSwitch
            icon="megaphone-outline"
            label={t(language, 'notifMarketing')}
            value={notifMarketing}
            onValueChange={(v) => {
              setNotifMarketing(v);
              persist(SETTINGS_KEYS.notifMarketing, v);
            }}
            dark={darkMode}
          />
        </Section>

        {/* Legal / Support */}
        <Section title={t(language, 'supportLegal')} dark={darkMode}>
          <SettingItem
            icon="help-circle-outline"
            label={t(language, 'helpCenter')}
            onPress={() => Linking.openURL('https://example.com/help')}
            dark={darkMode}
          />
          <SettingItem
            icon="document-text-outline"
            label={t(language, 'terms')}
            onPress={() => Linking.openURL('https://example.com/terms')}
            dark={darkMode}
          />
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

function StatCard({
  icon,
  label,
  value,
  color,
  dark,
}: {
  icon: any;
  label: string;
  value: string;
  color: string;
  dark?: boolean;
}) {
  return (
    <View style={[styles.statCard, dark && styles.statCardDark]}>
      <View style={[styles.statIconWrap, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, dark && { color: '#F8FAFC' }]}>{value}</Text>
      <Text style={[styles.statLabel, dark && { color: '#94A3B8' }]}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  dark,
}: {
  title: string;
  children: React.ReactNode;
  dark?: boolean;
}) {
  return (
    <View style={[styles.card, dark && styles.cardDark]}>
      <Text style={[styles.cardTitle, dark && { color: '#F8FAFC' }]}>{title}</Text>
      <View style={{ marginTop: 6 }}>{children}</View>
    </View>
  );
}

function SettingItem({
  icon,
  label,
  onPress,
  dark,
}: {
  icon: any;
  label: string;
  onPress?: () => void;
  dark?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.settingRow, dark && styles.settingRowDark]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={dark ? '#93C5FD' : '#4F46E5'} />
      <Text style={[styles.settingLabel, dark && { color: '#E5E7EB' }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color={dark ? '#64748B' : '#9CA3AF'} />
    </TouchableOpacity>
  );
}

function SettingSwitch({
  icon,
  label,
  value,
  onValueChange,
  dark,
}: {
  icon: any;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  dark?: boolean;
}) {
  return (
    <View style={[styles.settingRow, dark && styles.settingRowDark]}>
      <Ionicons name={icon} size={20} color={dark ? '#93C5FD' : '#4F46E5'} />
      <Text style={[styles.settingLabel, dark && { color: '#E5E7EB' }]}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

function SettingPicker({
  icon,
  label,
  value,
  onPress,
  dark,
}: {
  icon: any;
  label: string;
  value: string;
  onPress?: () => void;
  dark?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.settingRow, dark && styles.settingRowDark]} onPress={onPress}>
      <Ionicons name={icon} size={20} color={dark ? '#93C5FD' : '#4F46E5'} />
      <Text style={[styles.settingLabel, dark && { color: '#E5E7EB' }]}>{label}</Text>
      <Text style={[styles.pickerValue, dark && { color: '#CBD5E1' }]}>{value}</Text>
      <Ionicons name="swap-vertical" size={18} color={dark ? '#64748B' : '#9CA3AF'} />
    </TouchableOpacity>
  );
}

/* ---------- Styles ---------- */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B1220',
  },
  scroll: {
    padding: 16,
    gap: 12,
  },
  card: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  cardDark: {
    backgroundColor: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 999,
    backgroundColor: '#1E293B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarDark: {
    backgroundColor: '#0B1020',
  },
  avatarTxt: {
    color: '#0EA5E9',
    fontSize: 20,
    fontWeight: '700',
  },
  name: {
    fontSize: 18,
    fontWeight: '700',
    color: '#E5E7EB',
  },
  email: {
    fontSize: 13,
    color: '#94A3B8',
    marginTop: 2,
  },

  levelPill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1F2A44',
  },
  levelTxt: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },

  statsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#0F172A',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    alignItems: 'flex-start',
    gap: 6,
  },
  statCardDark: {
    backgroundColor: '#0F172A',
  },
  statIconWrap: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  statValue: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    color: '#94A3B8',
    fontSize: 12,
  },

  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#E5E7EB',
    fontSize: 16,
    fontWeight: '700',
  },
  link: {
    color: '#60A5FA',
    fontSize: 13,
    fontWeight: '600',
  },

  badge: {
    width: 110,
    height: 78,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1F2A44',
    backgroundColor: '#0B1220',
    padding: 10,
    justifyContent: 'center',
    gap: 6,
  },
  badgeDark: {
    backgroundColor: '#0B1220',
  },
  badgeTxt: {
    color: '#CBD5E1',
    fontSize: 12,
    fontWeight: '600',
  },
  empty: {
    marginTop: 10,
    color: '#64748B',
    fontSize: 13,
  },

  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#132040',
  },
  settingRowDark: {
    borderBottomColor: '#132040',
  },
  settingLabel: {
    flex: 1,
    color: '#0EA5E9',
    fontSize: 14,
    fontWeight: '600',
  },
  pickerValue: {
    marginRight: 6,
    color: '#64748B',
    fontSize: 13,
  },

  logoutBtn: {
    marginTop: 6,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  logoutTxt: {
    color: '#fff',
    fontWeight: '700',
  },

  editBtn: {
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#93C5FD',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editTxt: {
    color: '#111827',
    fontWeight: '700',
  },
});
