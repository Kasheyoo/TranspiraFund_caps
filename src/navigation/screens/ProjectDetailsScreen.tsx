import { useEffect } from "react";
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

  // Hardware back / edge-swipe while a milestone is selected should close the
  // milestone sub-view, not pop the stack back to Project List. Only arm the
  // interceptor while selectedMilestone is non-null so normal back from the
  // main project view still pops to the list as expected.
  useEffect(() => {
    if (!data.selectedMilestone) return;
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      e.preventDefault();
      actions.onSelectMilestone(null);
    });
    return unsub;
  }, [navigation, data.selectedMilestone, actions]);

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
