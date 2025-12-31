import { useState, useEffect } from 'react';
import { ProjectModel } from '../models/ProjectModel';

export const useDashboardPresenter = (onNavigate) => {
  const [stats, setStats] = useState({ active: 0, issues: 0, done: 0 });
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    const fetchedProjects = [
      new ProjectModel(1, 'Concreting of Purok 3 Pathway', 'Active', 'INFRASTRUCTURE', 'RockSolid Inc.', 'Dec 30', '850k', 65, 'ONGOING'),
      new ProjectModel(2, 'Solar Street Lamp Installation', 'Issues', 'UTILITY', 'BrightLights', 'Jan 15', '450k', 15, 'DELAYED'),
    ];
    setProjects(fetchedProjects);
    setStats({
      active: fetchedProjects.filter(p => p.status === 'Active').length,
      issues: fetchedProjects.filter(p => p.status === 'Issues').length,
      done: fetchedProjects.filter(p => p.status === 'Done').length,
    });
  }, []);

  const handleNavigate = (screen) => { if (onNavigate) onNavigate(screen); };
  return { data: { stats, projects }, actions: { navigate: handleNavigate } };
};