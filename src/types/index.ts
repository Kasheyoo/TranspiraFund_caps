// Shared TypeScript interfaces for the TranspiraFund app

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Proof {
  // Stable id — `${capturedAt}_${uid}` so duplicate uploads dedupe and
  // HCSD can reference a single submission unambiguously.
  id: string;

  // ── Storage layer ──────────────────────────────────────────────
  url: string;            // Public download URL (Firebase Storage signed)
  storagePath: string;    // Full bucket path — needed for cleanup / re-issue

  // ── Geo (camera-time, not upload-time) ─────────────────────────
  latitude: number;
  longitude: number;
  accuracy: number;       // GPS accuracy in meters at capture
  // Human-readable place name from server-side reverse geocode
  // (e.g. "Brgy. San Roque, Mati City, Davao Oriental"). Falls back to a
  // "lat, lng" string when geocoding fails. Older proofs only ever stored
  // the coord string — read sites should treat this as a freeform label.
  location: string;

  // ── Provenance ─────────────────────────────────────────────────
  capturedAt: number;     // ms epoch — moment the photo was taken
  uploadedAt: number;     // ms epoch — moment the upload completed
  uploadedBy: string;     // PROJ_ENG uid

  // Backwards-compat — older proofs only had `timestamp`. Read paths
  // should prefer `capturedAt` and fall back to `timestamp`.
  timestamp?: number;
}

export interface Milestone {
  id: string;
  projectId?: string;   // kept for backward compat; subcollection path is canonical
  title: string;
  status?: string;
  sequence?: number;
  proofs?: Proof[];
  // ── AI-generated milestone fields (from generateMilestones Cloud Function) ──
  description?: string;
  weightPercentage?: number;     // contribution to overall progress; sums to 100 across milestones
  suggestedDurationDays?: number; // calendar days estimate
  generatedBy?: string;           // e.g. "claude-haiku-4-5" — distinguishes AI from manual
  confirmed?: boolean;            // engineer must review + confirm before tracking proofs
  createdAt?: FirestoreTimestamp;
}

export interface Project {
  id: string;
  // ── Canonical field names written by web app HCSD ──────────────
  projectName?: string;
  projectEngineer?: string;  // holds the engineer's auth UID (yes, despite the name)
  barangay?: string;
  sitioStreet?: string;
  fundingSource?: string;
  accountCode?: string;
  contractAmount?: number;
  ntpReceivedDate?: string;
  officialDateStarted?: string;
  originalDateCompletion?: string;
  revisedDate1?: string;
  revisedDate2?: string;
  actualDateCompleted?: string;
  actualPercent?: number;
  // ── Display-friendly aliases (resolved in ProjectModel.normalize) ─
  title?: string;         // = projectName
  engineer?: string;      // = projectEngineer
  location?: string;      // = barangay [+ sitioStreet]
  startDate?: string;     // = officialDateStarted
  completionDate?: string;// = originalDateCompletion
  // ── Shared fields ──────────────────────────────────────────────
  contractor?: string;
  description?: string;
  projectCode?: string;
  status?: string;
  progress?: number;
  budget?: number;        // legacy alias for contractAmount display
  milestones?: Milestone[];
  createdBy?: string;
  createdAt?: FirestoreTimestamp;
  // ── Assigned Personnel (web-canonical, flat) ────────────────────
  projectInspector?: string;
  materialInspector?: string;
  electricalInspector?: string;
  // ── Project Orders (flat fields written by web) ─────────────────
  resumeOrderNumber?: string;
  resumeOrderDate?: string;
  timeExtensionOnOrder?: string;
  validationOrderNumber?: string;
  validationOrderDate?: string;
  suspensionOrderNumber?: string;
  suspensionOrderDate?: string;
  // ── Fund Utilization ────────────────────────────────────────────
  incurredAmount?: number;
  // ── Remarks & Action ────────────────────────────────────────────
  remarks?: string;
  actionTaken?: string;
}

export interface UserProfile {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
  status?: string;
  firstTimeAccess?: boolean;    // legacy field (unused by web app)
  mustChangePassword?: boolean; // set by web app on account creation
  name?: string;
  photoURL?: string;
}

export interface AppNotification {
  id: string;
  type?: string;
  status?: string;
  Message?: string;
  timestamp?: FirestoreTimestamp;
}

export interface AuditTrail {
  id: string;
  uid?: string;      // actor's Firebase UID — key into users/{uid}
  email?: string;    // actor's email — fallback if user doc is missing
  action?: string;
  details?: string;
  platform?: string;
  timestamp?: FirestoreTimestamp;
}

export interface DashboardStats {
  // Project status counts — written by web app's onProjectWritten trigger
  progress: number;  // in-progress / ongoing projects
  done: number;      // completed projects
  delay: number;     // delayed projects
  draft?: number;    // draft projects (not yet active)
  forMayor?: number; // projects awaiting mayor-level approval
  // Additional web stats (available but not required by mobile dashboard)
  engineerCount?: number;
  departmentCount?: number;
  projectCount?: number;
  totalBudget?: number;
  lastUpdated?: string;
}
