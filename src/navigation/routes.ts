export const ROUTES = {
  // Auth flow
  LANDING: "Landing",
  LOGIN: "Login",
  FORGOT_PASSWORD: "ForgotPassword",
  FORCE_PASSWORD_CHANGE: "ForcePasswordChange",

  // Main tabs
  DASHBOARD: "Dashboard",
  PROJECTS: "Projects",
  NOTIFICATIONS: "Notifications",
  SETTINGS: "Settings",

  // Projects stack
  PROJECT_LIST: "ProjectList",
  PROJECT_DETAILS: "ProjectDetails",

  // Settings stack
  PROFILE: "Profile",
  HELP_CENTER: "HelpCenter",
  ABOUT_APP: "AboutApp",
  AUDIT_TRAIL: "AuditTrail",
} as const;
