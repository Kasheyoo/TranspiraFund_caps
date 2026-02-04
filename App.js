import {
  Inter_400Regular,
  Inter_700Bold,
  useFonts,
} from "@expo-google-fonts/inter";
import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { BottomNavBar } from "./src/components/BottomNavBar";
import { AboutAppView } from "./src/views/AboutAppView";
import { DashboardView } from "./src/views/DashboardView";
import { HelpCenterView } from "./src/views/HelpCenterView";
import { LoginView } from "./src/views/LoginView";
import { MilestoneDetailsView } from "./src/views/MilestoneDetailsView";
import { NotificationsView } from "./src/views/NotificationsView";
import { ProfileView } from "./src/views/ProfileView";
import { ProjectDetailsView } from "./src/views/ProjectDetailsView";
import { ProjectListView } from "./src/views/ProjectListView";
import { SettingsView } from "./src/views/SettingsView";

import { COLORS } from "./src/constants";
import { useDashboardPresenter } from "./src/presenters/useDashboardPresenter";
import { useLoginPresenter } from "./src/presenters/useLoginPresenter";
import { useNotificationPresenter } from "./src/presenters/useNotificationPresenter";
import { useProfilePresenter } from "./src/presenters/useProfilePresenter";
import { useProjectDetailsPresenter } from "./src/presenters/useProjectDetailsPresenter";
import { useProjectListPresenter } from "./src/presenters/useProjectListPresenter";

export default function App() {
  let [fontsLoaded] = useFonts({
    "Inter-Bold": Inter_700Bold,
    "Inter-Regular": Inter_400Regular,
  });

  const [currentScreen, setCurrentScreen] = useState("Login");
  const [selectedProjectId, setSelectedProjectId] = useState(null);

  const loginPresenter = useLoginPresenter(() => setCurrentScreen("Dashboard"));
  const dashboardPresenter = useDashboardPresenter(setCurrentScreen);
  const projectListPresenter = useProjectListPresenter(
    (id) => {
      setSelectedProjectId(id);
      setCurrentScreen("ProjectDetails");
    },
    () => setCurrentScreen("Dashboard"),
  );
  const projectDetailsPresenter = useProjectDetailsPresenter(
    selectedProjectId,
    () => setCurrentScreen("Projects"),
  );
  const profilePresenter = useProfilePresenter(
    () => setCurrentScreen("Settings"),
    () => setCurrentScreen("Login"),
  );
  const notificationPresenter = useNotificationPresenter();

  if (!fontsLoaded)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );

  const showNavBar = [
    "Dashboard",
    "Projects",
    "Notifications",
    "Settings",
    "Profile",
  ].includes(currentScreen);

  const renderScreen = () => {
    switch (currentScreen) {
      case "Login":
        return (
          <LoginView
            data={loginPresenter.data}
            actions={loginPresenter.actions}
          />
        );
      case "Dashboard":
        return (
          <DashboardView
            data={dashboardPresenter.data}
            actions={dashboardPresenter.actions}
          />
        );
      case "Projects":
        return (
          <ProjectListView
            data={projectListPresenter.data}
            actions={projectListPresenter.actions}
          />
        );
      case "Notifications":
        return (
          <NotificationsView
            data={notificationPresenter.data}
            actions={notificationPresenter.actions}
          />
        );
      case "Settings":
        return (
          <SettingsView
            onLogout={profilePresenter.actions.onLogout}
            onNavigate={(screen) => {
              // ✅ FIXED: Mapping Settings sub-views to App screen keys
              if (screen === "ProfileView") setCurrentScreen("Profile");
              else if (screen === "HelpCenterView")
                setCurrentScreen("HelpCenter");
              else if (screen === "AboutAppView") setCurrentScreen("AboutApp");
              else setCurrentScreen(screen);
            }}
          />
        );
      case "ProjectDetails":
        return projectDetailsPresenter.data.selectedMilestone ? (
          <MilestoneDetailsView
            data={projectDetailsPresenter.data}
            actions={projectDetailsPresenter.actions}
          />
        ) : (
          <ProjectDetailsView
            data={projectDetailsPresenter.data}
            actions={projectDetailsPresenter.actions}
            onBack={projectDetailsPresenter.actions.goBack}
          />
        );
      case "Profile":
        return (
          <ProfileView
            data={profilePresenter.data}
            actions={profilePresenter.actions}
          />
        );
      case "HelpCenter":
        return <HelpCenterView onBack={() => setCurrentScreen("Settings")} />;
      case "AboutApp":
        return <AboutAppView onBack={() => setCurrentScreen("Settings")} />;
      default:
        // Ensure that if a match isn't found, we don't loop or show a blank screen
        return (
          <LoginView
            data={loginPresenter.data}
            actions={loginPresenter.actions}
          />
        );
    }
  };

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        <StatusBar style="dark" />
        {renderScreen()}
        {showNavBar && (
          <BottomNavBar
            currentScreen={currentScreen}
            onNavigate={setCurrentScreen}
          />
        )}
      </View>
    </SafeAreaProvider>
  );
}
