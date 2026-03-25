import { useNavigation } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useAuth } from "../../context/AuthContext";
import { callFn } from "../../services/CloudFunctionService";
import { SettingsView } from "../../views/SettingsView";
import { ROUTES } from "../routes";

export function SettingsScreen() {
  const navigation = useNavigation<any>();
  const { userProfile } = useAuth();

  const onNavigate = (screen: string) => {
    if (screen === "ProfileView") navigation.navigate(ROUTES.PROFILE);
    else if (screen === "HelpCenterView") navigation.navigate(ROUTES.HELP_CENTER);
    else if (screen === "AboutAppView") navigation.navigate(ROUTES.ABOUT_APP);
    else if (screen === "AuditTrail") navigation.navigate(ROUTES.AUDIT_TRAIL);
  };

  const handleLogout = () => {
    const firstName = userProfile?.firstName || userProfile?.name?.split(" ")[0] || "Engineer";
    callFn("logMobileAuditTrail", {
      action: "Signed Out",
      details: firstName,
      syncToDEPW: false,
    }).catch(() => {});
    signOut(auth);
  };

  return (
    <SettingsView
      onLogout={handleLogout}
      onNavigate={onNavigate}
    />
  );
}
