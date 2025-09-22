// components/style/tab/PracticeStyles.ts
import type { Palette } from '@/theme/ThemeProvider';
import { StyleSheet } from 'react-native';

export const PracticeStyles = (p: Palette) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: p.bg },

    headerWrap: { backgroundColor: p.bg },
    headerTextWrap: { paddingHorizontal: 16, paddingBottom: 8 },
    headerTitle: { color: p.text, fontSize: 22, fontWeight: '700' },
    headerSub: { color: p.textMuted, marginTop: 4 },
    quickRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, marginBottom: 8 },

    card: {
      backgroundColor: p.card,
      marginHorizontal: 16,
      marginBottom: 12,
      borderRadius: 16,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: p.cardBorder,
    },
    cover: { width: 96, height: 96, backgroundColor: p.cardBorder },

    cardTitle: { color: p.text, fontSize: 16, fontWeight: '700' },
  });
