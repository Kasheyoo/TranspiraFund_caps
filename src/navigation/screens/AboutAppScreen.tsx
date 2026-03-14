import { useNavigation } from "@react-navigation/native";
import { AboutAppView } from "../../views/AboutAppView";

export function AboutAppScreen() {
  const navigation = useNavigation<any>();
  return <AboutAppView onBack={() => navigation.goBack()} />;
}
