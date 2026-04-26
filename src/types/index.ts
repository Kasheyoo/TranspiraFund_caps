// Shared TypeScript interfaces for the TranspiraFund app

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Proof {
  // Stable id — `${capturedAt}_${uid}` so duplicate uploads dedupe and
  // HCSD can reference a single submission unambiguously.
  id: string;
  // Storage file name, e.g. "1712345678901.jpg".
  fileName?: string;
  // Multi-tenant scope (written by backend, validated by Rules)
  tenantId?: string;

  // ── Storage layer ──────────────────────────────────────────────
  url: string;            // Public download URL (Firebase Storage signed)
  storagePath: string;    // Full bucket path — needed for cleanup / re-issue

  // ── Geo (camera-time, not upload-time) ─────────────────────────
  gps?: { lat: number; lng: number };
  accuracy: number;       // GPS accuracy in meters at capture
  // Human-readable place name from server-side reverse geocode
  // (e.g. "Brgy. San Roque, Mati City, Davao Oriental"). Falls back to a
  // "lat, lng" string when geocoding fails.
  location: string;

  // ── Provenance ─────────────────────────────────────────────────
  capturedAt: FirestoreTimestamp;
  uploadedAt: FirestoreTimestamp;
  uploadedBy: string;     // PROJ_ENG uid

  // ── Legacy fields (read-only for pre-contract proofs) ──────────
  // New writes no longer emit these. Keep them optional so read sites
  // can still render historical records that pre-date the contract.
  latitude?: number;
  longitude?: number;
  timestamp?: number;
}

export interface Milestone {
  id: string;
  projectId?: string;   // kept for backward compat; subcollection path is canonical
  // Multi-tenant scope (written by backend, validated by Rules)
  tenantId?: string;
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
  // Multi-tenant scope (written by backend, validated by Rules)
  tenantId?: string;
  // ── Canonical field names written by web app HCSD ──────────────
  projectName?: string;
  projectEngineer?: string;  // holds the engineer's auth UID (yes, despite the name)
  // Notice to Proceed metadata. Only written by HCSD via the web app's
  // attachNtp Cloud Function. Mobile reads are permitted; writes are not.
  ntpFileUrl?: string;
  ntpFileName?: string;
  ntpUploadedAt?: FirestoreTimestamp;
  ntpUploadedBy?: string;
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
  // Multi-tenant scope (written by backend, validated by Rules)
  tenantId?: string;
  status?: string;
  firstTimeAccess?: boolean;    // legacy field (unused by web app)
  mustChangePassword?: boolean; // set by web app on account creation
  name?: string;
  photoURL?: string;
}

export interface Tenant {
  // PSGC-derived id, e.g. "cebu-city-0730600000"
  tenantId: string;
  lguName: string;
  psgcCode?: string;
  createdAt?: FirestoreTimestamp;
}

export interface AppNotification {
  id: string;
  // Multi-tenant scope (written by backend, validated by Rules)
  tenantId?: string;
  recipientUid: string;
  action: string;
  severity: "info" | "success" | "critical";
  title: string;
  body: string;
  targetType: "project" | null;
  targetId: string | null;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  dismissedAt?: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp;
}

export interface AuditTrail {
  id: string;
  // Multi-tenant scope (written by backend, validated by Rules)
  tenantId?: string;
  actorUid?: string; // actor's Firebase UID — key into users/{uid}
  email?: string;    // actor's email — fallback if user doc is missing
  action?: string;
  // Structured payload for the HCSD fan-out contract. Legacy pre-contract
  // docs stored a plain string here, so read sites still accept string.
  details?: string | { projectId?: string; milestoneId?: string; message?: string };
  targetId?: string;
  createdAt?: FirestoreTimestamp;

  // ── Legacy fields (read-only for pre-contract entries) ────────
  uid?: string;
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
