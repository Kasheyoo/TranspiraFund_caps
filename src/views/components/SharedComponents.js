import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
// Path is correct for deep folder
import { COLORS, STYLES } from '../../constants';

// Modern Input with Icon
export const BlockInput = ({ icon, placeholder, isPassword, value, onChangeText }) => {
  const [showPass, setShowPass] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.inputContainer, isFocused && styles.inputFocused]}>
      <View style={styles.inputIcon}>
        <FontAwesome5 name={icon} size={18} color={isFocused ? COLORS.primary : COLORS.textLight} />
      </View>
      <TextInput
        style={styles.inputField}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textLight}
        secureTextEntry={isPassword && !showPass}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      {isPassword && (
        <TouchableOpacity onPress={() => setShowPass(!showPass)} style={{ padding: 10 }}>
          <FontAwesome5 name={showPass ? "eye-slash" : "eye"} size={16} color={COLORS.textLight} />
        </TouchableOpacity>
      )}
    </View>
  );
};

// Gradient Primary Button
export const PrimaryButton = ({ title, onPress, style }) => (
  <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={[styles.buttonShadow, style]}>
    <LinearGradient
      colors={[COLORS.primary, COLORS.primaryDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientButton}
    >
      <Text style={styles.buttonText}>{title}</Text>
    </LinearGradient>
  </TouchableOpacity>
);

// Floating Bottom Navigation
export const BottomNav = ({ activeTab, onNavigate }) => {
  const NavItem = ({ name, icon, label }) => {
    const isActive = activeTab === name;
    return (
      <TouchableOpacity onPress={() => onNavigate(name)} style={{ alignItems: 'center', minWidth: 60 }}>
        <FontAwesome5
          name={icon}
          size={20}
          color={isActive ? COLORS.primary : COLORS.textLight}
        />
        {isActive && (
          <Text style={{ fontSize: 10, color: COLORS.primary, fontWeight: '700', marginTop: 4 }}>
            {label}
          </Text>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.navWrapper}>
      <View style={[styles.navContainer, STYLES.shadow]}>
        <NavItem name="Dashboard" icon="th-large" label="Dashboard" />
        <NavItem name="Projects" icon="folder" label="Projects" />
        <NavItem name="Alerts" icon="bell" label="Alerts" />
        <NavItem name="Profile" icon="user" label="Profile" />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  // Input
  inputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBg, borderRadius: 16, marginBottom: 16, paddingHorizontal: 16, height: 56 },
  inputFocused: { borderColor: COLORS.primary, backgroundColor: COLORS.surface, borderWidth: 1.5 },
  inputIcon: { marginRight: 16, width: 20, alignItems: 'center' },
  inputField: { flex: 1, fontSize: 16, fontWeight: '500', color: COLORS.textDark },

  // Button
  buttonShadow: { ...STYLES.shadow, shadowColor: COLORS.primary, shadowOpacity: 0.25 },
  gradientButton: { paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: COLORS.white, fontSize: 16, fontWeight: '700', letterSpacing: 0.5 },

  // Nav
  navWrapper: { position: 'absolute', bottom: 30, left: 24, right: 24, zIndex: 100, elevation: 100 },
  navContainer: { backgroundColor: COLORS.surface, borderRadius: 24, height: 70, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 10 }
});