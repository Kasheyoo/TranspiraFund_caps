import { useEffect, useRef } from "react";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { ProofUploadModal } from "../../components/ProofUploadModal";
import { useProjectDetailsPresenter } from "../../hooks/useProjectDetailsPresenter";
import { MilestoneDetailsView } from "../../views/MilestoneDetailsView";
import { ProjectDetailsView } from "../../views/ProjectDetailsView";

type ProjectDetailsParams = {
  ProjectDetails: { projectId: string; milestoneId?: string };
};

export function ProjectDetailsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<ProjectDetailsParams, "ProjectDetails">>();
  const { projectId, milestoneId } = route.params;

  const { data, actions } = useProjectDetailsPresenter(
    projectId,
    () => navigation.goBack(),
  );

  const autoSelectedRef = useRef(false);
  useEffect(() => {
    if (autoSelectedRef.current) return;
    if (!milestoneId) return;
    const ms = data.project?.milestones?.find((m) => m.id === milestoneId);
    if (ms) {
      autoSelectedRef.current = true;
      actions.onSelectMilestone(ms);
    }
  }, [milestoneId, data.project, actions]);

  useEffect(() => {
    if (!data.selectedMilestone) return;
    const unsub = navigation.addListener("beforeRemove", (e: any) => {
      e.preventDefault();
      actions.onSelectMilestone(null);
    });
    return unsub;
  }, [navigation, data.selectedMilestone, actions]);

  const upload = data.proofUpload;

  return (
    <>
      {data.selectedMilestone ? (
        <MilestoneDetailsView data={data as any} actions={actions as any} />
      ) : (
        <ProjectDetailsView
          data={data}
          actions={actions}
          onBack={actions.goBack}
        />
      )}
      <ProofUploadModal
        visible={upload !== null}
        stage={upload?.stage ?? "preparing"}
        percent={upload?.percent ?? 0}
        error={upload?.error}
        onRetry={actions.onRetryProofUpload}
        onDismiss={actions.onDismissProofUpload}
      />
    </>
  );
}
