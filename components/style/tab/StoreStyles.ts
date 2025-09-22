// components/style/tab/StoreStyles.ts
import type { Palette } from '@/theme/ThemeProvider';
import { StyleSheet } from 'react-native';

export const StoreStyles = (p: Palette) =>
  StyleSheet.create({
    safe: { flex: 1, backgroundColor: p.bg },
    container: { padding: 16 },

    headerRow: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
    },
    title: { fontSize: 22, fontWeight: '700', color: p.text },

    trackBtn: {
      flexDirection: 'row', alignItems: 'center', gap: 6,
      backgroundColor: p.brandSoft, borderColor: p.cardBorder, borderWidth: 1,
      paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10,
    },
    trackLabel: { fontSize: 12, fontWeight: '700' },

    noteBox: {
      flexDirection: 'row', alignItems: 'center', gap: 8,
      backgroundColor: p.card, borderColor: p.cardBorder, borderWidth: 1,
      padding: 10, borderRadius: 10, marginBottom: 12,
    },
    noteText: { color: p.textMuted, fontSize: 12, flex: 1 },

    card: {
      backgroundColor: p.card, padding: 14, borderRadius: 12,
      marginBottom: 12, borderWidth: 1, borderColor: p.cardBorder,
    },
    iconCircle: {
      width: 42, height: 42, borderRadius: 21, alignItems: 'center',
      justifyContent: 'center', backgroundColor: p.brandSoft,
    },
    itemTitle: { fontSize: 16, fontWeight: '700', color: p.text },
    desc: { color: p.textMuted, fontSize: 13, marginTop: 2 },
    price: { fontWeight: '800', color: '#10B981' },

    btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  });

export const StoreBtnStyles = StyleSheet.create({
  btn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingVertical: 8, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1,
  },
  label: { fontSize: 12, fontWeight: '700' },
});
