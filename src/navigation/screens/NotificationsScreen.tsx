import { useNotificationPresenter } from "../../hooks/useNotificationPresenter";
import { NotificationsView } from "../../views/NotificationsView";

export function NotificationsScreen() {
  const { data, actions } = useNotificationPresenter();
  return <NotificationsView data={data} actions={actions} />;
}
