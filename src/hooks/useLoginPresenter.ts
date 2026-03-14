import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { auth } from "../firebaseConfig";

export const useLoginPresenter = (navigationCallback?: () => void) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const sEmail = await AsyncStorage.getItem("saved_email");
        if (sEmail) {
          setEmail(sEmail);
          setRememberMe(true);
        }
      } catch (e) {
        console.error("AsyncStorage Load Error:", e);
      }
    };
    load();
  }, []);

  const onLogin = async () => {
    setErrorMessage("");
    if (!email || !password) {
      setErrorMessage("Enter email and password.");
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage("Enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      if (rememberMe) {
        await AsyncStorage.setItem("saved_email", email.trim());
      } else {
        await AsyncStorage.removeItem("saved_email");
      }
      if (navigationCallback) navigationCallback();
    } catch (error) {
      const err = error as { code?: string };
      if (err.code === "auth/invalid-email")
        setErrorMessage("Invalid email format.");
      else if (
        err.code === "auth/user-not-found" ||
        err.code === "auth/invalid-credential"
      )
        setErrorMessage("Account not found or password incorrect.");
      else setErrorMessage("Authentication failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = async (resetEmail?: string) => {
    const targetEmail = resetEmail || email;
    if (!targetEmail) {
      Alert.alert("Input Required", "Enter your email address to receive a link.");
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
    } catch {
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
