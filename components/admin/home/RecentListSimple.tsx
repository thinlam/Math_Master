import { RecentItem, formatDate } from '@/types/admin';
import React from 'react';
import { Text, View } from 'react-native';
import RoleBadge from './RoleBadge';

export default function RecentListSimple({ data, empty }: { data: RecentItem[]; empty: string }) {
  if (!data.length) return <Text style={{ color: '#94a3b8' }}>{empty}</Text>;
  return (
    <View>
      {data.map((item, idx) => (
        <View key={item.id}>
          <View style={{
            backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 12,
            padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ color: '#e2e8f0', fontWeight: '700', flex: 1 }}>{item.title}</Text>
              {item.type === 'user' && <RoleBadge role={(item.role as any) ?? 'user'} />}
            </View>
            {!!item.subtitle && <Text style={{ color: '#94a3b8', marginTop: 2 }}>{item.subtitle}</Text>}
            <Text style={{ color: '#64748b', marginTop: 4, fontSize: 12 }}>{formatDate(item.createdAt)}</Text>
          </View>
          {idx < data.length - 1 && <View style={{ height: 8 }} />}
        </View>
      ))}
    </View>
  );
}
