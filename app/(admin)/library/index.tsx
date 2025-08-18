import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
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

/* ---------- Cloudinary config ---------- */
const CLOUD_NAME = 'djf9vnngm';
const UPLOAD_PRESET = 'upload_pdf_unsigned';
const CLOUD_FOLDER = 'library';

/* ---------- Types ---------- */
type LibraryItem = {
  id?: string;
  title: string;
  subtitle?: string;
  grade: number; // 1..12
  type: 'pdf';
  tags?: string[];
  url: string; // cloudinary secure_url
  updatedAt?: any; // Timestamp
};

const PAGE_SIZE = 20;
const GRADES = Array.from({ length: 12 }, (_, i) => i + 1);

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
  const [sortBy, setSortBy] = useState<'updatedAt' | 'title'>('updatedAt');

  /* Modal Edit (chỉ còn dùng để sửa) */
  const [visible, setVisible] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [fTitle, setFTitle] = useState('');
  const [fSubtitle, setFSubtitle] = useState('');
  const [fGrade, setFGrade] = useState<number>(1);
  const [fTags, setFTags] = useState<string>(''); // comma separated
  const [fUrl, setFUrl] = useState<string>('');   // cloudinary url
  const [uploading, setUploading] = useState(false);

  const colRef = useMemo(() => collection(db, 'library'), []);

  /* ---------- Build Firestore query ---------- */
  const buildQuery = useCallback(() => {
    const parts: any[] = [];
    if (gradeFilter) parts.push(where('grade', '==', gradeFilter));
    parts.push(orderBy(sortBy === 'title' ? 'title' : 'updatedAt', sortBy === 'title' ? 'asc' : 'desc'));
    parts.push(limit(PAGE_SIZE));
    return query(colRef, ...parts);
  }, [colRef, gradeFilter, sortBy]);

  const fetchFirst = useCallback(async () => {
    setLoading(true);
    setHasMore(true);
    lastDocRef.current = null;
    try {
      const qRef = buildQuery();
      const snap = await getDocs(qRef);
      const data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as LibraryItem[];

      const filtered = qText.trim()
        ? data.filter((it) => {
            const t = qText.trim().toLowerCase();
            return (
              it.title?.toLowerCase().includes(t) ||
              it.subtitle?.toLowerCase().includes(t) ||
              (it.tags || []).some((x) => x.toLowerCase().includes(t))
            );
          })
        : data;

      setItems(filtered);
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : null;
    } catch (e) {
      console.warn('fetchFirst error', e);
      Alert.alert('Lỗi', 'Không tải được dữ liệu.');
    } finally {
      setLoading(false);
    }
  }, [buildQuery, qText]);

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
      const filtered = qText.trim()
        ? data.filter((it) => {
            const t = qText.trim().toLowerCase();
            return (
              it.title?.toLowerCase().includes(t) ||
              it.subtitle?.toLowerCase().includes(t) ||
              (it.tags || []).some((x) => x.toLowerCase().includes(t))
            );
          })
        : data;

      setItems((prev) => [...prev, ...filtered]);
      setHasMore(snap.docs.length === PAGE_SIZE);
      lastDocRef.current = snap.docs.length ? snap.docs[snap.docs.length - 1] : lastDocRef.current;
    } catch (e) {
      console.warn('fetchMore error', e);
    }
  }, [colRef, gradeFilter, sortBy, qText, hasMore, loading, refreshing]);

  useEffect(() => {
    fetchFirst();
  }, [gradeFilter, sortBy, qText]);

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
    setFUrl('');
  }, []);

  // THAY ĐỔI: Add → điều hướng sang trang thêm mới
  const openAdd = useCallback(() => {
    resetForm();
    router.push('/(admin)/library/add');
  }, [resetForm, router]);

  const openEdit = useCallback((it: LibraryItem) => {
    setEditingId(it.id || null);
    setFTitle(it.title || '');
    setFSubtitle(it.subtitle || '');
    setFGrade(it.grade || 1);
    setFTags((it.tags || []).join(', '));
    setFUrl(it.url || '');
    setVisible(true);
  }, []);

  /** Chọn và upload PDF lên Cloudinary (dùng trong Sửa) */
  const pickPdf = useCallback(async () => {
    const res = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file?.uri) return;

    try {
      setUploading(true);

      const MAX_MB = 10;
      if (file.size && file.size > MAX_MB * 1024 * 1024) {
        Alert.alert('File quá lớn', `Giới hạn ${MAX_MB}MB.`);
        return;
      }

      const rnFile = {
        uri: file.uri,
        name: file.name?.endsWith('.pdf') ? file.name : (file.name || `document-${Date.now()}.pdf`),
        type: file.mimeType || 'application/pdf',
      } as any;

      const form = new FormData();
      form.append('file', rnFile);
      form.append('upload_preset', UPLOAD_PRESET);
      form.append('folder', CLOUD_FOLDER);

      const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/raw/upload`;
      const resp = await fetch(endpoint, { method: 'POST', body: form });

      if (!resp.ok) {
        const text = await resp.text();
        console.log('Cloudinary status:', resp.status);
        console.log('Cloudinary response:', text);
        throw new Error(`Cloudinary upload failed: ${resp.status}`);
      }

      const json = await resp.json();
      const url = json.secure_url as string;

      setFUrl(url);
      Alert.alert('Thành công', 'Đã tải PDF lên Cloudinary.');
    } catch (e: any) {
      console.warn('upload pdf error', e);
      Alert.alert('Lỗi', e?.message ?? 'Tải PDF thất bại.');
    } finally {
      setUploading(false);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!fTitle.trim()) {
      Alert.alert('Thiếu thông tin', 'Vui lòng nhập tiêu đề.');
      return;
    }
    if (!fUrl) {
      Alert.alert('Thiếu file', 'Vui lòng chọn và tải lên PDF.');
      return;
    }

    const payload: Omit<LibraryItem, 'id'> = {
      title: fTitle.trim(),
      subtitle: fSubtitle.trim() || '',
      grade: Number(fGrade) || 1,
      type: 'pdf',
      tags: fTags
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      url: fUrl,
      updatedAt: serverTimestamp(),
    };

    try {
      if (editingId) {
        await updateDoc(doc(db, 'library', editingId), payload as any);
        Alert.alert('Đã cập nhật', 'Tài liệu đã được cập nhật.');
      } else {
        const newRef = doc(collection(db, 'library'));
        await setDoc(newRef, payload as any);
        Alert.alert('Đã thêm', 'Tài liệu mới đã được thêm.');
      }
      setVisible(false);
      resetForm();
      fetchFirst();
    } catch (e) {
      console.warn('save error', e);
      Alert.alert('Lỗi', 'Không thể lưu tài liệu.');
    }
  }, [editingId, fTitle, fSubtitle, fGrade, fTags, fUrl, resetForm, fetchFirst]);

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
            }}
          >
            <MaterialCommunityIcons name="file-pdf-box" size={28} color="#B91C1C" />
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: '#111827' }} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }} numberOfLines={1}>
              {item.subtitle || `Lớp ${item.grade} • PDF`}
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
            placeholder="Tìm theo tiêu đề, tag…"
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
                  marginRight: 8,
                  backgroundColor: active ? '#4F46E5' : '#EEF2FF',
                }}
              >
                <Text style={{ color: active ? '#fff' : '#4F46E5', fontWeight: '700' }}>
                  {g ? `Lớp ${g}` : 'Tất cả'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    );
  }, [insets.top, qText, gradeFilter, sortBy, openAdd]);

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

      {/* Modal Edit only */}
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

                {/* PDF picker */}
                <Text style={{ fontWeight: '700', marginBottom: 6 }}>File PDF *</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <TouchableOpacity
                    onPress={pickPdf}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      backgroundColor: '#111827',
                      paddingHorizontal: 12,
                      paddingVertical: 10,
                      borderRadius: 10,
                    }}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="file-upload-outline" size={18} color="#fff" />
                        <Text style={{ color: '#fff', marginLeft: 8, fontWeight: '700' }}>Chọn & Tải PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text numberOfLines={2} style={{ color: fUrl ? '#065F46' : '#6B7280' }}>
                      {fUrl ? 'Đã có URL PDF' : 'Chưa chọn PDF'}
                    </Text>
                  </View>
                </View>

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
                    disabled={uploading}
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
                    disabled={uploading}
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
