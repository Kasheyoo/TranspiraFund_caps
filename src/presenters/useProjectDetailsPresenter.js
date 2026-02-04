import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import { db, storage } from "../firebaseConfig";
import { ProjectModel } from "../models/ProjectModel";

export const useProjectDetailsPresenter = (projectId, onBackCallback) => {
  const [project, setProject] = useState(null);
  const [selectedMilestone, setSelectedMilestone] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await ProjectModel.getById(projectId);

      if (data && data.milestones?.length > 0) {
        // ✅ FIX: Dynamic Progress Calculation
        const total = data.milestones.length;
        const completedCount = data.milestones.filter(
          (m) => m.status?.toString().toLowerCase() === "completed",
        ).length;

        // Attach calculated progress to the project data
        data.progress = Math.round((completedCount / total) * 100);

        // Sync the selected milestone with fresh data from the database
        if (selectedMilestone) {
          const freshMilestone = data.milestones.find(
            (m) => m.id === selectedMilestone.id,
          );
          if (freshMilestone) setSelectedMilestone(freshMilestone);
        }
      }
      setProject(data);
    } catch (e) {
      console.error("Load Project Error:", e);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, selectedMilestone]);

  useEffect(() => {
    loadProject();
  }, [projectId]);

  const handleAddProof = async (m) => {
    try {
      const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
      const locationStatus = await Location.requestForegroundPermissionsAsync();

      if (
        cameraStatus.status !== "granted" ||
        locationStatus.status !== "granted"
      ) {
        Alert.alert(
          "Permission Required",
          "Camera and location access are needed for official documentation.",
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
      });

      if (!result.canceled) {
        setIsLoading(true);

        // 1. Get precise GPS coordinates
        const userLocation = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });

        const photoUri = result.assets[0].uri;
        const { latitude, longitude } = userLocation.coords;

        // 2. Upload to Firebase Storage
        const filename = `proofs/${m.id}_${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);

        const response = await fetch(photoUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

        // 3. Update Firestore Document with proofs array
        const milestoneRef = doc(db, "milestones", m.id);
        const newProof = {
          url: downloadURL,
          location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
          timestamp: Date.now(),
          latitude,
          longitude,
        };

        await updateDoc(milestoneRef, {
          proofs: arrayUnion(newProof),
          status: "Pending",
        });

        // ✅ REFRESH: This triggers the recalculation of progress
        await loadProject();
        Alert.alert("Success", "Evidence and GPS coordinates saved.");
      }
    } catch (error) {
      console.error("Upload Error:", error);
      Alert.alert("Error", "Failed to save evidence log.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: { project, selectedMilestone, isLoading },
    actions: {
      onRefresh: loadProject,
      goBack: onBackCallback,
      onSelectMilestone: setSelectedMilestone,
      onAddProof: handleAddProof,
    },
  };
};
