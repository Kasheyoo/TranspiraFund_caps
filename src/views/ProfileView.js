import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants';

const DetailRow = ({ icon, label, value }) => (
  <View style={styles.row}>
    <View style={styles.iconBox}>
      <FontAwesome5 name={icon} size={16} color={COLORS.primary} />
    </View>
    <View style={{flex: 1}}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
    <FontAwesome5 name="chevron-right" size={12} color={COLORS.inputBorder} />
  </View>
);

export const ProfileView = ({ onBack, onLogout }) => {
  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>My Profile</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <View style={styles.profileHeader}>
          <View style={[styles.avatarBig, STYLES.shadow]}>
            <Text style={styles.avatarText}>C</Text>
            <View style={styles.cameraBtn}>
              <FontAwesome5 name="camera" size={12} color={COLORS.white} />
            </View>
          </View>
          <Text style={styles.name}>Captain John Doe</Text>
          <Text style={styles.role}>Barangay Administrator</Text>
        </View>

        <View style={[styles.section, STYLES.shadow]}>
          <Text style={styles.sectionHead}>Contact Information</Text>
          <DetailRow icon="envelope" label="Email" value="admin@dolores.gov.ph" />
          <View style={styles.divider} />
          <DetailRow icon="phone" label="Phone" value="+63 917 123 4567" />
          <View style={styles.divider} />
          <DetailRow icon="id-card" label="Employee ID" value="LGU-2025-008" />
        </View>

        <View style={{ marginTop: 40 }}>
          {/* Fixed Button Styling */}
          <TouchableOpacity onPress={onLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: { paddingTop: 60, paddingHorizontal: 24, paddingBottom: 20, backgroundColor: COLORS.surface, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  profileHeader: { alignItems: 'center', marginBottom: 30 },
  avatarBig: { width: 100, height: 100, borderRadius: 50, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText: { fontSize: 40, fontWeight: '800', color: COLORS.white },
  cameraBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: COLORS.textDark, padding: 8, borderRadius: 20, borderWidth: 3, borderColor: COLORS.background },
  name: { fontSize: 22, fontWeight: '800', color: COLORS.textDark, marginBottom: 4 },
  role: { fontSize: 14, color: COLORS.textGrey, fontWeight: '500' },

  section: { backgroundColor: COLORS.surface, borderRadius: 24, padding: 24 },
  sectionHead: { fontSize: 14, fontWeight: '700', color: COLORS.textGrey, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  label: { fontSize: 12, color: COLORS.textGrey, marginBottom: 2 },
  value: { fontSize: 16, fontWeight: '600', color: COLORS.textDark },
  divider: { height: 1, backgroundColor: COLORS.background, marginVertical: 16 },

  // Fixed Logout Button
  logoutButton: { backgroundColor: COLORS.white, borderWidth: 1.5, borderColor: COLORS.error, paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  logoutText: { color: COLORS.error, fontSize: 16, fontWeight: '700' }
});