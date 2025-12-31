import { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { ref, onValue } from 'firebase/database';

export const useProjectsPresenter = (onNavigate) => {
  const [activeTab, setActiveTab] = useState('Active');
  const [searchQuery, setSearchQuery] = useState('');
  const [projects, setProjects] = useState([]);

  // Fetch Projects from Firebase
  useEffect(() => {
    const projectsRef = ref(db, 'Projects');

    // onValue listener updates automatically whenever data changes
    const unsubscribe = onValue(projectsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert Firebase object to Array
        const loadedProjects = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setProjects(loadedProjects);
      } else {
        setProjects([]);
      }
    });

    return () => unsubscribe();
  }, []);

  const filteredProjects = projects.filter(p => {
    // If activeTab is 'Active', show 'Active' status. If 'Pending', show 'Pending', etc.
    const matchesTab = activeTab === 'All' ? true : p.status === activeTab;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  return {
    data: { projects: filteredProjects, activeTab, searchQuery, counts: { pending: 0, issues: 0 } },
    actions: { setActiveTab, setSearchQuery, navigate: onNavigate }
  };
};