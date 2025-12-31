import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Image, ActivityIndicator } from 'react-native';
import { FontAwesome5 } from '@expo/vector-icons';
import { CameraView } from 'expo-camera';
import { COLORS, STYLES } from '../constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const ProjectDetailsView = ({ data, actions, onBack }) => {
  const insets = useSafeAreaInsets();
  const { project, isLoading, cameraVisible, capturedImage } = data;
  const {
    openCamera, closeCamera, takePicture, retakePicture,
    confirmProof, setCameraRef
  } = actions;

  if (isLoading || !project) return <View style={styles.loading}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <FontAwesome5 name="arrow-left" size={18} color={COLORS.textDark} />
        </TouchableOpacity>
        <Text style={styles.screenTitle}>Project Details</Text>
        <View style={{width: 30}} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
        {/* Project Info Card */}
        <View style={[styles.card, STYLES.shadow]}>
          <Text style={styles.pTitle}>{project.title}</Text>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View>
              <Text style={styles.label}>CATEGORY</Text>
              <Text style={styles.value}>{project.category}</Text>
            </View>
            <View>
              <Text style={styles.label}>BUDGET</Text>
              <Text style={styles.value}>{project.budget}</Text>
            </View>
          </View>
          <View style={{ marginTop: 16 }}>
             <Text style={styles.label}>CONTRACTOR</Text>
             <Text style={styles.value}>{project.contractor}</Text>
          </View>
        </View>

        <Text style={styles.sectionHead}>Milestones & Proofs</Text>

        {/* Milestones List */}
        {project.milestones && project.milestones.map((m, index) => {
          const isPending = m.status === 'Pending';
          const isDone = m.status === 'Completed';

          return (
            <View key={index} style={[styles.milestoneItem, STYLES.shadow]}>
              <View style={styles.mLeft}>
                <View style={[styles.dot, isDone ? {backgroundColor: COLORS.success} : {backgroundColor: COLORS.textLight}]} />
                <View style={styles.line} />
              </View>
              <View style={styles.mContent}>
                <Text style={styles.mTitle}>{m.title}</Text>
                <Text style={styles.mDate}>Target: {m.targetDate}</Text>

                {/* Status Badge */}
                <View style={[styles.statusBadge, isDone ? {backgroundColor: '#DCFCE7'} : {backgroundColor: '#EFF6FF'}]}>
                  <Text style={[styles.statusText, isDone ? {color: COLORS.success} : {color: COLORS.primary}]}>
                    {m.status ? m.status.toUpperCase() : 'PENDING'}
                  </Text>
                </View>

                {/* --- CAMERA BUTTON (Only shows if Pending) --- */}
                {isPending && (
                  <TouchableOpacity onPress={() => openCamera(index)} style={styles.cameraBtn}>
                    <FontAwesome5 name="camera" size={12} color={COLORS.white} />
                    <Text style={styles.cameraBtnText}>Capture Proof</Text>
                  </TouchableOpacity>
                )}

                {/* --- DISPLAY SUBMITTED PROOF --- */}
                {m.proofImage && (
                  <View style={styles.proofBox}>
                    <View style={{flexDirection:'row', alignItems:'center'}}>
                      <FontAwesome5 name="check-circle" size={12} color={COLORS.success} />
                      <Text style={styles.proofTime}> Proof Submitted</Text>
                    </View>
                    <Image source={{ uri: m.proofImage }} style={styles.miniThumb} />
                    <Text style={styles.proofLoc}>
                      📍 {m.location?.latitude?.toFixed(5)}, {m.location?.longitude?.toFixed(5)}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* --- STRICT CAMERA MODAL (No Gallery) --- */}
      <Modal visible={cameraVisible} animationType="slide" onRequestClose={closeCamera}>
        <View style={styles.cameraContainer}>
          {capturedImage ? (
            // Preview
            <View style={{flex: 1}}>
              <Image source={{ uri: capturedImage }} style={{ flex: 1 }} />
              <View style={styles.previewControls}>
                <TouchableOpacity onPress={retakePicture} style={styles.retakeBtn}>
                  <Text style={{color: COLORS.white, fontWeight:'700'}}>Retake</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmProof} style={styles.confirmBtn}>
                  <Text style={{color: COLORS.white, fontWeight:'700'}}>Submit Proof</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            // Live Viewfinder
            <CameraView style={{ flex: 1 }} facing="back" ref={setCameraRef}>
              <View style={styles.cameraControls}>
                <TouchableOpacity onPress={closeCamera} style={styles.closeCam}>
                  <FontAwesome5 name="times" size={24} color={COLORS.white} />
                </TouchableOpacity>
                <View style={styles.captureRow}>
                  <TouchableOpacity onPress={takePicture} style={styles.shutterBtn}>
                    <View style={styles.shutterInner} />
                  </TouchableOpacity>
                </View>
              </View>
            </CameraView>
          )}
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 24, backgroundColor: COLORS.white, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#F3F4F6' },
  screenTitle: { fontSize: 18, fontWeight: '800', color: COLORS.textDark },
  card: { backgroundColor: COLORS.white, padding: 20, borderRadius: 20, marginHorizontal: 24, marginTop: 20 },
  pTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textDark, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { fontSize: 10, color: COLORS.textLight, fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  value: { fontSize: 14, color: COLORS.textDark, fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#F3F4F6', marginVertical: 16 },
  sectionHead: { marginHorizontal: 24, marginTop: 30, marginBottom: 16, fontSize: 14, fontWeight: '700', color: COLORS.textGrey, textTransform: 'uppercase' },
  milestoneItem: { flexDirection: 'row', backgroundColor: COLORS.white, marginHorizontal: 24, marginBottom: 16, padding: 16, borderRadius: 16 },
  mLeft: { alignItems: 'center', marginRight: 16, width: 20 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  line: { width: 2, flex: 1, backgroundColor: '#F3F4F6', marginTop: 4 },
  mContent: { flex: 1 },
  mTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textDark },
  mDate: { fontSize: 12, color: COLORS.textGrey, marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 10 },
  statusText: { fontSize: 10, fontWeight: '800' },
  cameraBtn: { flexDirection: 'row', backgroundColor: COLORS.primary, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, alignItems: 'center', alignSelf: 'flex-start' },
  cameraBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12, marginLeft: 8 },
  proofBox: { marginTop: 10, backgroundColor: '#F9FAFB', padding: 10, borderRadius: 8, borderLeftWidth: 3, borderColor: COLORS.success },
  proofTime: { fontSize: 10, fontWeight: '700', color: COLORS.success, marginLeft: 4 },
  proofLoc: { fontSize: 10, color: COLORS.textGrey, marginTop: 4 },
  miniThumb: { width: 60, height: 60, borderRadius: 8, marginTop: 8 },
  cameraContainer: { flex: 1, backgroundColor: 'black' },
  cameraControls: { flex: 1, justifyContent: 'space-between', padding: 30 },
  closeCam: { alignSelf: 'flex-start', marginTop: 20 },
  captureRow: { alignItems: 'center', marginBottom: 20 },
  shutterBtn: { width: 80, height: 80, borderRadius: 40, borderWidth: 4, borderColor: COLORS.white, alignItems: 'center', justifyContent: 'center' },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.white },
  previewControls: { height: 100, backgroundColor: 'black', flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  retakeBtn: { padding: 20 },
  confirmBtn: { backgroundColor: COLORS.primary, paddingVertical: 12, paddingHorizontal: 30, borderRadius: 20 }
});