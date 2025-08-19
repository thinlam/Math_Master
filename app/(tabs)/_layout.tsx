// app/(tabs)/_layout.tsx
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

import { styles } from '@/components/style/LayoutStyles';
import { useTheme } from '@/theme/ThemeProvider';

export default function TabLayout() {
  const { palette } = useTheme();

  // Màu riêng cho từng tab khi được chọn
  const activeColors: Record<string, string> = {
    index: '#4F46E5',     // Tím xanh
    Learn: '#16A34A',     // (để sẵn nếu sau này thêm tab Learn)
    Practice: '#F59E0B',  // Cam
    Library: '#06B6D4',   // Xanh cyan
    Profile: '#DC2626',   // Đỏ
    Store: '#9333EA',     // Tím đậm
  };

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          height: 70,
          backgroundColor: palette.card,
          borderTopColor: palette.cardBorder,
        },
        tabBarActiveTintColor: activeColors[route.name] || palette.brand,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarIcon: ({ focused, color }) => {
          const activeColor = focused ? (activeColors[route.name] || palette.brand) : palette.textMuted;
          let icon: React.ReactNode = null;

          switch (route.name) {
            case 'index':
              icon = <Ionicons name="home" size={24} color={activeColor} />;
              break;
            case 'Practice':
              icon = <FontAwesome5 name="trophy" size={22} color={activeColor} />;
              break;
            case 'Library':
              icon = <Ionicons name="play-circle" size={24} color={activeColor} />;
              break;
            case 'Store':
              icon = <Text style={{ fontSize: 24, color: activeColor }}>{'🎓'}</Text>;
              break;
            case 'Profile':
              icon = <Ionicons name="person-circle" size={26} color={activeColor} />;
              break;
            default:
              icon = <Ionicons name="ellipsis-horizontal" size={24} color={activeColor} />;
              break;
          }

          return (
            <View style={styles.iconWrapper}>
              <View style={[styles.iconCircle, focused && styles.iconCircleFocused]}>
                {icon}
              </View>
              {focused && <View style={[styles.underline, { backgroundColor: activeColor }]} />}
            </View>
          );
        },
      })}
    >
      {/* Các tab hiển thị */}
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="Practice" options={{ title: 'Luyện tập' }} />
      <Tabs.Screen name="Library" options={{ title: 'Thư viện' }} />
      <Tabs.Screen name="Store" options={{ title: 'Cửa hàng' }} />
      <Tabs.Screen name="Profile" options={{ title: 'Hồ sơ' }} />

      {/* Ẩn các màn chi tiết (không hiện ở tab bar) */}
      <Tabs.Screen
        name="Learnning/Lesson/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="Library/Item"
        options={{ href: null }}
      />
    </Tabs>
  );
}
