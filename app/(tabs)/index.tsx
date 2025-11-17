// app/(tabs)/index.tsx
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Image, Modal, RefreshControl, ScrollView, StatusBar, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeQuickStyles, HomeStatCardStyles, makeHomeStyles } from '@/components/style/tab/HomeStyles';
import RainbowTextAnimated from '@/components/tab/RainbowTextAnimated';
import { CLASS_OPTIONS } from '@/constants/tab/classes';

import { useAnnouncements } from '@/hooks/Tab/home/useAnnouncements';
import { useAuthProfile } from '@/hooks/Tab/home/useAuthProfile';
import { useBadges } from '@/hooks/Tab/home/useBadges';
import { useSubscriptions } from '@/hooks/Tab/home/useSubscriptions';

import { t } from '@/i18n';
import { useTheme, type Palette } from '@/theme/ThemeProvider';

/* ------------------------- Screen ------------------------- */
export default function HomeScreen() {
  const router = useRouter();
  const { palette, colorScheme } = useTheme();
  const styles = useMemo(() => makeHomeStyles(palette), [palette]);

  const { firebaseUser, profile: user, setProfile, loading, initials } = useAuthProfile();
  const { badgeCount, latestBadges } = useBadges(firebaseUser?.uid);
  const { subActive } = useSubscriptions(firebaseUser?.uid);
  const { annList, unreadCount, markAllSeen } = useAnnouncements(firebaseUser?.uid);

  const [classModalVisible, setClassModalVisible] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [savingClass, setSavingClass] = useState(false);
  const [annModalVisible, setAnnModalVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const isPremium = (user?.role === 'premium') || subActive;
  const premiumDisplay = `Super ${(user?.name?.trim() && user?.name) || 'User'}`;

  const onRefresh = useCallback(async () => {
    if (!firebaseUser) return;
    setRefreshing(true);
    try {
      // Hooks đã theo dõi realtime; nếu cần có thể thêm trigger refetch tại đây.
    } finally {
      setRefreshing(false);
    }
  }, [firebaseUser]);

  const handleStartLearning = useCallback(async () => {
    const levelStr = user?.level ?? selectedClass;
    const m = levelStr?.match(/\d+/);
    if (m) await AsyncStorage.setItem('selectedGrade', String(Number(m[0])));
    router.push('/Learnning/Learn');
  }, [router, user?.level, selectedClass]);

  const openAnnModal = useCallback(async () => {
    setAnnModalVisible(true);
    await markAllSeen();
  }, [markAllSeen]);

  const openClassModal = () => {
    setSelectedClass(user?.level ?? null);
    setClassModalVisible(true);
  };

  const saveClass = useCallback(async () => {
    if (!firebaseUser) return;
    if (!selectedClass) { Alert.alert(t('chooseClass'), t('noClass')); return; }
    try {
      setSavingClass(true);
      // Lazy import để giảm bundle khi mở app:
      const { doc, updateDoc, getFirestore } = await import('firebase/firestore');
      const db = getFirestore();
      await updateDoc(doc(db, 'users', firebaseUser.uid), { level: selectedClass });
      setProfile(prev => (prev ? { ...prev, level: selectedClass } : prev));

      const m = selectedClass.match(/\d+/);
      const newGrade = m ? String(Number(m[0])) : null;
      if (newGrade) await AsyncStorage.setItem('selectedGrade', newGrade);
    } catch (e) {
      console.error(e);
      Alert.alert('Lỗi', 'Không thể lưu lớp. Vui lòng thử lại.');
    } finally {
      setSavingClass(false);
      setClassModalVisible(false);
    }
  }, [firebaseUser, selectedClass, setProfile]);

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
        <View style={styles.headerCard}>
          <TouchableOpacity onPress={openAnnModal} style={styles.notifBtn} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Ionicons name="notifications-outline" size={22} color={palette.text} />
            {unreadCount > 0 && (
              <View style={styles.notifBadge}>
                <Text style={styles.notifBadgeTxt}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <View style={styles.row}>
            {user?.photoURL ? (
              <Image source={{ uri: user.photoURL }} style={styles.avatarImg} resizeMode="cover" />
            ) : (
              <View style={styles.avatar}><Text style={styles.avatarTxt}>{initials}</Text></View>
            )}

            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                {isPremium ? (
                  <RainbowTextAnimated style={[styles.hello, styles.helloBolder]}>{premiumDisplay}</RainbowTextAnimated>
                ) : (
                  <Text style={styles.hello}>{t('hello')}, {(user?.name?.trim() && user?.name) || 'User'}</Text>
                )}
                {user?.role === 'admin' && (
                  <MaterialCommunityIcons name="shield-crown" size={16} color="#60A5FA" style={{ marginLeft: 6 }} />
                )}
              </View>

              <View style={styles.levelRow}>
                <View style={[styles.levelPill, !user?.level && styles.levelPillEmpty]}>
                  <Ionicons name="school-outline" size={16} color={palette.ionMain} />
                  <Text style={styles.levelTxt}>{user?.level || t('noClass')}</Text>
                </View>
                <TouchableOpacity style={styles.changeBtn} onPress={openClassModal}>
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
            <QuickButton palette={palette} icon="game-controller-outline" label={t('game')} onPress={() => router.push('/(tabs)/Playgame')} />
          </View>
        </View>

        {/* Stats */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('stats')}</Text>
          <View style={styles.statsRow}>
            <StatCard palette={palette} icon="diamond-stone" color="#9333EA" label={t('points')} value={String(user?.points ?? 0)} />
            {/* <StatCard palette={palette} icon="coin" color="#FBBF24" label={t('coins')} value={String(user?.coins ?? 0)} /> */}
            <StatCard palette={palette} icon="medal-outline" color={palette.mciGold} label={t('badges')} value={String(badgeCount)} />
            <StatCard palette={palette} icon="fire" color={palette.streak} label={t('streak')} value={`${user?.streak ?? 0} ${t('days')}`} />
          </View>
        </View>

        {/* Huy hiệu gần đây */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{t('earnedBadges')}</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/Profile/Badges')}>
              <Text style={styles.linkBold}>{t('viewAll')}</Text>
            </TouchableOpacity>
          </View>
          {latestBadges.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
              {latestBadges.map((b) => (
                <View key={b.id} style={styles.badgeItem}>
                  <MaterialCommunityIcons name={b.icon as any} size={22} color={palette.mciGold} />
                  <Text style={styles.badgeTitle} numberOfLines={1}>{b.title}</Text>
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={styles.noBadgesTxt}>{t('noBadges')}</Text>
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
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Thông báo</Text>
              <TouchableOpacity onPress={() => setAnnModalVisible(false)} hitSlop={8}> {/* close button */}
                <Ionicons name="close" size={20} color={palette.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {annList.length === 0 ? (
                <Text style={styles.noAnnTxt}>Chưa có thông báo.</Text>
              ) : (
                annList.map((a) => {
                  const d = (a.createdAt as any)?.toDate?.() || new Date();
                  return (
                    <View key={a.id} style={styles.annItem}>
                      <Text style={styles.annTitle}>{a.title}</Text>
                      {!!a.body && <Text style={styles.annBody}>{a.body}</Text>}
                      <Text style={styles.annTime}>
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

/* ---------------------- Sub Components ---------------------- */
function QuickButton({
  icon, label, onPress, palette,
}: { icon: any; label: string; onPress?: () => void; palette: Palette; }) {
  return (
    <TouchableOpacity style={[HomeQuickStyles.btn, { backgroundColor: palette.editBtnBg }]} onPress={onPress}>
      <Ionicons name={icon} size={18} color={palette.editBtnText} />
      <Text style={[HomeQuickStyles.txt, { color: palette.editBtnText }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({
  icon, label, value, color, palette,
}: { icon: any; label: string; value: string; color: string; palette: Palette; }) {
  return (
    <View style={[HomeStatCardStyles.container, { backgroundColor: palette.card, borderColor: palette.cardBorder }]}>
      <View style={[HomeStatCardStyles.iconWrap, { backgroundColor: `${color}${palette.statIconBgAlpha}` }]}>
        <MaterialCommunityIcons name={icon} size={18} color={color} />
      </View>
      <Text style={[HomeStatCardStyles.value, { color: palette.text }]}>{value}</Text>
      <Text style={[HomeStatCardStyles.label, { color: palette.textMuted }]}>{label}</Text>
    </View>
  );
}
