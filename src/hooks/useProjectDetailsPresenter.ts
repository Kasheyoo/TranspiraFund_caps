import { updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Linking, PermissionsAndroid, Platform } from "react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import { callFn } from "../services/CloudFunctionService";
import {
  uploadProofPhotoWithProgress,
  type ProofUploadArgs,
  type ProofUploadHandle,
  type ProofUploadStage,
} from "../services/ProofUploadService";
import { ProjectModel } from "../models/ProjectModel";
import { requireAuth } from "../utils/authGuard";
import { logger } from "../utils/logger";
import { projectTypeLabel } from "../utils/projectType";
import { requireTenantId } from "../utils/tenant";
import { useAuth } from "../context/AuthContext";
import type { Milestone, Project } from "../types";
import type { DraftPhase } from "../utils/milestonePlan";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/jpg",
  "image/heic",
  "image/heif",
  "image/webp",
];

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

const requestCameraPermission = async (): Promise<boolean> => {
  if (Platform.OS !== "android") return true;
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.CAMERA,
    {
      title: "Camera Permission",
      message: "TranspiraFund needs camera access to capture geotagged proof of work.",
      buttonPositive: "Allow",
    },
  );
  return granted === PermissionsAndroid.RESULTS.GRANTED;
};

type GeoCoords = { latitude: number; longitude: number; accuracy: number };

const fetchProofLocation = (): Promise<GeoCoords> =>
  new Promise((resolve, reject) => {
    Geolocation.getCurrentPosition(
      (pos: { coords: GeoCoords }) => resolve(pos.coords),
      (err: { code: number; message: string }) => {
        if (err.code === 1) {
          reject(err);
          return;
        }
        Geolocation.getCurrentPosition(
          (pos: { coords: GeoCoords }) => resolve(pos.coords),
          (err2: { code: number; message: string }) => reject(err2),
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
        );
      },
      { enableHighAccuracy: true, timeout: 25000, maximumAge: 30000 },
    );
  });

