import { useState } from 'react';
import { Alert } from 'react-native';
import { db } from '../firebaseConfig';
import { ref, push, serverTimestamp } from 'firebase/database';

export const useAddProjectPresenter = (onNavigateToMilestones) => {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [contractor, setContractor] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [budget, setBudget] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const onRegister = async () => {
    if (!title || !category || !contractor || !budget) {
      Alert.alert("Missing Details", "Please fill in all required fields.");
      return;
    }

    setIsLoading(true);
    try {
      const newProject = {
        title,
        category: category.toUpperCase(),
        contractor,
        targetDate: targetDate || 'TBD',
        budget,
        status: 'Active',
        progress: 0,
        badgeType: 'ONGOING',
        createdAt: serverTimestamp()
      };

      // 1. Save Project
      const projectsRef = ref(db, 'Projects');
      const newRef = await push(projectsRef, newProject);

      // 2. Get the new ID (key)
      const newProjectId = newRef.key;

      // 3. Navigate to Phase 2 (Milestones), passing the ID
      Alert.alert("Phase 1 Complete", "Now, let's add the milestones.");
      resetForm();
      onNavigateToMilestones(newProjectId); // Pass ID to next screen

    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setCategory(''); setContractor(''); setTargetDate(''); setBudget('');
  };

  return {
    data: { title, category, contractor, targetDate, budget, isLoading },
    actions: { setTitle, setCategory, setContractor, setTargetDate, setBudget, onRegister }
  };
};