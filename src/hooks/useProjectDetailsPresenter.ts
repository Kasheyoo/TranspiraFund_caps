import { updateDoc } from "firebase/firestore";
import { useEffect, useRef, useState } from "react";
import { Alert, PermissionsAndroid, Platform } from "react-native";
import { launchCamera } from "react-native-image-picker";
import Geolocation from "react-native-geolocation-service";
import { callFn } from "../services/CloudFunctionService";
import { ProjectModel } from "../models/ProjectModel";
import { requireAuth } from "../utils/authGuard";
import { logger } from "../utils/logger";
import { useAuth } from "../context/AuthContext";
import type { Milestone, Project } from "../types";

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/jpg"];

// PermissionsAndroid is Android-only. iOS handles permissions via Info.plist
// + automatic prompts at first use, so we short-circuit to "granted" there.
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

// Camera permission MUST be requested explicitly. The library's launchCamera
// will silently fail with errorCode "permission" if we don't — which presents
// to the user as "the button does nothing." This is the fix for that bug.
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

// Fast pre-flight to confirm Location Services (GPS hardware) is actually ON.
// Permission alone isn't enough — the user can have granted ACCESS_FINE_LOCATION
// but still have GPS turned off in Quick Settings. We probe with a tight
// timeout so the user sees a clear "turn on Location" prompt BEFORE the camera
// opens, instead of taking a photo and then failing on the geotag at upload time.
type GpsPreflight =
  | { ok: true }
  | { ok: false; reason: "disabled" | "unavailable" | "timeout" | "denied" };