export const useProjectDetailsPresenter = (
  projectId: string,
  onBackCallback: () => void,
) => {
  const { userProfile } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);
  const [lastViewedMilestoneId, setLastViewedMilestoneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const selectedMilestoneRef = useRef(selectedMilestone);
  selectedMilestoneRef.current = selectedMilestone;

  const onSelectMilestone = (m: Milestone | null) => {
    if (m?.id) setLastViewedMilestoneId(m.id);
    setSelectedMilestone(m);
  };

  type ToastType = "success" | "error" | "info";
  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false, type: "success", message: "",
  });
  const showToast = (type: ToastType, message: string) =>
    setToast({ visible: true, type, message });
  const dismissToast = () => setToast((t) => ({ ...t, visible: false }));

  type ConfirmTone = "primary" | "success" | "danger" | "warning";
  type ConfirmModalState = {
    tone: ConfirmTone;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    onConfirm: () => void;
  } | null;
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState>(null);
  const dismissConfirmModal = () => setConfirmModal(null);

  const askOpenSettings = (title: string, message: string) => {
    setConfirmModal({
      tone: "warning",
      title,
      message,
      confirmLabel: "Open Settings",
      cancelLabel: "Cancel",
      onConfirm: () => {
        setConfirmModal(null);
        Linking.openSettings().catch(() => {});
      },
    });
  };

  const askRetry = (title: string, message: string, onRetry: () => void) => {
    setConfirmModal({
      tone: "warning",
      title,
      message,
      confirmLabel: "Try Again",
      cancelLabel: "Cancel",
      onConfirm: () => {
        setConfirmModal(null);
        onRetry();
      },
    });
  };

  type ProofUploadState = {
    stage: ProofUploadStage;
    percent: number;
    error?: string;
  };
  const [proofUpload, setProofUpload] = useState<ProofUploadState | null>(null);
  const lastUploadArgsRef = useRef<ProofUploadArgs | null>(null);
  const uploadHandleRef = useRef<ProofUploadHandle | null>(null);

  const mapUploadError = (error: any): string => {
    const code = String(error?.code || "").toLowerCase();
    const raw = String(error?.message || "").toLowerCase();
    if (code.includes("unauthenticated") || raw.includes("unauthenticated")) {
      return "Session expired. Please sign in again.";
    }
    if (code.includes("permission-denied") || raw.includes("permission")) {
      return "You're not the assigned engineer for this project.";
    }
    if (code.includes("failed-precondition") || raw.includes("failed-precondition")) {
      return "Confirm this phase before uploading proof.";
    }
    if (code.includes("invalid-argument") || raw.includes("invalid")) {
      return "Photo or location data is invalid. Please try again.";
    }
    if (code.includes("not-found") || raw.includes("not found")) {
      return "Project or milestone could not be found.";
    }
    return error?.message || "Could not save the proof. Please try again.";
  };

  const startProofUpload = (args: ProofUploadArgs) => {
    lastUploadArgsRef.current = args;
    setProofUpload({ stage: "preparing", percent: 0 });

    const handle = uploadProofPhotoWithProgress(args, (p) => {
      setProofUpload((cur) =>
        cur ? { ...cur, stage: p.stage, percent: p.percent } : cur,
      );
    });
    uploadHandleRef.current = handle;

    handle.promise
      .then(() => {
        // Dismiss the progress modal immediately on success and let the
        // toast carry the success signal. Avoids the double confirmation
        // (modal "done" + toast) that used to read as a blink.
        setProofUpload(null);
        showToast("success", "Geotagged proof saved successfully.");
      })
      .catch((error: any) => {
        logger.error("[AddProof] upload error:", error);
        setProofUpload({
          stage: "error",
          percent: 0,
          error: mapUploadError(error),
        });
      });
  };

  const onRetryProofUpload = () => {
    const args = lastUploadArgsRef.current;
    if (!args) return;
    startProofUpload(args);
  };

  const onDismissProofUpload = () => {
    uploadHandleRef.current?.abort();
    setProofUpload(null);
  };

  const engineerName = userProfile?.firstName
    ? `Engr. ${userProfile.firstName} ${userProfile.lastName || ""}`.trim()
    : userProfile?.name || null;
  const engineerPhotoURL = userProfile?.photoURL;

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
      requireAuth();
      logger.log("[AddProof] start", { milestoneId: m.id });

      const currentProofCount = Array.isArray(m.proofs) ? m.proofs.length : 0;
      if (currentProofCount >= 5) {
        showToast("info", "Maximum of 5 proofs reached for this phase.");
        return;
      }

      const cameraGranted = await requestCameraPermission();
      logger.log("[AddProof] camera permission:", cameraGranted);
      if (!cameraGranted) {
        askOpenSettings(
          "Camera Permission Required",
          "TranspiraFund needs camera access to capture proof of work. Enable Camera permission for this app in Settings, then try again.",
        );
        return;
      }

      const locationGranted = await requestLocationPermission();
      logger.log("[AddProof] location permission:", locationGranted);
      if (!locationGranted) {
        askOpenSettings(
          "Location Permission Required",
          "TranspiraFund needs location access to geo-tag every proof. Enable Location permission for this app in Settings, then try again.",
        );
        return;
      }

      logger.log("[AddProof] launching camera...");
      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.8,
        maxWidth: 2048,
        maxHeight: 2048,
        saveToPhotos: false,
        includeBase64: true,
      });
      logger.log("[AddProof] camera result:", {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        hasAssets: !!result.assets?.length,
      });

      if (result.errorCode) {
        const codeMessages: Record<string, string> = {
          camera_unavailable: "This device doesn't have an accessible camera.",
          permission:         "Camera permission was denied. Enable it in Settings and try again.",
          others:             result.errorMessage || "Couldn't open the camera.",
        };
        showToast("error", codeMessages[result.errorCode] || result.errorMessage || "Couldn't open the camera.");
        return;
      }

      if (result.didCancel) {
        return;
      }

      if (!result.assets || !result.assets[0]) {
        showToast("error", "No image was captured. Please try again.");
        return;
      }

      {
        const asset = result.assets[0];

        const fileType = (asset.type || "").toLowerCase();
        if (fileType && !ALLOWED_IMAGE_TYPES.includes(fileType)) {
          showToast("error", "This image format isn't supported. Please retake the photo.");
          return;
        }

        if (!asset.base64) {
          logger.error("[AddProof] missing base64 on captured asset", { uri: asset.uri });
          showToast("error", "The photo couldn't be read from the camera. Please try again.");
          return;
        }


        const reportedSize = (asset as any).fileSize;
        const effectiveSize = typeof reportedSize === "number" && reportedSize > 0
          ? reportedSize
          : Math.floor((asset.base64.length * 3) / 4);
        if (effectiveSize > MAX_IMAGE_SIZE_BYTES) {
          showToast("error", "Image must be under 10MB.");
          return;
        }

        const rawTs = (asset as any).timestamp;
        const capturedAt =
          typeof rawTs === "number" ? rawTs
          : typeof rawTs === "string" ? Date.parse(rawTs) || Date.now()
          : Date.now();

        let userLocation: GeoCoords;
        try {
          userLocation = await fetchProofLocation();
        } catch (err: any) {
          if (err?.code === 1) {
            askOpenSettings(
              "Location Permission Off",
              "Enable Location permission for TranspiraFund in your device Settings, then take the photo again.",
            );
          } else if (err?.code === 2) {
            askOpenSettings(
              "Turn On Location",
              "Location Services is OFF on your device. Open Quick Settings and turn on Location, then take the photo again.",
            );
          } else {
            askRetry(
              "Couldn't Get a GPS Fix",
              "Your phone couldn't pinpoint the site this time. Step into a more open area for clear sky, then take the photo again.",
              () => handleAddProof(m),
            );
          }
          return;
        }

        const { latitude, longitude, accuracy } = userLocation;

        logger.log("[AddProof] dispatching upload, base64 len:", asset.base64.length);
        startProofUpload({
          projectId: project!.id,
          milestoneId: m.id,
          base64: asset.base64,
          capturedAt,
          latitude,
          longitude,
          accuracy,
        });
      }
    } catch (error: any) {
      logger.error("[AddProof] pre-upload error:", error);
      showToast("error", error?.message || "Couldn't capture the proof. Please try again.");
    }
  };

  const handleGenerateMilestones = async (): Promise<{
    ok: boolean;
    count?: number;
    usedFallback?: boolean;
    fallbackSourceProject?: string;
    windowDays?: number | null;
    scheduledDays?: number;
    overflowDays?: number;
    errorCode?: "unauthenticated" | "invalid-argument" | "not-found"
              | "permission-denied" | "already-exists" | "resource-exhausted"
              | "failed-precondition" | "deadline-exceeded" | "unavailable"
              | "internal" | "milestone-validation-failed"
              | "milestone-generator-misconfigured" | "unknown";
    errorMessage?: string;
  }> => {
    try {
      requireAuth();
      const result = (await callFn("generateMilestones", { projectId })) as {
        success: boolean;
        count: number;
        usedFallback?: boolean;
        fallbackSourceProject?: string;
        windowDays?: number | null;
        scheduledDays?: number;
        overflowDays?: number;
      };
      return {
        ok: true,
        count: result.count,
        usedFallback: result.usedFallback,
        fallbackSourceProject: result.fallbackSourceProject,
        windowDays: result.windowDays,
        scheduledDays: result.scheduledDays,
        overflowDays: result.overflowDays,
      };
    } catch (error: any) {
      logger.error("Generate milestones error:", error);
      const raw = `${error?.code || ""} ${error?.message || ""}`
        .toLowerCase()
        .replace(/_/g, "-");
      const code: any =
        raw.includes("unauthenticated") ? "unauthenticated" :
        raw.includes("invalid-argument") ? "invalid-argument" :
        raw.includes("not-found") ? "not-found" :
        raw.includes("permission-denied") ? "permission-denied" :
        raw.includes("already-exists") ? "already-exists" :
        raw.includes("resource-exhausted") ? "resource-exhausted" :
        raw.includes("milestone-generator-misconfigured") ? "milestone-generator-misconfigured" :
        raw.includes("failed-precondition") ? "failed-precondition" :
        raw.includes("deadline-exceeded") ? "deadline-exceeded" :
        raw.includes("unavailable") ? "unavailable" :
        raw.includes("milestone-validation-failed") ? "milestone-validation-failed" :
        raw.includes("internal") ? "internal" : "unknown";
      return { ok: false, errorCode: code, errorMessage: error?.message };
    }
  };

  const handleConfirmMilestone = async (m: Milestone): Promise<boolean> => {
    if (!project) return false;
    try {
      requireAuth();
      const tid = requireTenantId();
      const ref = ProjectModel.milestoneRef(project.id, m.id);
      await updateDoc(ref, { confirmed: true, tenantId: tid });
      return true;
    } catch (error) {
      logger.error("Confirm milestone error:", error);
      showToast("error", "Failed to confirm milestone. Please try again.");
      return false;
    }
  };

  const handleSaveAndConfirmAll = async (
    draft: DraftPhase[],
  ): Promise<{ ok: boolean; errorMessage?: string }> => {
    if (!project) return { ok: false, errorMessage: "Project not loaded." };
    try {
      requireAuth();
      const payload = draft.map((p) => ({
        id: p._isNew ? undefined : p.id,
        sequence: p.sequence,
        title: p.title,
        description: p.description ?? "",
        weightPercentage: p.weightPercentage,
        suggestedDurationDays: p.suggestedDurationDays,
        isNew: p._isNew === true,
        pendingDelete: p._pendingDelete === true,
      }));

      await callFn("confirmMilestonePlan", {
        projectId: project.id,
        phases: payload,
      });

      return { ok: true };
    } catch (error: any) {
      logger.error("Confirm all milestones error:", error);
      showToast("error", "Failed to confirm milestones. Please try again.");
      return { ok: false, errorMessage: error?.message };
    }
  };

  // Semantic (Layer B) title validation via the web-deployed callable. Fails
  // open by design: if the callable is missing or unreachable, Layer A
  // structural checks remain the only client gate and the server-side
  // confirmMilestonePlan enforcement is the real backstop.
  const handleValidateTitle = async (
    title: string,
  ): Promise<{ valid: boolean; reason?: string }> => {
    if (!project) return { valid: true };
    try {
      requireAuth();
      const result = (await callFn("validateMilestoneTitle", {
        projectId: project.id,
        title,
      })) as { valid?: boolean; confidence?: number; reason?: string };
      if (result?.valid === false) {
        return {
          valid: false,
          reason: `This doesn't look like a construction phase for a ${projectTypeLabel(project.projectType)} project. Enter the actual field activity for this phase.`,
        };
      }
      return { valid: true };
    } catch (error: any) {
      logger.log("validateMilestoneTitle unavailable, skipping semantic check:", error?.message);
      return { valid: true };
    }
  };

  const handleMarkCompleted = async (m: Milestone): Promise<boolean> => {
    if (!project) return false;
    if (m.status === "Completed") return true;
    if (m.confirmed === false) {
      showToast("info", "Confirm this phase before marking it completed.");
      return false;
    }
    if (!Array.isArray(m.proofs) || m.proofs.length === 0) {
      showToast("info", "Attach at least one geotagged photo before marking this phase completed.");
      return false;
    }
    try {
      requireAuth();
      const tid = requireTenantId();
      const ref = ProjectModel.milestoneRef(project.id, m.id);
      await updateDoc(ref, { status: "Completed", tenantId: tid });

      showToast("success", `${m.title} marked completed.`);

      callFn("logMobileAuditTrail", {
        action: "Milestone Completed",
        details: `${project.projectName ?? project.title ?? "Project"} · ${m.title}`,
        targetId: project.id,
        milestoneId: m.id,
        syncToHCSD: true,
      }).catch(() => {});

      return true;
    } catch (error) {
      logger.error("Mark completed error:", error);
      showToast("error", "Failed to mark this phase completed. Please try again.");
      return false;
    }
  };

  const handleAddManualMilestone = async (input: {
    title: string;
    description: string;
    weightPercentage: number;
    suggestedDurationDays: number;
  }): Promise<{ ok: boolean; errorCode?: string; errorMessage?: string }> => {
    if (!project) {
      return { ok: false, errorCode: "not-found", errorMessage: "Project not loaded." };
    }
    try {
      requireAuth();
      await callFn("addManualMilestone", { projectId: project.id, ...input });
      return { ok: true };
    } catch (error: any) {
      logger.error("Add manual milestone error:", error);
      const raw = (error?.code || error?.message || "").toLowerCase();
      const code =
        raw.includes("unauthenticated")      ? "unauthenticated" :
        raw.includes("invalid-argument")     ? "invalid-argument" :
        raw.includes("not-found")            ? "not-found" :
        raw.includes("permission-denied")    ? "permission-denied" :
        raw.includes("failed-precondition")  ? "failed-precondition" :
        raw.includes("internal")             ? "internal" : "unknown";
      return { ok: false, errorCode: code, errorMessage: error?.message };
    }
  };

  const handleDeleteMilestone = async (m: Milestone): Promise<boolean> => {
    if (!project) return false;
    try {
      requireAuth();
      await callFn("deleteMilestone", { projectId: project.id, milestoneId: m.id });
      return true;
    } catch (error) {
      logger.error("Delete milestone error:", error);
      showToast("error", "Failed to remove this phase. Please try again.");
      return false;
    }
  };

  return {
    data: {
      project, engineerName, engineerPhotoURL,
      selectedMilestone, lastViewedMilestoneId, isLoading,
      toast, proofUpload, confirmModal,
    },
    actions: {
      onRefresh: () => {},
      goBack: onBackCallback,
      onSelectMilestone,
      onAddProof: handleAddProof,
      onGenerateMilestones: handleGenerateMilestones,
      onConfirmMilestone: handleConfirmMilestone,
      onSaveAndConfirmAll: handleSaveAndConfirmAll,
      onValidateTitle: handleValidateTitle,
      onDeleteMilestone: handleDeleteMilestone,
      onAddManualMilestone: handleAddManualMilestone,
      onMarkCompleted: handleMarkCompleted,
      onDismissToast: dismissToast,
      onDismissConfirmModal: dismissConfirmModal,
      onRetryProofUpload,
      onDismissProofUpload,
    },
  };
};
