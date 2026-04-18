import { arrayUnion, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { useEffect, useRef, useState } from "react";
import { Alert, PermissionsAndroid } from "react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import { storage } from "../firebaseConfig";
import { callFn } from "../services/CloudFunctionService";
import { ProjectModel } from "../models/ProjectModel";
import { requireAuth } from "../utils/authGuard";
import { sanitizeInput } from "../utils/security";
import { logger } from "../utils/logger";
import { useAuth } from "../context/AuthContext";
import type { Milestone, Project } from "../types";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

const requestLocationPermission = async (): Promise<boolean> => {
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
  const { userProfile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedMilestoneRef = useRef(selectedMilestone);
  selectedMilestoneRef.current = selectedMilestone;

  // The signed-in PROJ_ENG is always the engineer assigned to this project
  // (firestore rules enforce projectEngineer == request.auth.uid). So pull
  // the display name and photo straight from AuthContext — same source the
  // Dashboard and Settings use, so updates sync everywhere.
  const engineerName = userProfile?.firstName
    ? `Engr. ${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || null;
  const engineerPhotoURL = userProfile?.photoURL;

  // Real-time subscription to this project + its milestones
  useEffect(() => {
    if (!projectId) return;
    setIsLoading(true);

    const unsubscribe = ProjectModel.subscribeToProject(
      projectId,
      (data) => {
        if (data && data.milestones && selectedMilestoneRef.current) {
          const fresh = data.milestones.find(
            (m) => m.id === selectedMilestoneRef.current?.id,
          );
          if (fresh) setSelectedMilestone(fresh);
        }
        setProject(data);
        setIsLoading(false);
      },
      (err) => {
        logger.error("Project detail subscription error:", err);
        setIsLoading(false);
      },
    );

    return unsubscribe;
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
        const fileSize = (asset as any).fileSize || 0;
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

        const milestoneRef = ProjectModel.milestoneRef(project!.id, m.id);
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

        // Audit: PROOF_UPLOAD syncs to DEPW HEAD (core field activity)
        callFn("logMobileAuditTrail", {
          action: "Proof Uploaded",
          details: project?.projectName ?? project?.title ?? "Project",
          syncToHCSD: true,
        }).catch(() => {}); // Non-blocking

        // Real-time listener auto-refreshes — no manual reload needed
        Alert.alert("Success", "Evidence and GPS coordinates saved.");
      }
    } catch (error) {
      logger.error("Upload Error:", error);
      Alert.alert("Error", "Failed to save evidence log.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMilestones = async () => {
    try {
      requireAuth();
      setIsLoading(true);
      await callFn("generateMilestones", { projectId });
      // Real-time listener will auto-update with the new milestones
    } catch (error: any) {
      if (error?.message?.includes("already-exists")) {
        Alert.alert("Already Set", "Milestones already exist for this project.");
      } else {
        logger.error("Generate milestones error:", error);
        Alert.alert("Error", "Failed to generate milestones. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: { project, engineerName, engineerPhotoURL, selectedMilestone, isLoading },
    actions: {
      onRefresh: () => {}, // No-op — real-time listener handles updates automatically
      goBack: onBackCallback,
      onSelectMilestone: setSelectedMilestone,
      onAddProof: handleAddProof,
      onGenerateMilestones: handleGenerateMilestones,
    },
  };
};
