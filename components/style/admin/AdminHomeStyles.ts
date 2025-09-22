import { StyleSheet } from 'react-native';

export const AdminHomeStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },

  quickStatsWrap: { flexDirection: 'row', gap: 12, marginBottom: 12, flexWrap: 'wrap' },
  quickStatCard: {
    flexGrow: 1, minWidth: '47%',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  quickStatLabel: { color: '#cbd5e1', fontSize: 13 },
  quickStatValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginTop: 6 },

  quickActionWrap: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  quickActionTitle: { color: '#fff', fontSize: 16, fontWeight: '700', marginBottom: 8 },
  quickActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },

  section: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8,
  },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '700' },
  sectionAction: { color: '#93c5fd', fontWeight: '700' },

  fab: {
    position: 'absolute', right: 18,
    backgroundColor: '#3b82f6', borderRadius: 28,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 18, height: 56, flexDirection: 'row', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  fabText: { color: '#fff', fontWeight: '700' },
});
