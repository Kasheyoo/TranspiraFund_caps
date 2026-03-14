import { useNavigation } from "@react-navigation/native";
import { LandingView } from "../../views/LandingView";
import { ROUTES } from "../routes";

export function LandingScreen() {
  const navigation = useNavigation<any>();
  return <LandingView onGetStarted={() => navigation.navigate(ROUTES.LOGIN)} />;
}
