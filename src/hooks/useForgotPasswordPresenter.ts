import { sendPasswordResetEmail } from "firebase/auth";
import { collection, getDocs, query, where } from "firebase/firestore";
import { useState } from "react";
import { Alert } from "react-native";
import { auth, db } from "../firebaseConfig";

export const useForgotPasswordPresenter = (onClose: () => void) => {
  const [employeeId, setEmployeeId] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleEmployeeIdChange = (text: string) => {
    setEmployeeId(text);
  };

  const handleResetPassword = async () => {
    if (!employeeId.trim()) {
      Alert.alert("Error", "Please enter your Employee ID");
      return;
    }

    setIsLoading(true);
    try {
      const usersRef = collection(db, "users");
      const q = query(usersRef, where("uid", "==", employeeId.trim()));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const userEmail = userData.email as string;

        await sendPasswordResetEmail(auth, userEmail);

        Alert.alert(
          "Success",
          `Password reset link has been sent to ${userEmail}`,
          [
            {
              text: "OK",
              onPress: () => {
                setEmployeeId("");
                onClose();
              },
            },
          ],
        );
      } else {
        Alert.alert("Error", "Employee ID not found");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      Alert.alert("Error", (error as Error).message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEmployeeId("");
    onClose();
  };

  return {
    data: { employeeId, isLoading },
    actions: { handleEmployeeIdChange, handleResetPassword, handleCancel },
  };
};
