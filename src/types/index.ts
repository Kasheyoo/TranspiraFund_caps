// Shared TypeScript interfaces for the TranspiraFund app

export interface FirestoreTimestamp {
  seconds: number;
  nanoseconds: number;
}

export interface Proof {
  url: string;
  location: string;
  timestamp: number;
  latitude: number;
  longitude: number;
}

export interface Milestone {
  id: string;
  projectId?: string;   // kept for backward compat; subcollection path is canonical
  title: string;
  status?: string;
  sequence?: number;
  proofs?: Proof[];
}

export interface Project {
  id: string;
  // ── Canonical field names written by web app HCSD ──────────────
  projectName?: string;
  projectEngineer?: string;
  projectEngineerUid?: string;
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
  action?: string;
  details?: string;
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
