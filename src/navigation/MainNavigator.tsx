import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect, useState } from "react";
import { BottomNavBar } from "../components/BottomNavBar";
import { NotificationService } from "../services/NotificationService";
import { DashboardScreen } from "./screens/DashboardScreen";
import { NotificationsScreen } from "./screens/NotificationsScreen";
import { ProjectDetailsScreen } from "./screens/ProjectDetailsScreen";
import { ProjectListScreen } from "./screens/ProjectListScreen";
import { AboutAppScreen } from "./screens/AboutAppScreen";
import { HelpCenterScreen } from "./screens/HelpCenterScreen";
import { ProfileScreen } from "./screens/ProfileScreen";
import { SettingsScreen } from "./screens/SettingsScreen";
import { AuditTrailScreen } from "./screens/AuditTrailScreen";
import { ROUTES } from "./routes";

const Tab = createBottomTabNavigator();
const DashboardStack = createNativeStackNavigator();
const ProjectsStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function DashboardNavigator() {
  return (
    <DashboardStack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <DashboardStack.Screen name="DashboardHome" component={DashboardScreen} />
      <DashboardStack.Screen name={ROUTES.AUDIT_TRAIL} component={AuditTrailScreen} />
    </DashboardStack.Navigator>
  );
}

function ProjectsNavigator() {
  return (
    <ProjectsStack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <ProjectsStack.Screen name={ROUTES.PROJECT_LIST} component={ProjectListScreen} />
      <ProjectsStack.Screen name={ROUTES.PROJECT_DETAILS} component={ProjectDetailsScreen} />
    </ProjectsStack.Navigator>
  );
}

function SettingsNavigator() {
  return (
    <SettingsStack.Navigator screenOptions={{ headerShown: false, animation: "slide_from_right" }}>
      <SettingsStack.Screen name="SettingsHome" component={SettingsScreen} />
      <SettingsStack.Screen name={ROUTES.PROFILE} component={ProfileScreen} />
      <SettingsStack.Screen name={ROUTES.HELP_CENTER} component={HelpCenterScreen} />
      <SettingsStack.Screen name={ROUTES.ABOUT_APP} component={AboutAppScreen} />
      <SettingsStack.Screen name={ROUTES.AUDIT_TRAIL} component={AuditTrailScreen} />
    </SettingsStack.Navigator>
  );
}

export function MainNavigator() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const unsubscribe = NotificationService.subscribe(
      (items) => setUnreadCount(items.filter((n) => !n.isRead).length),
      () => setUnreadCount(0),
    );
    return unsubscribe;
  }, []);

  return (
    <Tab.Navigator
      screenOptions={{ headerShown: false }}
      tabBar={(props) => (
        <BottomNavBar
          currentScreen={props.state.routes[props.state.index].name}
          onNavigate={(screen) => {
            // Every tab always resets to its root screen
            if (screen === ROUTES.PROJECTS) {
              props.navigation.navigate(ROUTES.PROJECTS, { screen: ROUTES.PROJECT_LIST });
            } else if (screen === ROUTES.SETTINGS) {
              props.navigation.navigate(ROUTES.SETTINGS, { screen: "SettingsHome" });
            } else if (screen === ROUTES.DASHBOARD) {
              props.navigation.navigate(ROUTES.DASHBOARD, { screen: "DashboardHome" });
            } else {
              props.navigation.navigate(screen);
            }
          }}
          notificationCount={unreadCount}
        />
      )}
    >
      <Tab.Screen name={ROUTES.DASHBOARD} component={DashboardNavigator} />
      <Tab.Screen name={ROUTES.PROJECTS} component={ProjectsNavigator} />
      <Tab.Screen name={ROUTES.NOTIFICATIONS} component={NotificationsScreen} />
      <Tab.Screen name={ROUTES.SETTINGS} component={SettingsNavigator} />
    </Tab.Navigator>
  );
}
