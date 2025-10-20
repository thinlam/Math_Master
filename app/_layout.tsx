// app/_layout.tsx
import { Slot, usePathname } from 'expo-router';
import Head from 'expo-router/head';
import React from 'react';
import { StatusBar } from 'react-native';

import { EntitlementsProvider } from '@/app/providers/EntitlementsProvider';
import { useUserKickListener } from '@/scripts/useUserKickListener';
import { SandboxPayModal } from '@/services/payments';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

function useDocumentTitle() {
  const pathname = usePathname();
  const BRAND = 'Bật thầy số học';
  if (pathname === '/' || pathname === '/(tabs)') return `Trang chủ | ${BRAND}`;
  if (pathname?.startsWith('/Profile')) return `Hồ sơ | ${BRAND}`;
  if (pathname?.startsWith('/Login')) return `Đăng nhập | ${BRAND}`;
  if (pathname?.startsWith('/Register')) return `Đăng ký | ${BRAND}`;
  if (pathname?.startsWith('/PlayGame')) return `Chơi game | ${BRAND}`;
  if (pathname?.startsWith('/Store')) return `Nâng cấp Premium | ${BRAND}`;
  if (pathname?.startsWith('/ClassSelect')) return `Chọn lớp | ${BRAND}`;
  if (pathname?.startsWith('/ForgotPassword')) return `Quên mật khẩu | ${BRAND}`;
  if (pathname?.startsWith('/Library')) return `thư viện | ${BRAND}`;
  if (pathname?.startsWith('/Learnning')) return `Học tập | ${BRAND}`;
  if (pathname?.startsWith('/Practice')) return `Luyện tập | ${BRAND}`;
  return BRAND;
}

function RootWrapped() {
  const { colorScheme, palette } = useTheme();
  const title = useDocumentTitle();

  return (
    <>
      <Head>
        <title>{title}</title>
        <meta name="description" content="Ứng dụng học toán Bật thầy số học" />
      </Head>

      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={palette.bg}
      />
      <Slot />
    </>
  );
}

export default function RootLayout() {
  useUserKickListener();
  return (
    <>
      <ThemeProvider>
        <EntitlementsProvider>
          <RootWrapped />
        </EntitlementsProvider>
      </ThemeProvider>
      <SandboxPayModal />
    </>
  );
}
