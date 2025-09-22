// components/style/auth/LoginStyles.ts
import { StyleSheet } from 'react-native';

export const LoginStaticStyles = StyleSheet.create({
  root: { flex: 1 },
  kbd: { flex: 1 },
  scroll: { flexGrow: 1, padding: 20, justifyContent: 'center' },

  // floating theme toggle
  toggle: { position: 'absolute', top: 40, right: 20, zIndex: 10 },

  // header
  header: { alignItems: 'center', marginBottom: 18 },
  logo: { width: 72, height: 120, borderRadius: 16 },
  title: { fontSize: 26, fontWeight: '800', marginTop: 12 },
  subtitle: { marginTop: 4, fontSize: 14 },

  // card
  card: {
    borderRadius: 18,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },

  // error alert
  errorBox: {
    borderWidth: 1,
    padding: 10,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  errorTxt: { flex: 1 },

  // input
  inputRow: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: { flex: 1, paddingVertical: 10 },
  inputErrorTxt: { fontSize: 12, marginTop: -6 },

  // actions
  actionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgot: { color: '#93c5fd', fontWeight: '600' },
  loginBtn: { paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  loginTxt: { color: '#fff', fontWeight: '700' },

  // divider
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerTxt: { fontSize: 12 },

  // social
  socialBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  googleIcon: { width: 18, height: 18 },

  // footer
  footer: { alignItems: 'center', marginTop: 16 },
  footerLink: { fontWeight: '700' },
});

/** Theme token generator */
export function themedTokens(darkMode: boolean) {
  const gradient = darkMode ? ['#0f172a', '#111827', '#1f2937'] : ['#f3f4f6', '#e5e7eb', '#f3f4f6'];
  return {
    gradient: gradient as [string, string, string],
    text: darkMode ? '#fff' : '#111',
    subText: darkMode ? '#cbd5e1' : '#374151',
    cardBg: darkMode ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
    border: darkMode ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    inputBg: darkMode ? 'rgba(17,24,39,0.5)' : 'rgba(255,255,255,0.85)',
    errorBorder: darkMode ? 'rgba(239,68,68,0.9)' : 'rgba(220,38,38,0.9)',
    errorText: darkMode ? '#fca5a5' : '#dc2626',
    primary: '#3b82f6',
    primaryDisabled: 'rgba(59,130,246,0.35)',
    socialBg: darkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
  };
}
