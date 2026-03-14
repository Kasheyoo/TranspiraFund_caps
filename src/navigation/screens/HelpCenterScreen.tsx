import { useNavigation } from "@react-navigation/native";
import { HelpCenterView } from "../../views/HelpCenterView";

export function HelpCenterScreen() {
  const navigation = useNavigation<any>();
  return <HelpCenterView onBack={() => navigation.goBack()} />;
}
