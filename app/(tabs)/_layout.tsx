/**
 * Dự án: EFB - English For Beginners
 * Mục đích: Xây dựng ứng dụng học tiếng Anh cơ bản.
 * Người dùng: Người mới bắt đầu học tiếng Anh.
 * Chức năng: Đăng nhập, đăng ký, học từ vựng, ngữ pháp, luyện nghe nói.
 * Công nghệ: React Native, Expo, Firebase, expo-router Tabs.
 * Tác giả: [NHÓM EFB]
 * Ngày tạo: 01/06/2025
 */

import { styles } from '@/components/style/LayoutStyles';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

export default function TabLayout() {
  // Màu riêng cho từng tab khi được chọn
  const activeColors: Record<string, string> = {
    index: '#4F46E5',     // Tím xanh
    Learn: '#16A34A',     // Xanh lá
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
        tabBarStyle: { height: 70 },
        tabBarIcon: ({ focused }) => {
          const color = focused ? activeColors[route.name] || '#4F46E5' : '#666';
          let icon = null;

          switch (route.name) {
            case 'index':
              icon = <Ionicons name="home" size={24} color={color} />;
              break;
            case 'Learn':
              icon = <FontAwesome5 name="book-open" size={22} color={color} />;
              break;
            case 'Practice':
              icon = <FontAwesome5 name="trophy" size={22} color={color} />;
              break;
            case 'Library':
              icon = <Ionicons name="play-circle" size={24} color={color} />;
              break;
            case 'Store':
              icon = <Text style={{ fontSize: 24, color }}>{'🎓'}</Text>;
              break;
            default:
              icon = <Ionicons name="ellipsis-horizontal" size={24} color={color} />;
            case 'Profile':
              icon = <Ionicons name="person-circle" size={26} color={color} />;
              break;
            
          }

          return (
            <View style={styles.iconWrapper}>
              <View style={[styles.iconCircle, focused && styles.iconCircleFocused]}>
                {icon}
              </View>
              {focused && <View style={styles.underline} />}
            </View>
          );
        },
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="Learn" />
      <Tabs.Screen name="Practice" />
      <Tabs.Screen name="Library" />
      <Tabs.Screen name="Store" />
      <Tabs.Screen name="Profile" />
      
    </Tabs>
  );
}
