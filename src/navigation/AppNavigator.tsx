import { ActivityIndicator, View } from "react-native";
import { COLORS } from "../constants/colors";
import { useAuth } from "../context/AuthContext";
import { AuthNavigator } from "./AuthNavigator";
import { MainNavigator } from "./MainNavigator";

export function AppNavigator() {
  const { user } = useAuth();

  if (user === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return user ? <MainNavigator /> : <AuthNavigator />;
}
