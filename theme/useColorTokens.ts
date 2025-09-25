import { useColorScheme } from 'react-native';

export function useColorTokens() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  return {
    isDark,
    bg: isDark ? '#0B1020' : '#F6F7FF',
    card: isDark ? '#141A33' : '#FFFFFF',
    border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,29,76,0.08)',
    text: isDark ? '#EAF0FF' : '#1B2559',
    sub: isDark ? '#A9B5D9' : '#667085',
    primary: '#6C63FF',
    primary2: '#8D84FF',
    success: '#16A34A',
    warn: '#F59E0B',
    mute: '#6B7280',
    chipBg: isDark ? 'rgba(255,255,255,0.05)' : '#EEF2FF',
  };
}
