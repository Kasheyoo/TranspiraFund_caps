import { useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebaseConfig';
import { ref, update, get } from 'firebase/database';
import { generateMilestonesLocal } from '../services/LocalAiService';

export const useMilestonesPresenter = (projectId, onFinish) => {
  const [milestones, setMilestones] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [projectInfo, setProjectInfo] = useState({ title: '', category: '', targetDate: '' });

  // 1. Fetch Project Details on Init
  useEffect(() => {
    if (projectId) {
      const fetchDetails = async () => {
        const snapshot = await get(ref(db, `Projects/${projectId}`));
        if (snapshot.exists()) {
          const data = snapshot.val();
          setProjectInfo({
            title: data.title,
            category: data.category,
            targetDate: data.targetDate
          });
        }
      };
      fetchDetails();
    }
  }, [projectId]);

  // 2. Trigger AI Generation
  const generateWithAI = async () => {
    if (!projectInfo.title) {
      Alert.alert("Error", "Could not load project details.");
      return;
    }

    setIsLoading(true);
    try {
      const aiMilestones = await generateMilestonesLocal(
        projectInfo.title,
        projectInfo.category,
        projectInfo.targetDate
      );
      setMilestones(aiMilestones);
    } catch (error) {
      Alert.alert("Error", "Failed to generate milestones.");
    } finally {
      setIsLoading(false);
    }
  };

  const addMilestone = () => {
    setMilestones([...milestones, { title: '', targetDate: '', status: 'Pending' }]);
  };

  const removeMilestone = (index) => setMilestones(milestones.filter((_, i) => i !== index));

  const updateMilestone = (index, field, value) => {
    const updated = [...milestones];
    updated[index][field] = value;
    setMilestones(updated);
  };

  // 3. Save to Database
  const onSaveAndFinish = async () => {
    if (milestones.length === 0) {
      Alert.alert("Empty", "Please generate or add at least one milestone.");
      return;
    }
    if (milestones.some(m => !m.title)) {
      Alert.alert("Missing Data", "Please name all your milestones.");
      return;
    }

    setIsLoading(true);
    try {
      // Updates the 'milestones' node under this specific project
      const projectRef = ref(db, `Projects/${projectId}`);
      await update(projectRef, { milestones: milestones });

      Alert.alert("Success", "Project setup complete!");
      onFinish();
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: { milestones, isLoading },
    actions: { addMilestone, removeMilestone, updateMilestone, onSaveAndFinish, generateWithAI }
  };
};