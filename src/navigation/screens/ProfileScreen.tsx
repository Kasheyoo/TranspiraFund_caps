import { useNavigation } from "@react-navigation/native";
import { useProfilePresenter } from "../../hooks/useProfilePresenter";
import { ProfileView } from "../../views/ProfileView";

export function ProfileScreen() {
  const navigation = useNavigation<any>();

  const { data, actions } = useProfilePresenter(() => navigation.goBack());

  return <ProfileView data={data} actions={actions} />;
}
