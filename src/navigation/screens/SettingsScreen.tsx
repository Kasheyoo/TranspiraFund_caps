import { useNavigation } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useSettingsPresenter } from "../../hooks/useSettingsPresenter";
import { SettingsView } from "../../views/SettingsView";
import { ROUTES } from "../routes";

export function SettingsScreen() {
  const navigation = useNavigation<any>();

  const onNavigate = (screen: string) => {
    if (screen === "ProfileView") navigation.navigate(ROUTES.PROFILE);
    else if (screen === "HelpCenterView") navigation.navigate(ROUTES.HELP_CENTER);
    else if (screen === "AboutAppView") navigation.navigate(ROUTES.ABOUT_APP);
  };

  const { data, actions } = useSettingsPresenter(onNavigate);

  return (
    <SettingsView
      onLogout={() => signOut(auth)}
      onNavigate={onNavigate}
    />
  );
}
