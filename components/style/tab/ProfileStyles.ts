// components/style/tab/ProfileStyles.ts
import type { Palette } from '@/theme/ThemeProvider';
import { StyleSheet } from 'react-native';

export const makeProfileStyles = (p: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    scroll: { padding: 16, gap: 12 },

    // Card & layout
    card: { backgroundColor: p.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.cardBorder },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center' },

    // Avatar & identity
    avatar: { width: 60, height: 60, borderRadius: 999, backgroundColor: p.cardBorder, justifyContent: 'center', alignItems: 'center' },
    avatarImg: { width: 60, height: 60, borderRadius: 999, backgroundColor: p.cardBorder },
    avatarTxt: { color: p.brand, fontSize: 20, fontWeight: '700' },
    name: { fontSize: 18, fontWeight: '700', color: p.text },
    email: { fontSize: 13, color: p.textMuted, marginTop: 2 },

    // Level pill
    levelPill: {
      alignSelf: 'flex-start',
      flexDirection: 'row',
      gap: 6,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: p.pillBg,
      borderWidth: 1,
      borderColor: p.pillBorder,
      marginTop: 8,
    },
    levelPillEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent' },
    levelTxt: { color: p.textFaint, fontSize: 12, fontWeight: '600' },

    // Buttons
    editBtn: { flexDirection: 'row', gap: 6, backgroundColor: p.editBtnBg, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, alignItems: 'center' },
    editBtnTxt: { color: p.editBtnText, fontWeight: '700' },

    // Stats row
    statsRow: { flexDirection: 'row', gap: 12 },

    // Earned badges
    earnedHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    earnedTitle: { color: p.text, fontSize: 16, fontWeight: '700' },
    earnedLink: { color: p.link, fontSize: 13, fontWeight: '600' },
    earnedList: { gap: 12, paddingTop: 10 },
    badgeItem: {
      width: 110, height: 78, borderRadius: 12, borderWidth: 1, borderColor: p.cardBorder,
      backgroundColor: p.bg, padding: 10, justifyContent: 'center', gap: 6,
    },
    badgeTitle: { color: p.textFaint, fontSize: 12, fontWeight: '600' },
    noBadges: { marginTop: 10, color: p.textMuted, fontSize: 13 },

    // Sections
    section: { backgroundColor: p.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.cardBorder },
    sectionTitle: { color: p.text, fontSize: 16, fontWeight: '700' },
    sectionBody: { marginTop: 6 },

    // Setting rows
    settingRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
    settingBorder: { borderBottomColor: p.divider },
    settingLabel: { flex: 1, color: p.brand, fontSize: 14, fontWeight: '600' },
    settingChevron: { marginLeft: 6 },

    // Picker extra
    pickerValue: { marginRight: 6, color: p.textMuted, fontSize: 13 },

    // Logout
    logoutBtn: { marginTop: 6, backgroundColor: p.danger, borderRadius: 12, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
    logoutTxt: { color: '#fff', fontWeight: '700' },

    // Misc/loading
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    errorWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
    errorBtn: { backgroundColor: p.brandSoft, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10 },
    errorBtnTxt: { color: p.editBtnText, fontWeight: '700' },
  });

/** Thẻ Stat */
export const ProfileStatCardStyles = StyleSheet.create({
  container: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, alignItems: 'flex-start', gap: 6 },
  iconWrap: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  value: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12 },
});
