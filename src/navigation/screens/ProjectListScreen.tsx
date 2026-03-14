import { useNavigation } from "@react-navigation/native";
import { useProjectListPresenter } from "../../hooks/useProjectListPresenter";
import { ProjectListView } from "../../views/ProjectListView";
import { ROUTES } from "../routes";

export function ProjectListScreen() {
  const navigation = useNavigation<any>();

  const { data, actions } = useProjectListPresenter(
    (projectId) => navigation.navigate(ROUTES.PROJECT_DETAILS, { projectId }),
    () => navigation.navigate(ROUTES.DASHBOARD),
  );

  return <ProjectListView data={data} actions={actions} />;
}
