import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCallback, useEffect, useState } from "react";
import { BottomNavBar } from "../components/BottomNavBar";
import { NotificationService } from "../services/NotificationService";
import { getCurrentUserId } from "../utils/authGuard";
import { DashboardScreen } from "./screens/DashboardScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ProjectDetailsScreen } from "./screens/ProjectDetailsScreen";
import { ProjectListScreen } from "./screens/ProjectListScreen";
import { AboutAppScreen } from "./screens/AboutAppScreen";
import { HelpCenterScreen } from "./screens/HelpCenterScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { ROUTES } from "./routes";

const Tab = createBottomTabNavigator();
const ProjectsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false }}>
      <ProjectsStack.Screen name={ROUTES.PROJECT_LIST} component={ProjectListScreen} />
      <ProjectsStack.Screen name={ROUTES.PROJECT_DETAILS} component={ProjectDetailsScreen} />
    </ProjectsStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false }}>
      <SettingsStack.Screen name={ROUTES.SETTINGS} component={SettingsScreen} />
      <SettingsStack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
      <SettingsStack.Screen name={ROUTES.HELP_CENTER} component={HelpCenterScreen} />
      <SettingsStack.Screen name={ROUTES.ABOUT_APP} component={AboutAppScreen} />
    </SettingsStack.Navigator>
  );
}

export function MainNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!getCurrentUserId()) return;
    try {
      const notifications = await NotificationService.getAll();
      const unread = notifications.filter((n) => n.status === "Unread").length;
      setUnreadCount(unread);
    } catch {
      // Silently fail for badge count
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000); // Refresh every minute
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <BottomNavBar
          currentScreen={props.state.routes[props.state.index].name}
          onNavigate={(screen) => {
            props.navigation.navigate(screen);
            if (screen === "Notifications") {
              // Refresh count when navigating to notifications
              setTimeout(fetchUnreadCount, 1000);
            }
          }}
          notificationCount={unreadCount}
        />
      )}
    >
      <Tab.Screen name={ROUTES.DASHBOARD} component={DashboardScreen} />
      <Tab.Screen name={ROUTES.PROJECTS} component={ProjectsNavigator} />
      <Tab.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Tab.Screen name={ROUTES.SETTINGS} component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
