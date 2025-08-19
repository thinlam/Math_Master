// app/_layout.tsx
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
  return (
    <ThemeProvider>
      <RootWrapped />
    </ThemeProvider>
  );
}
