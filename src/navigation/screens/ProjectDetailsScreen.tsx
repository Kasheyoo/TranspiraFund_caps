import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useProjectDetailsPresenter } from "../../hooks/useProjectDetailsPresenter";
import { MilestoneDetailsView } from "../../views/MilestoneDetailsView";
import { ProjectDetailsView } from "../../views/ProjectDetailsView";

type ProjectDetailsParams = {
  ProjectDetails: { projectId: string };
};

export function ProjectDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProjectDetailsParams, "ProjectDetails">>();
  const { projectId } = route.params;

  const { data, actions } = useProjectDetailsPresenter(
    projectId,
    () => navigation.goBack(),
  );

  if (data.selectedMilestone) {
    return <MilestoneDetailsView data={data as any} actions={actions as any} />;
  }

  return (
    <ProjectDetailsView
      data={data}
      actions={actions}
      onBack={actions.goBack}
    />
  );
}
