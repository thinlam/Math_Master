// app/_layout.tsx
import { useUserKickListener } from '@/scripts/useUserKickListener';
import { SandboxPayModal } from '@/services/payments';
import { ThemeProvider, useTheme } from '@/theme/ThemeProvider';
import { Slot } from 'expo-router';
import { StatusBar } from 'react-native';
function RootWrapped() {
  const { colorScheme, palette } = useTheme();
  return (
    <>
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
        <RootWrapped />
      </ThemeProvider>
      <SandboxPayModal />
    </>
  );
}
