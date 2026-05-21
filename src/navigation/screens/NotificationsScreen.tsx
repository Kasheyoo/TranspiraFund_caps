import { useNavigation } from "@react-navigation/native";
import { useNotificationPresenter } from "../../hooks/useNotificationPresenter";
import { NotificationsView } from "../../views/NotificationsView";
import { ROUTES } from "../routes";

export function NotificationsScreen() {
  const navigation = useNavigation<any>();

  const { data, actions } = useNotificationPresenter({
    onNavigateToProject: (projectId: string) => {
      navigation.navigate(ROUTES.PROJECTS, {
        screen: ROUTES.PROJECT_DETAILS,
        params: { projectId },
      });
    },
    onNavigateToMilestone: (projectId: string, milestoneId: string) => {
      navigation.navigate(ROUTES.PROJECTS, {
        screen: ROUTES.PROJECT_DETAILS,
        params: { projectId, milestoneId },
      });
    },
    onNavigateToAuditTrail: () => {
      navigation.navigate(ROUTES.SETTINGS, {
        screen: ROUTES.AUDIT_TRAIL,
      });
    },
    onNavigateToProfile: () => {
      navigation.navigate(ROUTES.SETTINGS, {
        screen: ROUTES.PROFILE,
      });
    },
    onNavigateToSettings: () => {
      navigation.navigate(ROUTES.SETTINGS, {
        screen: "SettingsHome",
      });
    },
  });

  return <NotificationsView data={data} actions={actions} />;
}
