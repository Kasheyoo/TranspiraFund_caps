import { useCallback, useState } from "react";

export const useNavigationPresenter = () => {
  const [currentView, setCurrentView] = useState("Dashboard"); // Default view

  const navigateTo = useCallback((viewName) => {
    console.log("Navigating to:", viewName);
    setCurrentView(viewName);
  }, []);

  return {
    currentView,
    actions: { navigateTo },
  };
};
