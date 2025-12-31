import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, STYLES } from '../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNav } from './components/SharedComponents';

const StatBox = ({ label, count, color, icon }) => (
  <View style={[styles.statBox, STYLES.shadow]}>
    <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
      <FontAwesome5 name={icon} size={18} color={color} />
    </View>
    <Text style={styles.statCount}>{count}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

// --- NEW: Matching Project Design from Manage Projects ---
const ProjectCard = ({ project }) => {
  const isDelayed = project.badgeType === 'DELAYED';
  const statusColor = isDelayed ? COLORS.error : COLORS.success;

  return (
    <View style={[styles.card, STYLES.shadow]}>
      <View style={styles.cardHeader}>
        <View style={{flex: 1}}>
          <Text style={styles.cTitle}>{project.title}</Text>
          <Text style={styles.cCat}>{project.category}</Text>
        </View>
        <View style={[styles.statusTag, { borderColor: statusColor }]}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: statusColor }}>{project.badgeType}</Text>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.detailsGrid}>
        <View>
          <Text style={styles.lbl}>BUDGET</Text>
          <Text style={styles.val}>{project.budget}</Text>
        </View>
        <View>
          <Text style={styles.lbl}>TARGET</Text>
          <Text style={styles.val}>{project.targetDate}</Text>
        </View>
        <View>
          <Text style={styles.lbl}>PROGRESS</Text>
          <Text style={[styles.val, {color: COLORS.primary}]}>{project.progress}%</Text>
        </View>
      </View>
    </View>
  );
};

export const DashboardView = ({ data, actions }) => {
  const { stats, projects } = data;
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Visual Header */}
      <View style={styles.headerContainer}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryDark]}
          style={[styles.headerGradient, { paddingTop: insets.top + 30 }]}
        >
          <View>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.username}>Captain!</Text>
          </View>
        </LinearGradient>
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatBox label="Active" count={stats.active} color={COLORS.primary} icon="hammer" />
          <StatBox label="Issues" count={stats.issues} color={COLORS.error} icon="exclamation-triangle" />
          <StatBox label="Done" count={stats.done} color={COLORS.success} icon="check" />
        </View>

        <Text style={styles.sectionTitle}>Recent Activity</Text>
        {projects.map((p) => <ProjectCard key={p.id} project={p} />)}
      </ScrollView>

      <BottomNav activeTab="Dashboard" onNavigate={actions.navigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: { height: 170, borderBottomRightRadius: 30, borderBottomLeftRadius: 30, overflow: 'hidden' },
  headerGradient: { flex: 1, paddingHorizontal: 24 },
  greeting: { color: 'rgba(255,255,255,0.8)', fontSize: 16, fontWeight: '600' },
  username: { color: COLORS.white, fontSize: 34, fontWeight: '800' },

  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, marginBottom: 30 },
  statBox: { width: '31%', backgroundColor: COLORS.surface, padding: 16, borderRadius: 20, alignItems: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statCount: { fontSize: 24, fontWeight: '800', color: COLORS.textDark },
  statLabel: { fontSize: 12, color: COLORS.textGrey, fontWeight: '600' },

  sectionTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 16 },

  // --- Updated Card Styles (Matching Manage Projects) ---
  card: { backgroundColor: COLORS.white, borderRadius: 20, padding: 20, marginBottom: 16, borderWidth: 1, borderColor: '#F3F4F6' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  cCat: { fontSize: 12, color: COLORS.textGrey, fontWeight: '600', letterSpacing: 0.5 },
  statusTag: { borderWidth: 1.5, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8 },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  detailsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  lbl: { fontSize: 10, fontWeight: '700', color: COLORS.textLight, letterSpacing: 1, marginBottom: 4 },
  val: { fontSize: 14, fontWeight: '600', color: COLORS.textDark }
});