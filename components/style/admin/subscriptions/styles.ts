import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  root: { flex: 1 },

  // Header
  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    paddingTop: 8,
    borderBottomWidth: 1,
  },
  title: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  searchBox: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  searchInput: { flex: 1, paddingVertical: 8, fontSize: 15 },
  segmentWrap: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  segmentItem: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  segmentText: { fontSize: 13, fontWeight: '700', textTransform: 'lowercase' },
  segmentReload: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 12, borderWidth: 1, marginLeft: 'auto' },
  createTop: {
    marginTop: 6,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Card
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  plan: { fontSize: 16, fontWeight: '800' },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '700', textTransform: 'lowercase' },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  metaText: { fontSize: 13, marginLeft: 6, marginRight: 6 },
  metaValue: { fontSize: 13, fontWeight: '600', flexShrink: 1 },

  // FAB
  fab: {
    position: 'absolute',
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
});
