import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/* ---------- Firebase (Firestore only) ---------- */
import { db } from '@/scripts/firebase';
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc,
  where,
} from 'firebase/firestore';

/* ---------- Types (TEXT ONLY) ---------- */
type LibraryItem = {
  id?: string;
  title: string;
  subtitle?: string;
  grade: number;       // 1..12
  tags?: string[];
  content: string;     // Nội dung text copy từ Word
  updatedAt?: any;     // Timestamp
  premium?: boolean;   // <-- thêm
};

const PAGE_SIZE = 20;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

type LevelFilter = 'all' | 'basic' | 'advanced';

/* ---------- Chip nhỏ tiện dùng ---------- */
const Chip = ({
  active, label, onPress,
  activeBg = '#4F46E5', activeText = '#fff', inactiveBg = '#EEF2FF', inactiveText = '#4F46E5'
}: { active: boolean; label: string; onPress: () => void; activeBg?: string; activeText?: string; inactiveBg?: string; inactiveText?: string; }) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      marginRight: 8,
      backgroundColor: active ? activeBg : inactiveBg,
    }}
  >
    <Text style={{ color: active ? activeText : inactiveText, fontWeight: '700' }}>{label}</Text>
  </TouchableOpacity>
);

/* ---------- Main ---------- */
export default function AdminLibraryScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  /* List state */
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const lastDocRef = useRef<QueryDocumentSnapshot | null>(null);

  /* Filters */
  const [qText, setQText] = useState('');
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all'); // <-- thêm
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title'>('updatedAt');

  /* Modal Add/Edit */
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState('');
  const [fSubtitle, setFSubtitle] = useState('');
  const [fGrade, setFGrade] = useState<number>(1);
  const [fTags, setFTags] = useState<string>('');          // comma separated
  const [fContent, setFContent] = useState<string>('');    // TEXT CONTENT
  const [fLevel, setFLevel] = useState<'basic' | 'advanced'>('basic'); // <-- thêm

  const colRef = useMemo(() => collection(db, 'library'), []);

  /* ---------- Build Firestore query ---------- */
  const buildQuery = useCallback(() => {
    const parts: any[] = [];
    if (gradeFilter) parts.push(where('grade', '==', gradeFilter));
    // Lọc premium trên client để không cần index thêm; nếu muốn có thể thêm where('premium', '==', true/false)
    parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
    parts.push(limit(PAGE_SIZE));
    return query(colRef, ...parts);
  }, [colRef, gradeFilter, sortBy]);

  const applySearchAndLevel = useCallback((arr: LibraryItem[]) => {
    const t = qText.trim().toLowerCase();
    let out = arr;

    if (t) {
      out = out.filter((it) => {
        const inTitle = it.title?.toLowerCase().includes(t);
        const inSub = it.subtitle?.toLowerCase().includes(t);
        const inTag = (it.tags || []).some((x) => x.toLowerCase().includes(t));
        const inContent = it.content?.toLowerCase().includes(t);
        return inTitle || inSub || inTag || inContent;
      });
    }

    if (levelFilter === 'basic') {
      out = out.filter((it) => !it.premium);
    } else if (levelFilter === 'advanced') {
      out = out.filter((it) => !!it.premium);
    }

    return out;
  }, [qText, levelFilter]);

  const fetchFirst = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;
    try {
      const qRef = buildQuery();
      const snap = await getDocs(qRef);
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LibraryItem[];

      setItems(applySearchAndLevel(data));
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    } catch (e) {
      console.warn('fetchFirst error', e);
      Alert.alert('Lỗi', 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, applySearchAndLevel]);

  const fetchMore = useCallback(async () => {
    if (!hasMore || loading || refreshing || !lastDocRef.current) return;
    try {
      const parts: any[] = [];
      if (gradeFilter) parts.push(where('grade', '==', gradeFilter));
      parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
      parts.push(startAfter(lastDocRef.current));
      parts.push(limit(PAGE_SIZE));
      const qRef = query(colRef, ...parts);

      const snap = await getDocs(qRef);
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LibraryItem[];

      setItems((prev) => [...prev, ...applySearchAndLevel(data)]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : lastDocRef.current;
    } catch (e) {
      console.warn('fetchMore error', e);
    }
  }, [colRef, gradeFilter, sortBy, hasMore, loading, refreshing, applySearchAndLevel]);

  useEffect(() => {
    fetchFirst();
  }, [gradeFilter, sortBy, qText, levelFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchFirst();
    setRefreshing(false);
  }, [fetchFirst]);

  /* ---------- CRUD ---------- */
  const resetForm = useCallback(() => {
    setEditingId(null);
    setFTitle('');
    setFSubtitle('');
    setFGrade(1);
    setFTags('');
    setFContent('');
    setFLevel('basic');
  }, []);

  const openAdd = useCallback(() => {
    resetForm();
    setVisible(true);
  }, [resetForm]);

  const openEdit = useCallback((it: LibraryItem) => {
    setEditingId(it.id || null);
    setFTitle(it.title || '');
    setFSubtitle(it.subtitle || '');
    setFGrade(it.grade || 1);
    setFTags((it.tags || []).join(', '));
    setFContent(it.content || '');
    setFLevel(it.premium ? 'advanced' : 'basic');
    setVisible(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!fTitle.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề.');
      return;
    }
    if (!fContent.trim()) {
      Alert.alert('Thiếu nội dung', 'Vui lòng nhập nội dung.');
      return;
    }

    const payload: Omit<LibraryItem, 'id'> = {
      title: fTitle.trim(),
      subtitle: fSubtitle.trim() || '',
      grade: Number(fGrade) || 1,
      tags: fTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      content: fContent.trim(),
      premium: fLevel === 'advanced',                 // <-- quan trọng
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'library', editingId), payload as any);
        Alert.alert('Đã cập nhật', 'Tài liệu đã được cập nhật.');
      } else {
        const newRef = doc(collection(db, 'library'));
        await setDoc(newRef, payload as any);
        Alert.alert('Đã thêm', `Tài liệu mới (${fLevel === 'advanced' ? 'Nâng cao' : 'Cơ bản'}) đã được thêm.`);
      }
      setVisible(false);
      resetForm();
      fetchFirst();
    } catch (e) {
      console.warn('save error', e);
      Alert.alert('Lỗi', 'Không thể lưu tài liệu.');
    }
  }, [editingId, fTitle, fSubtitle, fGrade, fTags, fContent, fLevel, resetForm, fetchFirst]);

  const handleDelete = useCallback((id: string) => {
    Alert.alert('Xoá tài liệu?', 'Bạn chắc chắn muốn xoá?', [
      { text: 'Huỷ', style: 'cancel' },
      {
        text: 'Xoá',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteDoc(doc(db, 'library', id));
            setItems((prev) => prev.filter((x) => x.id !== id));
            Alert.alert('Đã xoá', 'Tài liệu đã bị xoá.');
          } catch (e) {
            console.warn('delete error', e);
            Alert.alert('Lỗi', 'Không thể xoá tài liệu.');
          }
        },
      },
    ]);
  }, []);

  /* ---------- List UI ---------- */
  const renderItem = useCallback(
    ({ item }: { item: LibraryItem }) => {
      const isPremium = !!item.premium;
      return (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            padding: 14,
            backgroundColor: '#fff',
            borderRadius: 14,
            marginHorizontal: 16,
            marginVertical: 6,
            elevation: 1,
            shadowColor: '#000',
            shadowOpacity: 0.05,
            shadowRadius: 8,
          }}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: '#F3F4F6',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 12,
              position: 'relative',
            }}
          >
            <MaterialCommunityIcons name="file-document-outline" size={28} color="#4F46E5" />
            {isPremium && (
              <View style={{
                position: 'absolute',
                right: -6, top: -6,
                width: 20, height: 20, borderRadius: 10,
                backgroundColor: '#EF4444',
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 2, borderColor: '#fff'
              }}>
                <Ionicons name="star" size={12} color="#fff" />
              </View>
            )}
          </View>

          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
                {item.title}
              </Text>
              {isPremium && (
                <View style={{
                  marginLeft: 8,
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: '#F59E0B',
                  backgroundColor: '#FFF7ED',
                  gap: 4
                }}>
                  <Ionicons name="lock-closed" size={12} color="#D97706" />
                  <Text style={{ fontSize: 11, fontWeight: '800', color: '#D97706' }}>Premium</Text>
                </View>
              )}
            </View>

            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
              {item.subtitle || `Lớp ${item.grade} • Văn bản`}
            </Text>

            {!!item.tags?.length && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 }}>
                {item.tags.slice(0, 3).map((t, idx) => (
                  <View
                    key={idx}
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 4,
                      backgroundColor: '#EEF2FF',
                      borderRadius: 999,
                      marginRight: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: '#4F46E5' }}>#{t}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity onPress={() => openEdit(item)} style={{ padding: 8 }}>
            <Ionicons name="create-outline" size={20} color="#374151" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id!)} style={{ padding: 8 }}>
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      );
    },
    [handleDelete, openEdit]
  );

  const keyExtractor = useCallback((it: LibraryItem, i: number) => it.id || String(i), []);

  /* ---------- Header ---------- */
  const ListHeader = useMemo(() => {
    return (
      <View style={{ paddingTop: insets.top + 8, paddingBottom: 8, backgroundColor: '#FFFFFF' }}>
        {/* Title + Add */}
        <View style={{ paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#111827', flex: 1 }}>Quản lý Thư viện</Text>
          <TouchableOpacity
            onPress={openAdd}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#4F46E5',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 10,
            }}
          >
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={{ color: '#fff', fontWeight: '700', marginLeft: 4 }}>Thêm mới</Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View
          style={{
            marginHorizontal: 16,
            marginBottom: 8,
            borderRadius: 12,
            backgroundColor: '#F3F4F6',
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: 12,
            height: 44,
          }}
        >
          <Ionicons name="search" size={18} color="#6B7280" />
          <TextInput
            placeholder="Tìm theo tiêu đề, nội dung, tag…"
            placeholderTextColor="#9CA3AF"
            value={qText}
            onChangeText={setQText}
            style={{ flex: 1, marginLeft: 8, color: '#111827' }}
            returnKeyType="search"
          />
          {!!qText && (
            <TouchableOpacity onPress={() => setQText('')}>
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12 }}>
          {/* Sort */}
          <TouchableOpacity
            onPress={() => setSortBy((s) => (s === 'updatedAt' ? 'title' : 'updatedAt'))}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderRadius: 999,
              backgroundColor: '#E5E7EB',
              marginRight: 8,
              flexDirection: 'row',
              alignItems: 'center',
            }}
          >
            <Ionicons name="swap-vertical" size={16} color="#111827" />
            <Text style={{ marginLeft: 6, fontWeight: '600', color: '#111827' }}>
              {sortBy === 'updatedAt' ? 'Mới nhất' : 'A → Z'}
            </Text>
          </TouchableOpacity>

          {/* Level filter */}
          <Chip active={levelFilter === 'all'} label="Tất cả" onPress={() => setLevelFilter('all')} activeBg="#111827" inactiveText="#111827" activeText="#fff" inactiveBg="#E5E7EB" />
          <Chip active={levelFilter === 'basic'} label="Cơ bản" onPress={() => setLevelFilter('basic')} />
          <Chip active={levelFilter === 'advanced'} label="Nâng cao" onPress={() => setLevelFilter('advanced')} />

          {/* Grade filter */}
          {[null, ...GRADES].map((g, idx) => {
            const active = gradeFilter === g || (g === null && gradeFilter === null);
            return (
              <TouchableOpacity
                key={idx}
                onPress={() => setGradeFilter(g)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 8,
                  borderRadius: 999,
                  marginLeft: 8,
                  backgroundColor: active ? '#4F46E5' : '#EEF2FF',
                }}
              >
                <Text style={{ color: active ? '#fff' : '#4F46E5', fontWeight: '700' }}>
                  {g ? `Lớp ${g}` : 'Tất cả lớp'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [insets.top, qText, gradeFilter, sortBy, levelFilter, openAdd]);

  const ListEmpty = useCallback(
    () => (
      <View style={{ alignItems: 'center', paddingTop: 48 }}>
        {loading ? (
          <ActivityIndicator />
        ) : (
          <>
            <Ionicons name="book-outline" size={40} color="#9CA3AF" />
            <Text style={{ color: '#6B7280', marginTop: 8 }}>Chưa có tài liệu</Text>
          </>
        )}
      </View>
    ),
    [loading]
  );

  const ListFooter = useCallback(() => {
    if (loading && items.length === 0) return null;
    if (!hasMore) return <View style={{ height: 32 }} />;
    return (
      <View style={{ paddingVertical: 16 }}>
        <ActivityIndicator />
      </View>
    );
  }, [loading, hasMore, items.length]);

  /* ---------- Render ---------- */
  return (
    <View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
      <FlatList
        data={items}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        onEndReachedThreshold={0.3}
        onEndReached={fetchMore}
        ListHeaderComponent={ListHeader}
        ListEmptyComponent={ListEmpty}
        ListFooterComponent={ListFooter}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ paddingBottom: 24 }}
      />

      {/* Modal Add/Edit */}
      <Modal visible={visible} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom : 0}
            style={{ width: '100%' }}
          >
            <View
              style={{
                backgroundColor: '#fff',
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                paddingBottom: 24,
                maxHeight: '92%',
              }}
            >
              <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 18, fontWeight: '800', flex: 1 }}>
                  {editingId ? 'Sửa tài liệu' : 'Thêm tài liệu'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setVisible(false);
                    resetForm();
                  }}
                >
                  <Ionicons name="close" size={22} color="#111827" />
                </TouchableOpacity>
              </View>

              <ScrollView
                keyboardShouldPersistTaps="handled"
                automaticallyAdjustKeyboardInsets
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 120 }}
              >
                {/* Level */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mức độ *</Text>
                <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                  <Chip active={fLevel === 'basic'} label="Cơ bản" onPress={() => setFLevel('basic')} />
                  <Chip active={fLevel === 'advanced'} label="Nâng cao (Premium)" onPress={() => setFLevel('advanced')} />
                </View>

                {/* Title */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Tiêu đề *</Text>
                <TextInput
                  value={fTitle}
                  onChangeText={setFTitle}
                  placeholder="VD: Đề ôn giữa kỳ Toán 3"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    marginBottom: 12,
                  }}
                />

                {/* Subtitle */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Mô tả ngắn</Text>
                <TextInput
                  value={fSubtitle}
                  onChangeText={setFSubtitle}
                  placeholder="Theo SGK Kết nối tri thức…"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    marginBottom: 12,
                  }}
                />

                {/* Grade */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Lớp *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ marginBottom: 12 }}>
                  {GRADES.map((g) => {
                    const active = fGrade === g;
                    return (
                      <TouchableOpacity
                        key={g}
                        onPress={() => setFGrade(g)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          borderRadius: 999,
                          marginRight: 8,
                          backgroundColor: active ? '#4F46E5' : '#EEF2FF',
                        }}
                      >
                        <Text style={{ color: active ? '#fff' : '#4F46E5', fontWeight: '700' }}>Lớp {g}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Tags */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Tags (phân cách dấu phẩy)</Text>
                <TextInput
                  value={fTags}
                  onChangeText={setFTags}
                  placeholder="ôn tập, giữa kỳ, toán"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    height: 44,
                    marginBottom: 12,
                  }}
                />

                {/* CONTENT (TEXT) */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>Nội dung *</Text>
                <TextInput
                  value={fContent}
                  onChangeText={setFContent}
                  placeholder="Dán nội dung từ Word hoặc tự gõ tại đây…"
                  multiline
                  textAlignVertical="top"
                  style={{
                    borderWidth: 1,
                    borderColor: '#E5E7EB',
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                    minHeight: 220,
                    marginBottom: 12,
                  }}
                />

                {/* Actions */}
                <View style={{ flexDirection: 'row', justifyContent: 'flex-end', marginTop: 8 }}>
                  <TouchableOpacity
                    onPress={() => {
                      setVisible(false);
                      resetForm();
                    }}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: '#E5E7EB',
                      marginRight: 10,
                    }}
                  >
                    <Text style={{ fontWeight: '700' }}>Huỷ</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleSave}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 10,
                      backgroundColor: '#4F46E5',
                    }}
                  >
                    <Text style={{ fontWeight: '700', color: '#fff' }}>
                      {editingId ? 'Lưu thay đổi' : 'Thêm mới'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </View>
  );
}
