import { StyleSheet } from 'react-native';

export const AnalyticsStyles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#0b1220' },

  headerWrap: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: {
    width: 40, height: 40, borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  headerTitle: {
    color: '#fff', fontSize: 20, fontWeight: '800',
    flex: 1, textAlign: 'center', marginRight: 40,
  },

  content: {
    paddingHorizontal: 16,
  },

  // card
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    marginBottom: 12,
  },
  cardLabel: { color: '#cbd5e1' },
  cardValue: { color: '#fff', fontWeight: '800', fontSize: 28, marginTop: 6 },
});
