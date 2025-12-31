import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, StatusBar, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, STYLES } from '../constants';
import { BlockInput, PrimaryButton } from './components/SharedComponents';

// --- NEW: First Time Login Modal ---
const FirstTimeModal = ({ visible, onUpdate, onClose }) => {
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalBackdrop}>
        <View style={[styles.modalContainer, STYLES.shadow]}>
          <View style={styles.iconCircle}>
            <FontAwesome5 name="lock" size={24} color={COLORS.primary} />
          </View>
          <Text style={styles.mTitle}>Security Update</Text>
          <Text style={styles.mSub}>Since this is your first login, please create a new secure password.</Text>

          <BlockInput
            icon="lock"
            placeholder="New Password"
            isPassword
            value={newPass}
            onChangeText={setNewPass}
          />
          <BlockInput
            icon="check-circle"
            placeholder="Confirm Password"
            isPassword
            value={confirmPass}
            onChangeText={setConfirmPass}
          />

          <PrimaryButton
            title="Update & Login"
            onPress={() => onUpdate(newPass, confirmPass)}
            style={{ marginTop: 10, width: '100%' }}
          />

          <TouchableOpacity onPress={onClose} style={{ marginTop: 16 }}>
            <Text style={{ color: COLORS.textGrey, fontSize: 12 }}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const LoginView = ({ data, actions, onBack }) => {
  const { user, isRemembered, isLoading, isChangePassVisible } = data;
  const { handleEmailChange, handlePasswordChange, toggleRemember, onLogin, onUpdatePassword, closeModal } = actions;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <TouchableOpacity onPress={onBack} style={styles.backLink}>
        <FontAwesome5 name="arrow-left" size={16} color={COLORS.textGrey} />
        <Text style={{ color: COLORS.textGrey, marginLeft: 8, fontWeight: '600' }}>Back</Text>
      </TouchableOpacity>

      <View style={styles.content}>
        <View style={styles.logoBox}>
          <FontAwesome5 name="shield-alt" size={32} color={COLORS.primary} />
        </View>
        <Text style={styles.headerTitle}>LGU Portal</Text>
        <Text style={styles.headerSub}>Sign in with your Employee ID.</Text>

        <View style={styles.form}>
          <BlockInput
            icon="id-card"
            placeholder="Employee ID (e.g. Eng_123)"
            value={user.email}
            onChangeText={handleEmailChange}
          />
          <BlockInput
            icon="lock"
            placeholder="Password"
            isPassword
            value={user.password}
            onChangeText={handlePasswordChange}
          />

          <View style={styles.row}>
            <TouchableOpacity onPress={toggleRemember} style={styles.checkRow}>
              <View style={[styles.checkbox, isRemembered && styles.checked]}>
                {isRemembered && <FontAwesome5 name="check" size={10} color={COLORS.white} />}
              </View>
              <Text style={styles.checkLabel}>Remember me</Text>
            </TouchableOpacity>
            <TouchableOpacity>
              <Text style={styles.forgotLink}>Help?</Text>
            </TouchableOpacity>
          </View>

          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <PrimaryButton title="Sign In" onPress={onLogin} style={{ marginTop: 20 }} />
          )}
        </View>
      </View>

      {/* --- The Pop Up Layout --- */}
      <FirstTimeModal
        visible={isChangePassVisible}
        onUpdate={onUpdatePassword}
        onClose={closeModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 24 },
  backLink: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  content: { flex: 1, justifyContent: 'center' },
  logoBox: { width: 64, height: 64, backgroundColor: '#EFF6FF', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  headerTitle: { fontSize: 32, fontWeight: '800', color: COLORS.textDark, marginBottom: 8, letterSpacing: -0.5 },
  headerSub: { fontSize: 16, color: COLORS.textGrey, marginBottom: 40 },
  form: { width: '100%' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  checkRow: { flexDirection: 'row', alignItems: 'center' },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.inputBorder, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  checked: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkLabel: { color: COLORS.textGrey, fontWeight: '500' },
  forgotLink: { color: COLORS.primary, fontWeight: '700' },

  // Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalContainer: { backgroundColor: COLORS.white, borderRadius: 24, padding: 32, alignItems: 'center' },
  iconCircle: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  mTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textDark, marginBottom: 8 },
  mSub: { fontSize: 14, color: COLORS.textGrey, marginBottom: 24, textAlign: 'center' }
});