const preflightGps = (): Promise<GpsPreflight> =>
  new Promise((resolve) => {
    Geolocation.getCurrentPosition(
      () => resolve({ ok: true }),
      (err: { code: number; message: string }) => {
        // Geolocation error codes: 1=PERMISSION_DENIED, 2=POSITION_UNAVAILABLE, 3=TIMEOUT
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
  const [isLoading, setIsLoading] = useState(true);
  const selectedMilestoneRef = useRef(selectedMilestone);
  selectedMilestoneRef.current = selectedMilestone;

  // Toast: non-blocking confirmations + soft errors. Blocking prompts (permission
  // denied, GPS disabled) intentionally stay as Alert because the user has to
  // go to device Settings — that's a hard gate, not a fire-and-forget message.
  type ToastType = "success" | "error" | "info";
  const [toast, setToast] = useState<{ visible: boolean; type: ToastType; message: string }>({
    visible: false, type: "success", message: "",
  });
  const showToast = (type: ToastType, message: string) =>
    setToast({ visible: true, type, message });
  const dismissToast = () => setToast((t) => ({ ...t, visible: false }));

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
      logger.log("[AddProof] start", { milestoneId: m.id });

      // Cap at 5 proofs — server enforces the same gate, but checking here
      // avoids a wasted camera launch + GPS fix + upload round-trip.
      const currentProofCount = Array.isArray(m.proofs) ? m.proofs.length : 0;
      if (currentProofCount >= 5) {
        showToast("info", "Maximum of 5 proofs reached for this phase.");
        return;
      }

      // 1. CAMERA permission — must be requested explicitly or launchCamera
      // silently no-ops with errorCode "permission".
      const cameraGranted = await requestCameraPermission();
      logger.log("[AddProof] camera permission:", cameraGranted);
      if (!cameraGranted) {
        Alert.alert(
          "Camera Permission Required",
          "TranspiraFund needs camera access to capture proof of work. Enable Camera permission for this app in Settings, then try again.",
        );
        return;
      }

      // 2. LOCATION permission
      const locationGranted = await requestLocationPermission();
      logger.log("[AddProof] location permission:", locationGranted);
      if (!locationGranted) {
        Alert.alert(
          "Location Permission Required",
          "TranspiraFund needs location access to geo-tag every proof. Enable Location permission for this app in Settings, then try again.",
        );
        return;
      }

      // 3. Hard-require live GPS BEFORE the camera opens. Stops the user from
      // capturing a photo that we'd then have to reject for missing geotag.
      const preflight = await preflightGps();
      logger.log("[AddProof] gps preflight:", preflight);
      if (!preflight.ok) {
        const messages: Record<typeof preflight.reason, { title: string; body: string }> = {
          denied:      { title: "Location Permission Off", body: "Enable Location permission for TranspiraFund in your device Settings, then try again." },
          disabled:    { title: "Turn On Location",        body: "Location Services is OFF on your device. Open Quick Settings and turn on Location, then try again." },
          timeout:     { title: "No GPS Signal",           body: "Couldn't get a GPS fix. Step outside or near a window for clear sky, then try again." },
          unavailable: { title: "Location Unavailable",    body: "Your device couldn't provide a location fix. Check that Location Services is on and try again." },
        };
        const msg = messages[preflight.reason];
        Alert.alert(msg.title, msg.body);
        return;
      }

      // 4. Launch camera. saveToPhotos:false keeps the photo out of the gallery
      // (mobile evidence stays inside our pipeline). cameraType:back is the
      // sensible default for site documentation.
      logger.log("[AddProof] launching camera...");
      // includeBase64:true so we can upload via Firebase's uploadString without
      // touching RN's broken fetch().blob() / XHR-blob paths for local URIs.
      // For ~0.7-quality JPEGs (~1–3MB) the base64 memory bump is fine.
      const result = await launchCamera({
        mediaType: "photo",
        quality: 0.7,
        saveToPhotos: false,
        includeBase64: true,
      });
      logger.log("[AddProof] camera result:", {
        didCancel: result.didCancel,
        errorCode: result.errorCode,
        hasAssets: !!result.assets?.length,
      });

      // Surface explicit camera errors — silent failure here is what users
      // were experiencing as "the button does nothing."
      if (result.errorCode) {
        const codeMessages: Record<string, string> = {
          camera_unavailable: "This device doesn't have an accessible camera.",
          permission:         "Camera permission was denied. Enable it in Settings and try again.",
          others:             result.errorMessage || "Couldn't open the camera.",
        };
        Alert.alert("Camera Error", codeMessages[result.errorCode] || result.errorMessage || "Couldn't open the camera.");
        return;
      }

      if (result.didCancel) {
        // User backed out of the camera — no-op, no alert.
        return;
      }

      if (!result.assets || !result.assets[0]) {
        Alert.alert("No Photo", "No image was captured. Please try again.");
        return;
      }

      {
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

        // Bail early if base64 didn't come back — we can't upload without it.
        if (!asset.base64) {
          logger.error("[AddProof] missing base64 on captured asset", { uri: asset.uri });
          Alert.alert("Capture Error", "The photo couldn't be read from the camera. Please try again.");
          return;
        }

        setIsLoading(true);

        // image-picker's `timestamp` on Asset is typed as string (ISO),
        // but on Android it sometimes comes back as a number — handle both.
        const rawTs = (asset as any).timestamp;
        const capturedAt =
          typeof rawTs === "number" ? rawTs
          : typeof rawTs === "string" ? Date.parse(rawTs) || Date.now()
          : Date.now();

        // GPS — high accuracy, fail loud if the device couldn't get a fix.
        // We capture accuracy too so HCSD can judge the quality of the
        // geotag (urban canyons can give 50m+ readings on consumer GPS).
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

        // Server-side upload via Cloud Function. The Firebase JS SDK's Storage
        // module throws "Creating blobs from 'ArrayBufferView' are not supported"
        // in React Native — the polyfill rejects the Blob construction path
        // both `uploadBytes` and `uploadString` end up using. So the function
        // accepts base64, uploads via Admin SDK, and atomically appends the
        // proof to the milestone doc. Same pattern as `uploadProfilePhoto`.
        logger.log("[AddProof] uploading via uploadProofPhoto, base64 len:", asset.base64.length);
        await callFn("uploadProofPhoto", {
          projectId:   project!.id,
          milestoneId: m.id,
          base64:      asset.base64,
          capturedAt,
          latitude,
          longitude,
          accuracy,
        });
        logger.log("[AddProof] upload complete (function returned)");

        // Audit + arrayUnion are both done server-side by the function — the
        // realtime listener picks up the new proof from the milestone doc.

        showToast("success", "Geotagged proof saved successfully.");
      }
    } catch (error: any) {
      logger.error("[AddProof] upload error:", error);
      // Map common server-side error codes to short, user-readable copy.
      // The function throws HttpsError with codes like "permission-denied" /
      // "failed-precondition" / "invalid-argument" — surface those directly
      // instead of the opaque "Failed to save evidence log."
      const code = String(error?.code || "");
      const detail =
        code.includes("unauthenticated")     ? "Session expired. Please sign in again."
      : code.includes("permission-denied")   ? "You're not the assigned engineer for this project."
      : code.includes("failed-precondition") ? "Confirm this phase before uploading proof."
      : code.includes("invalid-argument")    ? "Photo or location data is invalid. Please try again."
      : code.includes("not-found")           ? "Project or milestone could not be found."
      : error?.message                       || "Could not save the proof. Please try again.";
      showToast("error", detail);
    } finally {
      setIsLoading(false);
    }
  };

  // Maps the spec's documented error codes to user-facing UX outcomes.
  // Returned to the caller (the modal) so it can render the right state.
  const handleGenerateMilestones = async (): Promise<{
    ok: boolean;
    count?: number;
    projectType?: string;
    errorCode?: "unauthenticated" | "invalid-argument" | "not-found"
              | "permission-denied" | "already-exists" | "internal" | "unknown";
    errorMessage?: string;
  }> => {
    try {
      requireAuth();
      const result = (await callFn("generateMilestones", { projectId })) as {
        success: boolean; count: number; projectType: string;
      };
      // Real-time listener will auto-update with the new milestone docs
      return { ok: true, count: result.count, projectType: result.projectType };
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

  // Engineer must review each AI-generated milestone before progress tracking
  // unlocks. Toggles `confirmed: true` on the milestone subcollection doc.
  const handleConfirmMilestone = async (m: Milestone): Promise<boolean> => {
    if (!project) return false;
    try {
      requireAuth();
      const ref = ProjectModel.milestoneRef(project.id, m.id);
      await updateDoc(ref, { confirmed: true });
      return true;
    } catch (error) {
      logger.error("Confirm milestone error:", error);
      Alert.alert("Error", "Failed to confirm milestone. Please try again.");
      return false;
    }
  };

  // Batch endpoint used by the milestone review modal. The caller hands over
  // edits keyed by milestone id (only the fields the engineer actually changed),
  // and we apply them together with `confirmed: true` in parallel — one
  // `updateDoc` per milestone. Anything not in `edits` is just confirmed as-is.
  const handleSaveAndConfirmAll = async (
    edits: Record<string, Partial<Milestone>>,
  ): Promise<boolean> => {
    if (!project) return false;
    try {
      requireAuth();
      const drafts = (project.milestones ?? []).filter((m) => m.confirmed === false);
      if (drafts.length === 0) return true;

      await Promise.all(
        drafts.map((m) => {
          const ref = ProjectModel.milestoneRef(project.id, m.id);
          const changes = edits[m.id] ?? {};
          return updateDoc(ref, { ...changes, confirmed: true });
        }),
      );

      callFn("logMobileAuditTrail", {
        action: "Milestones Confirmed",
        details: `${drafts.length} phase${drafts.length !== 1 ? "s" : ""} confirmed for ${project.projectName ?? project.title ?? "project"}`,
        syncToHCSD: true,
      }).catch(() => {});

      return true;
    } catch (error) {
      logger.error("Confirm all milestones error:", error);
      Alert.alert("Error", "Failed to confirm milestones. Please try again.");
      return false;
    }
  };

  // Engineer marks a milestone "Completed". Gated on at least one proof
  // (UI also disables the button) and on the milestone being confirmed.
  // Status is the canonical signal HCSD/web read for progress %, so we log
  // this to HCSD audit so the office sees the field call live.
  const handleMarkCompleted = async (m: Milestone): Promise<boolean> => {
    if (!project) return false;
    if (m.status === "Completed") return true;
    if (m.confirmed === false) {
      Alert.alert("Confirm First", "Confirm this phase before marking it completed.");
      return false;
    }
    if (!Array.isArray(m.proofs) || m.proofs.length === 0) {
      Alert.alert("Proof Required", "Attach at least one geotagged photo before marking this phase completed.");
      return false;
    }
    try {
      requireAuth();
      const ref = ProjectModel.milestoneRef(project.id, m.id);
      await updateDoc(ref, { status: "Completed" });

      callFn("logMobileAuditTrail", {
        action: "Milestone Completed",
        details: `${project.projectName ?? project.title ?? "Project"} · ${m.title}`,
        syncToHCSD: true,
      }).catch(() => {});

      return true;
    } catch (error) {
      logger.error("Mark completed error:", error);
      Alert.alert("Error", "Failed to mark this phase completed. Please try again.");
      return false;
    }
  };

  // Drafts only — firestore rules block client-side milestone delete, and
  // the cloud function refuses to delete confirmed milestones.
  const handleDeleteMilestone = async (m: Milestone): Promise<boolean> => {
    if (!project) return false;
    try {
      requireAuth();
      await callFn("deleteMilestone", { projectId: project.id, milestoneId: m.id });
      return true;
    } catch (error) {
      logger.error("Delete milestone error:", error);
      Alert.alert("Error", "Failed to remove this phase. Please try again.");
      return false;
    }
  };

  return {
    data: { project, engineerName, engineerPhotoURL, selectedMilestone, isLoading, toast },
    actions: {
      onRefresh: () => {}, // No-op — real-time listener handles updates automatically
      goBack: onBackCallback,
      onSelectMilestone: setSelectedMilestone,
      onAddProof: handleAddProof,
      onGenerateMilestones: handleGenerateMilestones,
      onConfirmMilestone: handleConfirmMilestone,
      onSaveAndConfirmAll: handleSaveAndConfirmAll,
      onDeleteMilestone: handleDeleteMilestone,
      onMarkCompleted: handleMarkCompleted,
      onDismissToast: dismissToast,
    },
  };
};
