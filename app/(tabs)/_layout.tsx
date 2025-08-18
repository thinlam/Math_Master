import { styles } from '@/components/style/LayoutStyles';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Text, View } from 'react-native';

export default function TabLayout() {
  // Màu riêng cho từng tab khi được chọn
  const activeColors: Record<string, string> = {
    index: '#4F46E5',     // Tím xanh
    Learn: '#16A34A',     // Xanh lá (để sẵn nếu sau này thêm tab Learn)
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
          let icon: React.ReactNode = null;

          switch (route.name) {
            case 'index':
              icon = <Ionicons name="home" size={24} color={color} />;
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

            case 'Profile':
              icon = <Ionicons name="person-circle" size={26} color={color} />;
              break;

            default:
              icon = <Ionicons name="ellipsis-horizontal" size={24} color={color} />;
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
      {/* Các tab hiển thị */}
      <Tabs.Screen name="index" options={{ title: 'Trang chủ' }} />
      <Tabs.Screen name="Practice" options={{ title: 'Luyện tập' }} />
      <Tabs.Screen name="Library" options={{ title: 'Thư viện' }} />
      <Tabs.Screen name="Store" options={{ title: 'Cửa hàng' }} />
      <Tabs.Screen name="Profile" options={{ title: 'Hồ sơ' }} />

      {/* Ẩn route chi tiết bài học: /Learnning/Lesson/[id] */}
      <Tabs.Screen
        name="Learnning/Lesson/[id]"
        options={{
          href: null, // không xuất hiện trong tab bar, nhưng vẫn có thể router.push(...)
        }}
      />
    </Tabs>
  );
}
