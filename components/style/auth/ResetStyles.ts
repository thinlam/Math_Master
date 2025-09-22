// components/style/auth/ResetStyles.ts
import { StyleSheet } from 'react-native';

export const ResetStaticStyles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  kbd: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 24 },

  // header
  headerWrap: { alignItems: 'center', marginTop: 8, marginBottom: 18 },
  headerBadge: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 },
  headerTitle: { fontSize: 24, fontWeight: '800', textAlign: 'center', marginTop: 12 },
  headerSub: { marginTop: 6, textAlign: 'center' },

  // card
  card: {
    borderRadius: 16,
    padding: 18,
    gap: 14,
    borderWidth: 1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },

  // email row (display only)
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
  },
  emailLabel: { marginLeft: 10, fontSize: 13 },
  emailValue: { marginLeft: 6, fontWeight: '700', flex: 1 },

  // input
  label: { marginBottom: 8, fontWeight: '600' },
  input: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
  },
  eyeBtn: { position: 'absolute', right: 12, top: 12, padding: 6, borderRadius: 999 },

  // hint
  hint: { fontSize: 12, marginTop: -2 },

  // primary button
  primaryBtn: { borderRadius: 12, overflow: 'hidden', marginTop: 6 },
  primaryBtnInner: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryTxt: {
    color: 'white', textAlign: 'center', fontWeight: '800', fontSize: 16,
    marginLeft: 10, letterSpacing: 0.3, textTransform: 'uppercase',
  },

  // footnote
  footnoteWrap: { alignItems: 'center', marginTop: 8 },
  footnote: { fontSize: 12 },
});

/** simple themed tokens (dark-first to match app) */
export function themedTokens(isDark: boolean) {
  return {
    // backgrounds
    grad1: isDark ? '#0B1020' : '#eef1ff',
    grad2: isDark ? '#0E1530' : '#f6f7ff',
    card: isDark ? '#131a33' : '#ffffff',

    // text colors
    txt: isDark ? '#EAF0FF' : '#1B2559',
    sub: isDark ? '#A9B5D9' : '#667085',

    // borders/shadows
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,29,76,0.08)',
    shadow: isDark ? '#000' : '#6C63FF',

    // accents
    primary: '#6C63FF',
    primary2: '#8D84FF',
    accent: '#A993FF',

    // pieces
    headerBadgeBg: isDark ? 'rgba(140,130,255,0.12)' : 'rgba(108,99,255,0.12)',
    inputBg: isDark ? '#0F1733' : '#fff',
    eye: isDark ? '#BFC7E6' : '#7C8596',
    placeholder: isDark ? '#8B95B2' : '#9AA3B2',
  };
}
