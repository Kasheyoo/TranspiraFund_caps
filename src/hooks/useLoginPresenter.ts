import AsyncStorage from "@react-native-async-storage/async-storage";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useEffect, useState } from "react";
import { Alert } from "react-native";
import { auth } from "../firebaseConfig";
import { OTPService } from "../services/OTPService";
import {
  isValidEmail,
  loginRateLimiter,
  sanitizeFirebaseError,
  sanitizeInput,
} from "../utils/security";
import { logger } from "../utils/logger";

export const useLoginPresenter = (navigationCallback?: () => void) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [isResetModalVisible, setIsResetModalVisible] = useState(false);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  useEffect(() => {
    const load = async () => {
      try {
        const sEmail = await AsyncStorage.getItem("saved_email");
        if (sEmail) {
          setEmail(sEmail);
          setRememberMe(true);
        }
      } catch (e) {
        logger.error("AsyncStorage Load Error:", e);
      }
    };
    load();
  }, []);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMessage("");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  const onLogin = async () => {
    setErrorMessage("");
    const cleanEmail = sanitizeInput(email, 254);

    if (!cleanEmail || !password) {
      setErrorMessage("Enter email and password.");
      return;
    }

    if (!isValidEmail(cleanEmail)) {
      setErrorMessage("Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    // Rate limiting
    const rateLimitCheck = loginRateLimiter.check(cleanEmail);
    if (!rateLimitCheck.allowed) {
      setLockoutSeconds(rateLimitCheck.lockoutSeconds);
      setErrorMessage(
        `Too many login attempts. Please wait ${rateLimitCheck.lockoutSeconds}s.`,
      );
      return;
    }

    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, cleanEmail, password);
      loginRateLimiter.reset(cleanEmail);
      if (rememberMe) {
        await AsyncStorage.setItem("saved_email", cleanEmail);
      } else {
        await AsyncStorage.removeItem("saved_email");
      }
      if (navigationCallback) navigationCallback();
    } catch (error) {
      const err = error as { code?: string };
      loginRateLimiter.recordAttempt(cleanEmail);

      const check = loginRateLimiter.check(cleanEmail);
      if (!check.allowed) {
        setLockoutSeconds(check.lockoutSeconds);
        setErrorMessage(
          `Account temporarily locked. Try again in ${check.lockoutSeconds}s.`,
        );
      } else {
        setErrorMessage(sanitizeFirebaseError(err.code));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const onForgotPassword = async (resetEmail?: string) => {
    const targetEmail = sanitizeInput(resetEmail || email, 254);
    if (!targetEmail) {
      Alert.alert("Input Required", "Enter your email address to receive a link.");
      return;
    }
    if (!isValidEmail(targetEmail)) {
      Alert.alert("Invalid Email", "Please enter a valid email address.");
      return;
    }
    setIsLoading(true);
    try {
      // Uses web app's sendPasswordReset Cloud Function — branded email via Gmail
      await OTPService.sendPasswordReset(targetEmail);
      setIsResetModalVisible(false);
      Alert.alert(
        "Reset Link Sent",
        "If an account exists for this email, a password reset link has been sent.",
      );
    } catch {
      // Always show generic message — don't reveal if email exists
      setIsResetModalVisible(false);
      Alert.alert(
        "Request Processed",
        "If an account exists for this email, a password reset link has been sent.",
      );
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
      lockoutSeconds,
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
