export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Proof {
  id: string;
  fileName?: string;
  tenantId?: string;

  url: string;
  storagePath: string;

  gps?: { lat: number; lng: number };
  accuracy: number;
  location: string;

  capturedAt: FirestoreTimestamp;
  uploadedAt: FirestoreTimestamp;
  uploadedBy: string;

  latitude?: number;
  longitude?: number;
  timestamp?: number;
}

export interface Milestone {
  id: string;
  projectId?: string;
  tenantId?: string;
  title: string;
  status?: string;
  sequence?: number;
  proofs?: Proof[];
  description?: string;
  weightPercentage?: number;
  suggestedDurationDays?: number;
  generatedBy?: string;
  confirmed?: boolean;
  createdAt?: FirestoreTimestamp;
}

export interface ProjectOrderRecord {
  number?: string;
  date?: string;
  uploadedAt?: FirestoreTimestamp;
  uploadedBy?: string;
  attachmentUrl?: string;
}

export interface SuspensionOrderRecord extends ProjectOrderRecord {
  reason?: string;
}

export interface TimeExtensionRecord {
  days?: number;
  reason?: string;
  grantedAt?: FirestoreTimestamp;
  grantedBy?: string;
}

export interface Project {
  id: string;
  tenantId?: string;
  projectName?: string;
  projectEngineer?: string;
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
  title?: string;
  engineer?: string;
  location?: string;
  startDate?: string;
  completionDate?: string;
  contractor?: string;
  description?: string;
  projectCode?: string;
  status?: string;
  progress?: number;
  budget?: number;
  milestones?: Milestone[];
  createdBy?: string;
  createdAt?: FirestoreTimestamp;
  projectInspector?: string;
  materialInspector?: string;
  electricalInspector?: string;
  resumeOrderNumber?: string;
  resumeOrderDate?: string;
  timeExtensionOnOrder?: string;
  validationOrderNumber?: string;
  validationOrderDate?: string;
  suspensionOrderNumber?: string;
  suspensionOrderDate?: string;
  resumeOrder?: ProjectOrderRecord;
  validationOrder?: ProjectOrderRecord;
  suspensionOrder?: SuspensionOrderRecord;
  timeExtension?: TimeExtensionRecord;
  incurredAmount?: number;
  remarks?: string;
  actionTaken?: string;
  projectType?:
    | "road_concreting"
    | "drainage_construction"
    | "multi_purpose_building"
    | "covered_court"
    | "day_care_center"
    | "footbridge"
    | "slope_protection"
    | "waterworks"
    | "electrification"
    | "unknown";
  classificationConfidence?: number;
  // Classifier contract v1 nested map, written by validateProjectClassification
  // and createProject on the web side. Pre-contract projects have this
  // undefined and consumers must fall back to projectType /
  // classificationConfidence via the legacy admission rule mirrored in
  // canGenerateMilestones().
  //
  // matchMode/noveltyScore/retrievedSourceIds/corpusVersion/generationStages
  // are per-generation-event fields on the callable response, NOT persisted
  // on the project doc; they live on GenerateResult, not here.
  classification?: {
    admitted?: boolean;
    isComposite?: boolean;
    components?: string[];
    contractVersion?: string;
    classifierVersion?: string;
  };
}

// Retrieval match mode from the server-side scorer. Persisted onto the
// generateMilestones response and rendered as an advisory when the value is
// "analogous" or "novel".
export type MatchMode = "exact" | "variant" | "composite" | "analogous" | "novel";

// One stage in the generateMilestones response's generationStages log. The
// modal replays these sequentially in the loading view so the PE sees the
// server named the retrieved reference projects.
export interface GenerationStage {
  key: string;
  body: string;
}

export interface UserProfile {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
  tenantId?: string;
  status?: string;
  firstTimeAccess?: boolean;
  mustChangePassword?: boolean;
  name?: string;
  photoURL?: string;
}

export interface Tenant {
  tenantId: string;
  lguName: string;
  psgcCode?: string;
  createdAt?: FirestoreTimestamp;
}

export interface AppNotification {
  id: string;
  tenantId?: string;
  recipientUid: string;
  action: string;
  severity: "info" | "success" | "critical";
  title: string;
  body: string;
  targetType:
    | "project"
    | "milestone"
    | "auditTrail"
    | "profile"
    | "settings"
    | string
    | null;
  targetId: string | null;
  metadata?: Record<string, unknown>;
  isRead: boolean;
  dismissedAt?: FirestoreTimestamp | null;
  createdAt: FirestoreTimestamp;
}

export interface AuditTrail {
  id: string;
  tenantId?: string;
  actorUid?: string;
  email?: string;
  action?: string;
  details?: string | { projectId?: string; milestoneId?: string; message?: string };
  targetId?: string;
  createdAt?: FirestoreTimestamp;

  uid?: string;
  platform?: string;
  timestamp?: FirestoreTimestamp;
}

export interface DashboardStats {
  progress: number;
  done: number;
  delay: number;
  draft?: number;
  forMayor?: number;
  engineerCount?: number;
  departmentCount?: number;
  projectCount?: number;
  totalBudget?: number;
  lastUpdated?: string;
}
