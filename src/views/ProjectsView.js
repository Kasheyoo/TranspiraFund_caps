import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants';
import { BottomNav } from './components/SharedComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const FilterPill = ({ label, active, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.pill, active && styles.pillActive]}>
    <Text style={[styles.pillText, active && styles.pillTextActive]}>{label}</Text>
  </TouchableOpacity>
);

const ProjectItem = ({ project, onPress }) => {
  const isDelayed = project.badgeType === 'DELAYED';
  const statusColor = isDelayed ? COLORS.error : COLORS.success;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.9}>
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
        </View>
      </View>
    </TouchableOpacity>
  );
};

export const ProjectsView = ({ data, actions }) => {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.container, { paddingTop: insets.top + 20 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.hTitle}>Projects</Text>
          <Text style={styles.hSub}>Track & Manage</Text>
        </View>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => actions.navigate('AddProject')}
          activeOpacity={0.8}
        >
          <FontAwesome5 name="plus" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchBox}>
        <FontAwesome5 name="search" size={16} color={COLORS.textLight} />
        <TextInput
          placeholder="Search..."
          style={styles.input}
          value={data.searchQuery}
          onChangeText={actions.setSearchQuery}
        />
      </View>

      <View style={styles.tabs}>
        <FilterPill label="Active" active={data.activeTab === 'Active'} onPress={() => actions.setActiveTab('Active')} />
        <FilterPill label="Pending" active={data.activeTab === 'Pending'} onPress={() => actions.setActiveTab('Pending')} />
        <FilterPill label="Issues" active={data.activeTab === 'Issues'} onPress={() => actions.setActiveTab('Issues')} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 120 }}>
        {data.projects.map((p) => (
          <ProjectItem
            key={p.id}
            project={p}
            onPress={() => actions.navigate('ProjectDetails', p.id)}
          />
        ))}
      </ScrollView>

      <BottomNav activeTab="Projects" onNavigate={actions.navigate} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 20 },
  hTitle: { fontSize: 28, fontWeight: '800', color: COLORS.textDark },
  hSub: { fontSize: 14, color: COLORS.textGrey },
  addBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', ...STYLES.shadow },
  searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.white, marginHorizontal: 24, padding: 14, borderRadius: 16, marginBottom: 20, borderWidth: 1, borderColor: COLORS.inputBorder },
  input: { flex: 1, marginLeft: 10, fontSize: 16, fontWeight: '500' },
  tabs: { flexDirection: 'row', paddingHorizontal: 24, marginBottom: 24, gap: 10 },
  pill: { paddingVertical: 8, paddingHorizontal: 20, borderRadius: 20, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.inputBorder },
  pillActive: { backgroundColor: COLORS.textDark, borderColor: COLORS.textDark },
  pillText: { fontSize: 14, fontWeight: '600', color: COLORS.textGrey },
  pillTextActive: { color: COLORS.white },
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