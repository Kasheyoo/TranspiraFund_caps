import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS } from '../constants';
import { BlockInput, PrimaryButton } from './components/SharedComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const AddProjectView = ({ data, actions, onBack }) => {
  const insets = useSafeAreaInsets();
  const {
    title, category, contractor, targetDate, budget, isLoading
  } = data;
  const {
    setTitle, setCategory, setContractor, setTargetDate, setBudget, onRegister
  } = actions;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Register New Project</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.formContainer} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionHead}>Project Details</Text>

          <BlockInput
            icon="hard-hat"
            placeholder="Project Title (e.g., Road Widening)"
            value={title}
            onChangeText={setTitle}
          />

          <BlockInput
            icon="tags"
            placeholder="Category (e.g., INFRASTRUCTURE)"
            value={category}
            onChangeText={setCategory}
          />

          <BlockInput
            icon="file-contract"
            placeholder="Contractor Name"
            value={contractor}
            onChangeText={setContractor}
          />

          <View style={styles.row}>
            <View style={{ flex: 1, marginRight: 8 }}>
              <BlockInput
                icon="calendar-alt"
                placeholder="Target Date (e.g., Dec 30)"
                value={targetDate}
                onChangeText={setTargetDate}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 8 }}>
              <BlockInput
                icon="coins"
                placeholder="Budget (e.g., 500k)"
                value={budget}
                onChangeText={setBudget}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.infoBox}>
            <FontAwesome5 name="info-circle" size={14} color={COLORS.primary} />
            <Text style={styles.infoText}>New projects are created with a status of "Active" and 0% progress by default.</Text>
          </View>

          <View style={{ marginTop: 30 }}>
            {isLoading ? (
              <ActivityIndicator size="large" color={COLORS.primary} />
            ) : (
              <PrimaryButton
                title="Confirm & Register Project"
                onPress={onRegister}
              />
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { paddingHorizontal: 24, paddingBottom: 20, paddingTop: 20, backgroundColor: COLORS.background, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  screenTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textDark },
  backBtn: { padding: 8 },
  formContainer: { padding: 24, paddingBottom: 50 },
  sectionHead: { fontSize: 14, fontWeight: '700', color: COLORS.textGrey, marginBottom: 20, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  infoBox: { flexDirection: 'row', backgroundColor: '#EFF6FF', padding: 16, borderRadius: 16, alignItems: 'center', marginTop: 10 },
  infoText: { marginLeft: 12, color: COLORS.primaryDark, fontSize: 13, fontWeight: '500', flex: 1 }
});