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
  projectId: string;
  title: string;
  status?: string;
  sequence?: number;
  proofs?: Proof[];
}

export interface Project {
  id: string;
  projectTitle?: string;
  title?: string;
  engineer?: string;
  location?: string;
  completionDate?: string;
  status?: string;
  progress?: number;
  milestones?: Milestone[];
}

export interface UserProfile {
  uid?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  role?: string;
  status?: string;
  firstTimeAccess?: boolean;
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

export interface AuditLog {
  id: string;
  action?: string;
  details?: string;
  timestamp?: FirestoreTimestamp;
}

export interface DashboardStats {
  progress: number;
  done: number;
  delay: number;
}
