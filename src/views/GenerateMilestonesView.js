import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { COLORS, STYLES } from '../constants';
import { BlockInput, PrimaryButton } from './components/SharedComponents';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export const GenerateMilestonesView = ({ data, actions }) => {
  const insets = useSafeAreaInsets();
  const { milestones, isLoading } = data;
  const { addMilestone, removeMilestone, updateMilestone, onSaveAndFinish, generateWithAI } = actions;

  // Render the "Empty State" with the big Generate Button
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.iconBig}>
        <FontAwesome5 name="robot" size={50} color={COLORS.primary} />
      </View>
      <Text style={styles.emptyTitle}>AI Milestone Generator</Text>
      <Text style={styles.emptySub}>
        Based on your project title and target date, we will calculate the best schedule for you.
      </Text>

      <TouchableOpacity onPress={generateWithAI} activeOpacity={0.8} style={{ width: '100%', marginTop: 30 }}>
        <LinearGradient
          colors={[COLORS.secondary, COLORS.primary]}
          start={{x:0, y:0}} end={{x:1, y:0}}
          style={styles.genButton}
        >
          {isLoading ? (
            <ActivityIndicator color={COLORS.white} />
          ) : (
            <>
              <FontAwesome5 name="magic" size={18} color={COLORS.white} />
              <Text style={styles.genButtonText}>Generate Milestones</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Phase 2: Milestones</Text>
        <Text style={styles.subTitle}>Review and finalize your schedule.</Text>
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100, flexGrow: 1 }}>

          {/* If empty, show the Big Generator. If has data, show the list */}
          {milestones.length === 0 ? renderEmptyState() : (
            <>
               <View style={styles.generatedHeader}>
                 <Text style={{color: COLORS.success, fontWeight:'700'}}>✨ Generated based on Target Date</Text>
                 <TouchableOpacity onPress={generateWithAI}>
                   <Text style={{color: COLORS.primary, fontWeight:'600', fontSize: 12}}>Regenerate</Text>
                 </TouchableOpacity>
               </View>

               {milestones.map((item, index) => (
                <View key={index} style={[styles.milestoneRow, STYLES.shadow]}>
                  <View style={styles.indexCircle}>
                    <Text style={styles.indexText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <BlockInput
                      icon="flag"
                      placeholder="Milestone Name"
                      value={item.title}
                      onChangeText={(text) => updateMilestone(index, 'title', text)}
                    />
                    <BlockInput
                      icon="calendar"
                      placeholder="Target Date"
                      value={item.targetDate}
                      onChangeText={(text) => updateMilestone(index, 'targetDate', text)}
                    />
                  </View>
                  <TouchableOpacity onPress={() => removeMilestone(index)} style={styles.removeBtn}>
                    <FontAwesome5 name="trash" size={14} color={COLORS.error} />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity onPress={addMilestone} style={styles.addMoreBtn}>
                <FontAwesome5 name="plus-circle" size={16} color={COLORS.primary} />
                <Text style={styles.addMoreText}>Add Manual Item</Text>
              </TouchableOpacity>
            </>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* Only show Save button if we have milestones */}
      {milestones.length > 0 && (
        <View style={styles.footer}>
          {isLoading ? (
            <ActivityIndicator size="large" color={COLORS.primary} />
          ) : (
            <PrimaryButton title="Save & Finish" onPress={onSaveAndFinish} />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 24, backgroundColor: COLORS.white, borderBottomWidth: 1, borderColor: COLORS.inputBorder },
  screenTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark },
  subTitle: { fontSize: 14, color: COLORS.textGrey, marginTop: 4 },

  // Empty State Styles
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', marginTop: 50 },
  iconBig: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: COLORS.textDark, marginBottom: 10 },
  emptySub: { fontSize: 14, color: COLORS.textGrey, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  genButton: { flexDirection: 'row', padding: 20, borderRadius: 20, alignItems: 'center', justifyContent: 'center', width: '100%' },
  genButtonText: { color: COLORS.white, fontWeight: '800', fontSize: 18, marginLeft: 10 },

  // List Styles
  generatedHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, paddingHorizontal: 4 },
  milestoneRow: { flexDirection: 'row', backgroundColor: COLORS.white, padding: 16, borderRadius: 16, marginBottom: 16, alignItems: 'flex-start' },
  indexCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginRight: 12, marginTop: 18 },
  indexText: { color: COLORS.white, fontWeight: '700', fontSize: 12 },
  removeBtn: { padding: 10, marginLeft: 4, marginTop: 10 },
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 16, backgroundColor: '#EFF6FF' },
  addMoreText: { marginLeft: 8, color: COLORS.primary, fontWeight: '700' },
  footer: { padding: 24, backgroundColor: COLORS.white, borderTopWidth: 1, borderColor: COLORS.inputBorder }
});