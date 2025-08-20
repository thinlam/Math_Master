// services/payments/index.tsx
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

/** Kết quả chung cho mọi provider */
export type PayResult = { status: 'opened' | 'completed' | 'cancelled' };

export type StoreItem = {
  id: string;
  title: string;
  desc: string;
  price: number;
  iapProductId?: string;
  type?: 'consumable' | 'non_consumable' | 'subscription';
};

/* =========
   Global state + PubSub để ép re-render modal khi mở/đóng
   ========= */
let resolver: ((r: PayResult) => void) | null = null;
let _visible = false;
let _payload: { provider: string; itemTitle: string; amount: number } | null = null;

const listeners = new Set<() => void>();
function notify() {
  listeners.forEach((fn) => fn());
}
function useGlobalModalRerender() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const refresh = () => setTick((x) => x + 1);
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }, []);
}

/* =========
   Sandbox UI
   ========= */
export function SandboxPayModal() {
  useGlobalModalRerender();

  if (!_visible || !_payload) return null;

  const { provider, itemTitle, amount } = _payload;

  const close = (result: PayResult) => {
    _visible = false;
    notify(); // yêu cầu re-render để ẩn modal
    const r = resolver;
    resolver = null;
    if (r) r(result);
  };

  return (
    <Modal
      visible
      transparent
      animationType="slide"
      onRequestClose={() => close({ status: 'cancelled' })}
    >
      <View style={S.backdrop}>
        <View style={S.sheet}>
          <Text style={S.title}>Thanh toán Sandbox</Text>

          <Text style={S.line}>
            Cổng: <Text style={S.bold}>{provider}</Text>
          </Text>
          <Text style={S.line}>
            Gói: <Text style={S.bold}>{itemTitle}</Text>
          </Text>
          <Text style={S.line}>
            Số tiền: <Text style={S.bold}>{amount.toLocaleString()}đ</Text>
          </Text>

          <View style={S.row}>
            <Btn
              label="✅ Thành công"
              onPress={() => close({ status: 'completed' })}
            />
            <Btn
              label="🛑 Hủy"
              onPress={() => close({ status: 'cancelled' })}
            />
          </View>

          <View style={{ height: 8 }} />

          <Btn
            label="⚠️ Lỗi (thất bại)"
            onPress={() => close(PAY_FAILED)}
            kind="danger"
          />
        </View>
      </View>
    </Modal>
  );
}

function Btn({
  label,
  onPress,
  kind = 'primary',
}: {
  label: string;
  onPress: () => void;
  kind?: 'primary' | 'danger';
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[S.btn, kind === 'danger' && { backgroundColor: '#ef4444' }]}
      activeOpacity={0.85}
    >
      <Text style={{ color: 'white', fontWeight: '700' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const S = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  sheet: {
    width: '100%',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: 'white',
    padding: 16,
    paddingBottom: 28,
  },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 8 },
  line: { fontSize: 14, marginTop: 4 },
  bold: { fontWeight: '700' },
  row: { flexDirection: 'row', gap: 10, marginTop: 14 },
  btn: {
    flex: 1,
    backgroundColor: '#10b981',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
});

const PAY_FAILED: PayResult = { status: 'cancelled' };

/** Mở sandbox modal và trả Promise kết quả */
function sandboxPay(provider: string, item: StoreItem): Promise<PayResult> {
  _payload = { provider, itemTitle: item.title, amount: item.price };
  _visible = true;
  notify(); // yêu cầu re-render để hiện modal

  return new Promise<PayResult>((res) => {
    resolver = res;
    // Khi người dùng chọn 1 nút, close() sẽ resolve promise này.
  });
}

/* ===================
   API chính: payWith()
   =================== */
export async function payWith(
  provider: 'iap' | 'momo' | 'zalopay' | 'vnpay',
  item: StoreItem,
  _userId?: string,
): Promise<PayResult> {
  // DEV/TEST: luôn dùng sandbox UI để giả lập
  return sandboxPay(provider, item);

  /* PROD skeleton (khi tích hợp SDK thật):
  switch (provider) {
    case 'iap':     return await iapPurchase(item);
    case 'momo':    return await momoPay(item, _userId!);
    case 'zalopay': return await zaloPay(item, _userId!);
    case 'vnpay':   return await vnpay(item, _userId!);
  }
  */
}
