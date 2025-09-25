import { StyleSheet } from 'react-native';
import { type Palette } from '@/theme/ThemeProvider';

export const S = StyleSheet.create({
  centerWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

export const cardStyles = {
  card: (p: Palette) =>
    ({
      backgroundColor: p.card,
      borderRadius: 16,
      padding: 12,
      marginBottom: 12,
      borderWidth: 1,
      borderColor: p.cardBorder,
    } as const),
  thumb: (p: Palette) =>
    ({
      width: 88,
      height: 88,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: p.bg,
      borderWidth: 1,
      borderColor: p.cardBorder,
    } as const),
};

export const S2 = StyleSheet.create({
  // (để trống nếu cần thêm)
});

export const SHeader = StyleSheet.create({
  // (để trống nếu muốn tách nhỏ hơn nữa)
});

export const SFactory = {
  screen: (p: Palette) => ({ flex: 1, backgroundColor: p.bg }),
  headerRow: (p: Palette) => ({
    paddingHorizontal: 16,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: p.bg,
  }),
  headerIconBtn: { padding: 4, marginRight: 8 },
  headerTitle: (p: Palette) => ({ color: p.text, fontSize: 22, fontWeight: '700' }),
  headerSub: (p: Palette) => ({ color: p.textMuted, marginTop: 4 }),
  changeBtn: (p: Palette) => ({
    paddingHorizontal: 10,
    height: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: p.cardBorder,
    borderWidth: 1,
    borderColor: p.cardBorder,
    color: p.textFaint,
    fontSize: 12,
    fontWeight: '600',
  }),
  loadingText: (p: Palette) => ({ color: p.textMuted, marginTop: 8 }),
  emptyTitle: (p: Palette) => ({ color: p.text, fontSize: 16, marginTop: 6, fontWeight: '600' }),
  emptySub: (p: Palette) => ({ color: p.textMuted, marginTop: 4, textAlign: 'center' }),
});

// aliases tiện dùng
export const screen = (p: Palette) => SFactory.screen(p);
export const headerRow = (p: Palette) => SFactory.headerRow(p);
export const headerTitle = (p: Palette) => SFactory.headerTitle(p);
export const headerSub = (p: Palette) => SFactory.headerSub(p);
export const changeBtn = (p: Palette) => SFactory.changeBtn(p);
export const loadingText = (p: Palette) => SFactory.loadingText(p);
export const emptyTitle = (p: Palette) => SFactory.emptyTitle(p);
export const emptySub = (p: Palette) => SFactory.emptySub(p);

// để tương thích với file container import nhanh:
export const SCompat = {
  screen,
  headerRow,
  headerIconBtn: SFactory.headerIconBtn,
  headerTitle,
  headerSub,
  changeBtn,
  centerWrap: S.centerWrap,
  loadingText,
  emptyTitle,
  emptySub,
};

// export dạng object có hàm để dùng như `S.screen(palette)`
export const SObj = {
  screen,
  headerRow,
  headerIconBtn: SFactory.headerIconBtn,
  headerTitle,
  headerSub,
  changeBtn,
  centerWrap: S.centerWrap,
  loadingText,
  emptyTitle,
  emptySub,
};

// dùng ngắn gọn trong file container:
export const SProxy = new Proxy(SObj, {
  get: (_, k: keyof typeof SObj) => SObj[k],
});

// == re-export tên ngắn giống file gốc ==
export const SShort = {
  screen,
  headerRow,
  headerIconBtn: SFactory.headerIconBtn,
  headerTitle,
  headerSub,
  changeBtn,
  centerWrap: S.centerWrap,
  loadingText,
  emptyTitle,
  emptySub,
};

// để đồng bộ tên hàm theo thói quen ở trên:
export const SUnified: any = {
  screen,
  headerRow,
  headerIconBtn: SFactory.headerIconBtn,
  headerTitle,
  headerSub,
  changeBtn,
  centerWrap: S.centerWrap,
  loadingText,
  emptyTitle,
  emptySub,
};
