import { useState, useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebaseConfig';
import { ref, onValue, update } from 'firebase/database';
import { useCameraPermissions } from 'expo-camera';
import * as Location from 'expo-location';

export const useProjectDetailsPresenter = (projectId, onBack) => {
  const [project, setProject] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Camera & Location
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraVisible, setCameraVisible] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [capturedLocation, setCapturedLocation] = useState(null);
  const [activeMilestoneIndex, setActiveMilestoneIndex] = useState(null);

  const cameraRef = useRef(null);

  // 1. Listen for Database Changes
  useEffect(() => {
    if (!projectId) return;
    const projectRef = ref(db, `Projects/${projectId}`);
    const unsubscribe = onValue(projectRef, (snapshot) => {
      if (snapshot.exists()) {
        setProject(snapshot.val());
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, [projectId]);

  // 2. Open Camera (Strict Checks)
  const openCamera = async (index) => {
    // Check Camera
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert("Permission Denied", "Camera access is strictly required for proof.");
        return;
      }
    }
    // Check Location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Denied", "Location access is strictly required for geo-tagging.");
      return;
    }

    setActiveMilestoneIndex(index);
    setCameraVisible(true);
  };

  // 3. Capture & Tag
  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5 });
        setCapturedImage(photo.uri);

        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
        setCapturedLocation({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
          timestamp: loc.timestamp
        });

      } catch (error) {
        Alert.alert("Error", "Failed to capture proof.");
      }
    }
  };

  // 4. Save Proof to Database
  const confirmProof = async () => {
    if (!project || activeMilestoneIndex === null) return;

    try {
      const updatedMilestones = [...(project.milestones || [])];

      updatedMilestones[activeMilestoneIndex] = {
        ...updatedMilestones[activeMilestoneIndex],
        status: 'Completed',
        proofImage: capturedImage,
        location: capturedLocation,
        completedAt: new Date().toISOString()
      };

      await update(ref(db, `Projects/${projectId}`), {
        milestones: updatedMilestones
      });

      setCameraVisible(false);
      setCapturedImage(null);
      Alert.alert("Success", "Proof submitted successfully!");

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const closeCamera = () => {
    setCameraVisible(false);
    setCapturedImage(null);
  };

  const retakePicture = () => setCapturedImage(null);

  return {
    data: { project, isLoading, cameraVisible, capturedImage, isCameraReady: true },
    actions: { openCamera, closeCamera, takePicture, retakePicture, confirmProof, setCameraRef: (ref) => cameraRef.current = ref }
  };
};