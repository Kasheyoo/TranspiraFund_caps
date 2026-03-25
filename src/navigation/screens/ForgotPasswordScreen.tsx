import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ForgotPasswordView } from "../../views/ForgotPasswordView";
import { ForgotPasswordOTPView } from "../../views/ForgotPasswordOTPView";
import { NewPasswordView } from "../../views/NewPasswordView";
import { useForgotPasswordPresenter } from "../../hooks/useForgotPasswordPresenter";

export function ForgotPasswordScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const goBack = () => navigation.goBack();

  const { step, email, isLoading, isSending, error, resendSeconds, actions } =
    useForgotPasswordPresenter();

  // Step 2 — OTP code entry
  if (step === "otp") {
    return (
      <ForgotPasswordOTPView
        email={email}
        isLoading={isLoading}
        isSending={isSending}
        errorMessage={error}
        resendSeconds={resendSeconds}
        onSubmit={actions.onVerifyCode}
        onResend={actions.onResendCode}
        onBack={actions.onBackToEmail}
      />
    );
  }

  // Step 3 — Set new password
  if (step === "password") {
    return (
      <NewPasswordView
        actions={{ onConfirmNewPassword: actions.onResetPassword }}
        isLoading={isLoading}
        showCurrentPassword={false}
        errorMessage={error}
      />
    );
  }

  // Step 1 (email entry) + Step 4 (success) — handled by ForgotPasswordView
  return (
    <ForgotPasswordView
      onBack={goBack}
      onSend={actions.onSendCode}
      isLoading={isLoading}
      isSent={step === "success"}
    />
  );
}
