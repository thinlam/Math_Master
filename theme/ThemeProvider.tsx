// src/theme/ThemeProvider.tsx  (đặt ở '@/theme/ThemeProvider')
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

const STORAGE_KEY = 'app_theme_pref'; // 'light' | 'dark' | 'system'

// ======= Palettes (dùng lại đúng màu của bạn) =======
export const THEME = {
  DARK: {
    bg: '#0B1220',
    card: '#0F172A',
    cardBorder: '#1F2A44',
    text: '#E5E7EB',
    textMuted: '#94A3B8',
    textFaint: '#CBD5E1',
    brand: '#0EA5E9',
    brandSoft: '#60A5FA',
    pillBg: '#111827',
    pillBorder: '#1F2A44',
    link: '#60A5FA',
    divider: '#132040',
    danger: '#EF4444',
    editBtnBg: '#93C5FD',
    editBtnText: '#111827',
    statIconBgAlpha: '22',
    ionMain: '#4F46E5',
    ionMuted: '#64748B',
    mciGold: '#F59E0B',
    streak: '#EF4444',
  },
  LIGHT: {
    bg: '#FFFFFF',
    card: '#FFFFFF',
    cardBorder: '#E5E7EB',
    text: '#111827',
    textMuted: '#4B5563',
    textFaint: '#374151',
    brand: '#2563EB',
    brandSoft: '#2563EB',
    pillBg: '#F3F4F6',
    pillBorder: '#E5E7EB',
    link: '#2563EB',
    divider: '#E5E7EB',
    danger: '#DC2626',
    editBtnBg: '#2563EB',
    editBtnText: '#FFFFFF',
    statIconBgAlpha: '22',
    ionMain: '#4F46E5',
    ionMuted: '#9CA3AF',
    mciGold: '#D97706',
    streak: '#DC2626',
  },
} as const;

export type Palette = typeof THEME.DARK;
export type ThemeName = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  themeName: ThemeName;
  colorScheme: 'light' | 'dark';       // cái app đang dùng thực tế
  palette: Palette;
  setTheme: (name: ThemeName) => void; // đổi 'light' | 'dark' | 'system'
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(pref: ThemeName, systemScheme: ColorSchemeName): 'light' | 'dark' {
  if (pref === 'system') return (systemScheme === 'dark' ? 'dark' : 'light');
  return pref;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [pref, setPref] = useState<ThemeName>('dark');
  const [system, setSystem] = useState<ColorSchemeName>(Appearance.getColorScheme());

  // lắng nghe thay đổi theme hệ thống (khi pref = 'system')
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    return () => sub.remove();
  }, []);

  // load preference từ AsyncStorage
  useEffect(() => {
    (async () => {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') setPref(saved);
      setLoaded(true);
    })();
  }, []);

  const setTheme = useCallback(async (name: ThemeName) => {
    setPref(name);
    await AsyncStorage.setItem(STORAGE_KEY, name);
  }, []);

  const colorScheme = useMemo(() => resolveScheme(pref, system), [pref, system]);
  const palette: Palette = colorScheme === 'dark' ? THEME.DARK : THEME.LIGHT;

  const value = useMemo<ThemeContextValue>(() => ({
    themeName: pref,
    colorScheme,
    palette,
    setTheme,
  }), [pref, colorScheme, palette, setTheme]);

  // tránh chớp trắng/đen: chỉ render khi loaded
  if (!loaded) return null;

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside <ThemeProvider/>');
  return ctx;
}
