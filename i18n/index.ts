export const I18N = {
  vi: {
    hello: 'Xin chào',
    noClass: 'Chưa chọn lớp',
    chooseClass: 'Chọn lớp',
    changeClass: 'Đổi lớp',
    yourClass: 'Lớp của bạn',
    quickActions: 'Bắt đầu nhanh',
    startLearning: 'Bắt đầu học',
    practice: 'Luyện tập',
    game: 'Trò chơi thử thách',
    stats: 'Thống kê',
    points: 'Điểm',
    badges: 'Huy hiệu',
    streak: 'Chuỗi ngày',
    days: 'ngày',
    selectTitle: 'Chọn lớp của bạn',
    saving: 'Đang lưu...',
    save: 'Lưu',
    cancel: 'Hủy',
    loading: 'Đang tải...',
    coins: 'Xu',
    topup: 'Nạp xu',
    earnedBadges: 'Huy hiệu đã đạt',
    viewAll: 'Xem tất cả',
    noBadges: 'Chưa có huy hiệu nào.',
  },
} as const;

type Lang = 'vi';
const LANG: Lang = 'vi';
export function t(key: keyof typeof I18N['vi']) {
  return I18N[LANG][key];
}
