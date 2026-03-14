import { useDashboardPresenter } from "../../hooks/useDashboardPresenter";
import { DashboardView } from "../../views/DashboardView";

export function DashboardScreen() {
  const { data, actions } = useDashboardPresenter();
  return <DashboardView data={data} actions={actions} />;
}
