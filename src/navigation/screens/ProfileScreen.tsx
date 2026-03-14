import { useNavigation } from "@react-navigation/native";
import { signOut } from "firebase/auth";
import { auth } from "../../firebaseConfig";
import { useProfilePresenter } from "../../hooks/useProfilePresenter";
import { ProfileView } from "../../views/ProfileView";

export function ProfileScreen() {
  const navigation = useNavigation<any>();

  const { data, actions } = useProfilePresenter(
    () => navigation.goBack(),
    () => signOut(auth),
  );

  return <ProfileView data={data} actions={actions} />;
}
