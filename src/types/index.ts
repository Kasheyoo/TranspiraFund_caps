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
  targetType: "project" | null;
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
