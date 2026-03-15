import { arrayUnion, doc, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useCallback, useEffect, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import { db, storage } from "../firebaseConfig";
import { ProjectModel } from "../models/ProjectModel";
import { requireAuth } from "../utils/authGuard";
import { invalidateCache } from "../utils/cache";
import { sanitizeInput } from "../utils/security";
import type { Milestone, Project } from "../types";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const requestLocationPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
    {
      title: "Location Permission",
      message: "TranspiraFund needs location access to geo-tag project proofs.",
      buttonPositive: "Allow",
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

export const useProjectDetailsPresenter = (
  projectId: string,
  onBackCallback: () => void,
) => {
  const [project, setProject] = useState<Project | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadProject = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const data = await ProjectModel.getById(projectId);

      if (data && data.milestones && data.milestones.length > 0) {
        const total = data.milestones.length;
        const completedCount = data.milestones.filter(
          (m) => m.status?.toString().toLowerCase() === "completed",
        ).length;

        data.progress = Math.round((completedCount / total) * 100);

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

  const handleAddProof = async (m: Milestone) => {
    try {
      // Auth guard
      requireAuth();

      const locationGranted = await requestLocationPermission();
      if (!locationGranted) {
        Alert.alert(
          "Permission Required",
          "Camera and location access are needed for official documentation.",
        );
        return;
      }

      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.7,
        saveToPhotos: false,
      });

      if (!result.didCancel && result.assets && result.assets[0]) {
        const asset = result.assets[0];

        // Validate file type
        const fileType = asset.type || "";
        if (!ALLOWED_IMAGE_TYPES.includes(fileType.toLowerCase())) {
          Alert.alert("Invalid File", "Only JPEG and PNG images are allowed.");
          return;
        }

        // Validate file size
        const fileSize = asset.fileSize || 0;
        if (fileSize > MAX_IMAGE_SIZE_BYTES) {
          Alert.alert("File Too Large", "Image must be under 10MB.");
          return;
        }

        setIsLoading(true);

        const photoUri = asset.uri!;

        const userLocation = await new Promise<{ latitude: number; longitude: number }>(
          (resolve, reject) => {
            Geolocation.getCurrentPosition(
              (pos: { coords: { latitude: number; longitude: number } }) =>
                resolve(pos.coords),
              (err: { code: number; message: string }) => reject(err),
              { enableHighAccuracy: true, timeout: 15000 },
            );
          },
        );

        const { latitude, longitude } = userLocation;
        // Sanitize milestone ID for filename
        const safeId = sanitizeInput(m.id, 64).replace(/[^a-zA-Z0-9_-]/g, "_");
        const filename = `proofs/${safeId}_${Date.now()}.jpg`;
        const storageRef = ref(storage, filename);

        const response = await fetch(photoUri);
        const blob = await response.blob();
        await uploadBytes(storageRef, blob);
        const downloadURL = await getDownloadURL(storageRef);

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

        invalidateCache("projects_all");
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
