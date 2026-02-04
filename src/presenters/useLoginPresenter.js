import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { auth } from "../firebaseConfig";

export const useLoginPresenter = (navigationCallback) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);

  // 1. Load Saved Credentials
  useEffect(() => {
    const load = async () => {
      try {
        const sEmail = await AsyncStorage.getItem("saved_email");
        const sPass = await AsyncStorage.getItem("saved_password");
        if (sEmail && sPass) {
          setEmail(sEmail);
          setPassword(sPass);
          setRememberMe(true);
        }
      } catch (e) {
        console.error("AsyncStorage Load Error:", e);
      }
    };
    load();
  }, []);

  // 2. Login Logic
  const onLogin = async () => {
    setErrorMessage("");
    if (!email || !password) {
      setErrorMessage("Enter email and password.");
      return;
    }
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) {
        await AsyncStorage.setItem("saved_email", email);
        await AsyncStorage.setItem("saved_password", password);
      } else {
        await AsyncStorage.multiRemove(["saved_email", "saved_password"]);
      }
      if (navigationCallback) navigationCallback();
    } catch (error) {
      if (error.code === "auth/invalid-email")
        setErrorMessage("Invalid email format.");
      else if (
        error.code === "auth/user-not-found" ||
        error.code === "auth/invalid-credential"
      )
        setErrorMessage("Account not found or password incorrect.");
      else setErrorMessage("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Request Reset Link (Handled via Firebase Web UI)
  const onForgotPassword = async (resetEmail) => {
    const targetEmail = resetEmail || email;
    if (!targetEmail) {
      Alert.alert(
        "Input Required",
        "Enter your email address to receive a link.",
      );
      return;
    }
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, targetEmail);
      setIsResetModalVisible(false);
      Alert.alert(
        "Reset Link Sent",
        `Check your Gmail inbox for ${targetEmail}. Follow the link to reset your password.`,
      );
    } catch (error) {
      Alert.alert("Error", "Failed to send reset email.");
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: {
      email,
      password,
      rememberMe,
      isLoading,
      errorMessage,
      isResetModalVisible,
    },
    actions: {
      setEmail,
      setPassword,
      setRememberMe,
      setIsResetModalVisible,
      onLogin,
      onForgotPassword,
    },
  };
};
