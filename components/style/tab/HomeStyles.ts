// components/style/tab/HomeStyles.ts
import type { Palette } from '@/theme/ThemeProvider';
import { StyleSheet } from 'react-native';

function colorMix(bg: string, fg: string, alpha = 0.1) {
  const a = Math.max(0, Math.min(1, alpha));
  const hexAlpha = Math.round(a * 255).toString(16).padStart(2, '0').toUpperCase();
  return `${fg}${hexAlpha}`;
}

/** Styles chính cho HomeScreen (memo bằng makeHomeStyles ở screen) */
export const makeHomeStyles = (p: Palette) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: p.bg },
    scroll: { padding: 16, gap: 12 },
    center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
    loadingTxt: { color: p.textMuted },

    headerCard: {
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 14,
      borderWidth: 1,
      borderColor: p.cardBorder,
      position: 'relative',
    },
    row: { flexDirection: 'row', gap: 12, alignItems: 'center' },

    notifBtn: { position: 'absolute', right: 10, top: 10, padding: 6 },
    notifBadge: {
      position: 'absolute',
      right: 2,
      top: 2,
      minWidth: 16,
      height: 16,
      borderRadius: 8,
      backgroundColor: '#EF4444',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    notifBadgeTxt: { color: '#FFF', fontSize: 10, fontWeight: '800' },

    avatar: {
      width: 60,
      height: 60,
      borderRadius: 999,
      backgroundColor: p.cardBorder,
      justifyContent: 'center',
      alignItems: 'center',
    },
    avatarImg: { width: 60, height: 60, borderRadius: 999, backgroundColor: p.cardBorder },
    avatarTxt: { color: p.brand, fontSize: 20, fontWeight: '700' },

    nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
    hello: { fontSize: 18, fontWeight: '700', color: p.text },
    helloBolder: { fontSize: 20, fontWeight: '800', letterSpacing: 0.5 },

    levelRow: { marginTop: 8, flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
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
    },
    levelPillEmpty: { borderStyle: 'dashed', backgroundColor: 'transparent' },
    levelTxt: { color: p.textFaint, fontSize: 12, fontWeight: '600' },
    changeBtn: {
      flexDirection: 'row',
      gap: 6,
      backgroundColor: p.editBtnBg,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      alignItems: 'center',
    },
    changeTxt: { color: p.editBtnText, fontWeight: '700' },

    card: { backgroundColor: p.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: p.cardBorder },
    cardTitle: { color: p.text, fontSize: 16, fontWeight: '700', marginBottom: 10 },
    linkBold: { color: p.link, fontWeight: '700' },

    quickRow: { flexDirection: 'row', gap: 10 },
    statsRow: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },

    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badgeItem: {
      width: 110,
      height: 80,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.bg,
      padding: 10,
      justifyContent: 'center',
      gap: 6,
    },
    badgeTitle: { color: p.textFaint, fontSize: 12, fontWeight: '600' },
    noBadgesTxt: { marginTop: 6, color: p.textMuted, fontSize: 13 },

    modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center', padding: 16 },
    modalCard: { width: '100%', backgroundColor: p.card, borderRadius: 16, borderWidth: 1, borderColor: p.cardBorder, padding: 14 },
    modalTitle: { color: p.text, fontWeight: '700', fontSize: 16, marginBottom: 10 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    classItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: p.cardBorder,
      backgroundColor: p.bg,
    },
    classItemActive: { borderColor: '#10B98155', backgroundColor: colorMix(p.bg, '#10B981', 0.08) },
    classTxt: { color: p.textFaint, fontWeight: '600' },
    classTxtActive: { color: '#D1FAE5' },

    modalActions: { flexDirection: 'row', gap: 10, marginTop: 14, justifyContent: 'flex-end' },
    modalBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: p.cardBorder, backgroundColor: p.bg },
    cancelBtn: {},
    saveBtn: { backgroundColor: p.editBtnBg, borderColor: p.editBtnBg },
    modalBtnTxt: { color: p.text, fontWeight: '600' },

    modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    noAnnTxt: { color: p.textMuted, textAlign: 'center', marginVertical: 20 },
    annItem: { backgroundColor: p.card, borderColor: p.cardBorder, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10 },
    annTitle: { color: p.text, fontWeight: '800' },
    annBody: { color: p.textMuted, marginTop: 6 },
    annTime: { color: p.textMuted, fontSize: 12, marginTop: 6 },
  });

/** Nút Quick Actions */
export const HomeQuickStyles = StyleSheet.create({
  btn: { minWidth: 0, flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', gap: 6 },
  txt: { fontWeight: '700' },
});

/** Thẻ Stat */
export const HomeStatCardStyles = StyleSheet.create({
  container: { flex: 1, borderRadius: 14, padding: 12, borderWidth: 1, alignItems: 'flex-start', gap: 6 },
  iconWrap: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 6 },
  value: { fontSize: 18, fontWeight: '700' },
  label: { fontSize: 12 },
});
