import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
// FIXED PATH: Uses ../ (one level up)
import { COLORS } from '../constants';
import { PrimaryButton } from './components/SharedComponents';

export const LandingView = ({ onGetStarted }) => {
  return (
    <LinearGradient colors={[COLORS.white, '#EFF6FF']} style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <LinearGradient colors={[COLORS.secondary, COLORS.primary]} style={styles.iconGradient}>
              <FontAwesome5 name="shield-alt" size={48} color={COLORS.white} />
            </LinearGradient>
          </View>
          <View style={styles.badge}><Text style={styles.badgeText}>LGU PROJECT MONITORING</Text></View>
          <Text style={styles.headline}>Transparency <Text style={{color: COLORS.primary}}>Reimagined.</Text></Text>
          <Text style={styles.subHeadline}>Real-time oversight for Barangay infrastructure projects. Secure, fast, and transparent.</Text>
          <View style={styles.bottomCard}><PrimaryButton title="Get Started" onPress={onGetStarted} style={{ width: '100%' }} /></View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 30 },
  iconCircle: { marginBottom: 40, shadowColor: COLORS.primary, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  iconGradient: { width: 100, height: 100, borderRadius: 35, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '-10deg' }] },
  badge: { backgroundColor: '#DBEAFE', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, marginBottom: 16 },
  badgeText: { color: COLORS.primary, fontWeight: '800', fontSize: 10, letterSpacing: 1 },
  headline: { fontSize: 34, fontWeight: '900', color: COLORS.textDark, textAlign: 'center', marginBottom: 16, lineHeight: 40 },
  subHeadline: { fontSize: 16, color: COLORS.textGrey, textAlign: 'center', lineHeight: 24, marginBottom: 50, paddingHorizontal: 10 },
  bottomCard: { width: '100%' }
});