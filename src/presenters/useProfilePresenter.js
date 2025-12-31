import { Alert } from 'react-native';

export const useProfilePresenter = (onBack, onLogoutSuccess) => {
  const handleLogout = () => {
    Alert.alert("Sign Out", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Log Out", style: "destructive", onPress: () => onLogoutSuccess() }
    ]);
  };
  return { actions: { goBack: onBack, logout: handleLogout } };
};