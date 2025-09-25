import { styles as S } from '@/components/style/admin/subscriptions/styles';
import { EmptyState } from '@/screens/admin/subscriptions/components/EmptyState';
import { Header } from '@/screens/admin/subscriptions/components/Header';
import { SubItemCard } from '@/screens/admin/subscriptions/components/SubItemCard';
import { useSubscriptions } from '@/screens/admin/subscriptions/hooks/useSubscriptions';
import { useColorTokens } from '@/theme/useColorTokens';
import React from 'react';
import { ActivityIndicator, FlatList, Platform, RefreshControl, StatusBar, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
export default function AdminSubscriptions() {
  const insets = useSafeAreaInsets();
  const C = useColorTokens();
  const {
    items, loading,
    status, setStatus,
    uidQuery, setUidQuery,
    reload,
  } = useSubscriptions();

  return (
    <SafeAreaView style={[S.root, { backgroundColor: C.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} />
      <FlatList
        data={items}
        keyExtractor={(it) => it.id!}
        ListHeaderComponent={
          <Header
            C={C}
            status={status}
            setStatus={setStatus}
            uidQuery={uidQuery}
            setUidQuery={setUidQuery}
            onReload={reload}
          />
        }
        stickyHeaderIndices={[0]}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} tintColor={C.primary} />}
        renderItem={({ item }) => <SubItemCard item={item} C={C} />}
        ListEmptyComponent={
          loading
            ? <ActivityIndicator style={{ marginTop: 24 }} color={C.primary} />
            : <EmptyState C={C} />
        }
      />

      {/* FAB */}
      <View style={[
        S.fab,
        {
          backgroundColor: C.primary,
          shadowColor: C.isDark ? '#000' : C.primary2,
          bottom: (Platform.OS === 'ios' ? 24 : 20) + insets.bottom,
        },
      ]}>
        {/** để nguyên TouchableOpacity trong SubItemCard/Header; ở đây chỉ giữ layout */}
      </View>
    </SafeAreaView>
  );
}
