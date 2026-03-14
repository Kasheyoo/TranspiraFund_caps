import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { LandingScreen } from "./screens/LandingScreen";
import { LoginScreen } from "./screens/LoginScreen";
import { ROUTES } from "./routes";

const Stack = createNativeStackNavigator();

export function AuthNavigator() {
  return (
    <Stack.Navigator
      initialRouteName={ROUTES.LOGIN}
      screenOptions={{ headerShown: false }}
    >
      <Stack.Screen name={ROUTES.LANDING} component={LandingScreen} />
      <Stack.Screen name={ROUTES.LOGIN} component={LoginScreen} />
    </Stack.Navigator>
  );
}
