// components/style/auth/ForgotStyles.ts
import { StyleSheet } from 'react-native';

export const ForgotStaticStyles = StyleSheet.create({
  root: { flex: 1, padding: 24 },
  center: { flex: 1, justifyContent: 'center' },

  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 8 },
  hint: { marginBottom: 16, fontSize: 13 },

  input: {
    padding: 14,
    borderRadius: 10,
    fontSize: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  otpInput: {
    padding: 14,
    borderRadius: 10,
    fontSize: 18,
    letterSpacing: 4,
    borderWidth: 1,
    marginBottom: 12,
    textAlign: 'center',
  },
  devOtp: { marginBottom: 8, textAlign: 'center' },

  primaryBtn: {
    paddingVertical: 14,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: 'center',
  },
  primaryTxt: { color: 'white', fontWeight: 'bold', fontSize: 16 },

  resendBtn: { marginBottom: 16 },
  resendTxt: { textAlign: 'center', fontWeight: '600' },

  backTxt: { fontSize: 16, fontWeight: 'bold', textAlign: 'center' },
});

/** Theme tokens (tự bật/tắt nền tối nếu sau này cần) */
export function themedTokens(dark: boolean = true) {
  return {
    bg: dark ? '#0b0c10' : '#f8fafc',
    text: dark ? '#E5E7EB' : '#111827',
    subText: dark ? '#9CA3AF' : '#374151',

    inputBg: dark ? '#111827' : '#ffffff',
    inputText: dark ? '#F9FAFB' : '#111827',
    inputBorder: dark ? '#374151' : '#CBD5E1',

    primary: '#7C3AED',
    primaryDisabled: 'rgba(124,58,237,0.7)',

    accent: '#A78BFA',
    accentDisabled: '#6B7280',

    devOtp: '#A3E635',
  };
}
