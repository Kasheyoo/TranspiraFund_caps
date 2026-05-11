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
import { requireTenantId } from "../utils/tenant";
import { useAuth } from "../context/AuthContext";
import type { Milestone, Project } from "../types";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024;
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

type GpsPreflight =
  | { ok: true }
  | { ok: false; reason: "disabled" | "unavailable" | "timeout" | "denied" };

const preflightGps = (): Promise<GpsPreflight> =>
  new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      () => resolve({ ok: true }),
      (err: { code: number; message: string }) => {
        if (err.code === 1) return resolve({ ok: false, reason: "denied" });
        if (err.code === 2) return resolve({ ok: false, reason: "disabled" });
        if (err.code === 3) return resolve({ ok: false, reason: "timeout" });
        return resolve({ ok: false, reason: "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 8000 },
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

  const proofDoneTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (proofDoneTimerRef.current) clearTimeout(proofDoneTimerRef.current);
    };
  }, []);

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
        setProofUpload({ stage: "done", percent: 100 });
        if (proofDoneTimerRef.current) clearTimeout(proofDoneTimerRef.current);
        proofDoneTimerRef.current = setTimeout(() => {
          setProofUpload((cur) => (cur?.stage === "done" ? null : cur));
        }, 800);
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

      const preflight = await preflightGps();
      logger.log("[AddProof] gps preflight:", preflight);
      if (!preflight.ok) {
        if (preflight.reason === "denied") {
          askOpenSettings(
            "Location Permission Off",
            "Enable Location permission for TranspiraFund in your device Settings, then try again.",
          );
        } else if (preflight.reason === "disabled") {
          askOpenSettings(
            "Turn On Location",
            "Location Services is OFF on your device. Open Quick Settings and turn on Location, then try again.",
          );
        } else if (preflight.reason === "timeout") {
          askRetry(
            "No GPS Signal",
            "Couldn't get a GPS fix. Step outside or near a window for clear sky, then try again.",
            () => handleAddProof(m),
          );
        } else {
          askRetry(
            "Location Unavailable",
            "Your device couldn't provide a location fix. Check that Location Services is on and try again.",
            () => handleAddProof(m),
          );
        }
        return;
      }

      logger.log("[AddProof] launching camera...");
      const result = await launchCamera({
        mediaType: "photo",
        quality: 1.0,
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

        const fileType = asset.type || "";
        if (!ALLOWED_IMAGE_TYPES.includes(fileType.toLowerCase())) {
          showToast("error", "Only JPEG and PNG images are allowed.");
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

        const userLocation = await new Promise<{
          latitude: number;
          longitude: number;
          accuracy: number;
        }>((resolve, reject) => {
          Geolocation.getCurrentPosition(
            (pos: { coords: { latitude: number; longitude: number; accuracy: number } }) =>
              resolve(pos.coords),
            (err: { code: number; message: string }) => reject(err),
            { enableHighAccuracy: true, timeout: 15000 },
          );
        });

        const { latitude, longitude, accuracy } = userLocation;


        if (accuracy > 50) {
          showToast(
            "error",
            "GPS signal is too weak. Move to a clearer area and try again.",
          );
          return;
        }

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
    errorCode?: "unauthenticated" | "invalid-argument" | "not-found"
              | "permission-denied" | "already-exists" | "internal" | "unknown";
    errorMessage?: string;
  }> => {
    try {
      requireAuth();
      const result = (await callFn("generateMilestones", { projectId })) as {
        success: boolean; count: number;
      };
      return { ok: true, count: result.count };
    } catch (error: any) {
      logger.error("Generate milestones error:", error);
      const raw = (error?.code || error?.message || "").toLowerCase();
      const code: any =
        raw.includes("unauthenticated") ? "unauthenticated" :
        raw.includes("invalid-argument") ? "invalid-argument" :
        raw.includes("not-found") ? "not-found" :
        raw.includes("permission-denied") ? "permission-denied" :
        raw.includes("already-exists") ? "already-exists" :
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
    edits: Record<string, Partial<Milestone>>,
  ): Promise<boolean> => {
    if (!project) return false;
    try {
      requireAuth();
      const tid = requireTenantId();
      const drafts = (project.milestones ?? []).filter((m) => m.confirmed === false);
      if (drafts.length === 0) return true;

      await Promise.all(
        drafts.map((m) => {
          const ref = ProjectModel.milestoneRef(project.id, m.id);
          const changes = edits[m.id] ?? {};
          return updateDoc(ref, { ...changes, confirmed: true, tenantId: tid });
        }),
      );

      callFn("logMobileAuditTrail", {
        action: "Milestones Confirmed",
        details: `${drafts.length} phase${drafts.length !== 1 ? "s" : ""} confirmed for ${project.projectName ?? project.title ?? "project"}`,
        targetId: project.id,
        syncToHCSD: true,
      }).catch(() => {});

      return true;
    } catch (error) {
      logger.error("Confirm all milestones error:", error);
      showToast("error", "Failed to confirm milestones. Please try again.");
      return false;
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
      onDeleteMilestone: handleDeleteMilestone,
      onMarkCompleted: handleMarkCompleted,
      onDismissToast: dismissToast,
      onDismissConfirmModal: dismissConfirmModal,
      onRetryProofUpload,
      onDismissProofUpload,
    },
  };
};
