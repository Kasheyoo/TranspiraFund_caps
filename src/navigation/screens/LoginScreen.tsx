import { useLoginPresenter } from "../../hooks/useLoginPresenter";
import { LoginView } from "../../views/LoginView";

export function LoginScreen() {
  const { data, actions } = useLoginPresenter();
  return <LoginView data={data} actions={actions} />;
}
