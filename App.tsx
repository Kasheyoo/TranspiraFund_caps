import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { useRef } from "react";
import { StatusBar, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider, useAuth } from "./src/context/AuthContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { ScreenErrorBoundary } from "./src/components/ScreenErrorBoundary";

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0F766E",
    card: "#0F766E",
  },
};

const ACTIVITY_THROTTLE_MS = 5000;

function ActivityTracker({ children }: { children: React.ReactNode }) {
  const { resetActivity } = useAuth();
  const lastTouchRef = useRef(0);

  const handleTouch = () => {
    const now = Date.now();
    if (now - lastTouchRef.current >= ACTIVITY_THROTTLE_MS) {
      lastTouchRef.current = now;
      resetActivity();
    }
  };

  return (
    <View style={{ flex: 1 }} onTouchStart={handleTouch}>
      {children}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer theme={AppTheme}>
          <StatusBar barStyle="light-content" backgroundColor="#0F766E" />
          <ActivityTracker>
            <ScreenErrorBoundary>
              <AppNavigator />
            </ScreenErrorBoundary>
          </ActivityTracker>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
