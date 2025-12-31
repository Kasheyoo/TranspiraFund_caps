import React, { useState } from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Views
import { LandingView } from './src/views/LandingView';
import { LoginView } from './src/views/LoginView';
import { DashboardView } from './src/views/DashboardView';
import { ProfileView } from './src/views/ProfileView';
import { ProjectsView } from './src/views/ProjectsView';
import { AddProjectView } from './src/views/AddProjectView';
import { GenerateMilestonesView } from './src/views/GenerateMilestonesView';
import { ProjectDetailsView } from './src/views/ProjectDetailsView';

// Presenters
import { useLoginPresenter } from './src/presenters/useLoginPresenter';
import { useDashboardPresenter } from './src/presenters/useDashboardPresenter';
import { useProfilePresenter } from './src/presenters/useProfilePresenter';
import { useProjectsPresenter } from './src/presenters/useProjectsPresenter';
import { useAddProjectPresenter } from './src/presenters/useAddProjectPresenter';
import { useMilestonesPresenter } from './src/presenters/useMilestonesPresenter';
import { useProjectDetailsPresenter } from './src/presenters/useProjectDetailsPresenter';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Landing');
  const [activeProjectId, setActiveProjectId] = useState(null);

  // Unified Navigation Handler
  const handleNavigate = (screen, param = null) => {
    if (param) setActiveProjectId(param);
    setCurrentScreen(screen);
  };

  // Initialize Presenters
  const loginPresenter = useLoginPresenter(setCurrentScreen);
  const dashboardPresenter = useDashboardPresenter((screen) => setCurrentScreen(screen));

  // Projects List Presenter
  const projectsPresenter = useProjectsPresenter(handleNavigate);

  // Project Details Presenter
  const projectDetailsPresenter = useProjectDetailsPresenter(
    activeProjectId,
    () => setCurrentScreen('Projects')
  );

  const profilePresenter = useProfilePresenter(
    () => setCurrentScreen('Dashboard'),
    () => setCurrentScreen('Landing')
  );

  // Add Project Flow
  const addProjectPresenter = useAddProjectPresenter((newId) => {
    setActiveProjectId(newId);
    setCurrentScreen('GenerateMilestones');
  });

  const milestonesPresenter = useMilestonesPresenter(activeProjectId, () => {
    setCurrentScreen('Projects');
  });

  const renderScreen = () => {
    switch (currentScreen) {
      case 'Landing': return <LandingView onGetStarted={() => setCurrentScreen('Login')} />;
      case 'Login': return <LoginView data={loginPresenter.data} actions={loginPresenter.actions} onBack={() => setCurrentScreen('Landing')} />;
      case 'Dashboard': return <DashboardView data={dashboardPresenter.data} actions={dashboardPresenter.actions} />;

      // Projects & Details
      case 'Projects':
        return <ProjectsView data={projectsPresenter.data} actions={{...projectsPresenter.actions, navigate: handleNavigate}} />;
      case 'ProjectDetails':
        return <ProjectDetailsView data={projectDetailsPresenter.data} actions={projectDetailsPresenter.actions} onBack={() => setCurrentScreen('Projects')} />;

      // Profile
      case 'Profile': return <ProfileView onBack={profilePresenter.actions.goBack} onLogout={profilePresenter.actions.logout} />;

      // Add Project Flow
      case 'AddProject':
        return <AddProjectView data={addProjectPresenter.data} actions={addProjectPresenter.actions} onBack={() => setCurrentScreen('Projects')} />;
      case 'GenerateMilestones':
        return <GenerateMilestonesView data={milestonesPresenter.data} actions={milestonesPresenter.actions} />;

      default: return <DashboardView data={dashboardPresenter.data} actions={dashboardPresenter.actions} />;
    }
  };

  return (
    <SafeAreaProvider>
      <StatusBar barStyle={currentScreen === 'Dashboard' ? "light-content" : "dark-content"} />
      {renderScreen()}
    </SafeAreaProvider>
  );
}