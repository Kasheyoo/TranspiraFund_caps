import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ROUTES } from "../../navigation/routes";
import { useLoginPresenter } from "../../hooks/useLoginPresenter";
import { LoginView } from "../../views/LoginView";

export function LoginScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { data, actions } = useLoginPresenter();

  const enhancedActions = {
    ...actions,
    onNavigateToForgotPassword: () => {
      actions.clearError();
      navigation.navigate(ROUTES.FORGOT_PASSWORD);
    },
  };

  return <LoginView data={data} actions={enhancedActions} />;
}
