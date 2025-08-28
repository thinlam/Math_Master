// app/_layout.tsx
import { Slot } from 'expo-router';
import React from 'react';
import { StatusBar } from 'react-native';

import { EntitlementsProvider } from '@/app/providers/EntitlementsProvider';
import { useUserKickListener } from '@/scripts/useUserKickListener';
import { SandboxPayModal } from '@/services/payments';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';

/** Gói phần hiển thị để dùng được useTheme() */
function RootWrapped() {
  const { colorScheme, palette } = useTheme();
  return (
    <>
      <StatusBar
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
        backgroundColor={palette.bg}
      />
      {/* Expo Router sẽ render các màn ở đây */}
      <Slot />
    </>
  );
}

export default function RootLayout() {
  // Lắng nghe sự kiện kick user (nếu có)
  useUserKickListener();

  return (
    <>
      {/* Theme bao ngoài để mọi thứ dùng được palette */}
      <ThemeProvider>
        {/* EntitlementsProvider cho realtime Premium/role */}
        <EntitlementsProvider>
          <RootWrapped />
        </EntitlementsProvider>
      </ThemeProvider>

      {/* Modal sandbox thanh toán (để ngoài Slot để luôn khả dụng) */}
      <SandboxPayModal />
    </>
  );
}
