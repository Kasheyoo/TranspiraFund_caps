import { useState } from 'react';
import { Alert } from 'react-native';
import { UserModel } from '../models/UserModel';
import { db } from '../firebaseConfig';
import { ref, query, orderByChild, equalTo, get, update } from 'firebase/database';

export const useLoginPresenter = (navigation) => {
  const [user, setUser] = useState(new UserModel()); // user.email will act as the "ID" input
  const [isRemembered, setIsRemembered] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Modal States
  const [isChangePassVisible, setChangePassVisible] = useState(false);
  const [tempUserKey, setTempUserKey] = useState(null); // Stores 'depw_1' key temporarily

  const handleEmailChange = (text) => setUser({ ...user, email: text }); // This is the ID input
  const handlePasswordChange = (text) => setUser({ ...user, password: text });
  const toggleRemember = () => setIsRemembered(!isRemembered);

  // --- 1. LOGIN LOGIC ---
  const onLogin = async () => {
    if (!user.email || !user.password) {
      Alert.alert("Error", "Please enter ID and password.");
      return;
    }

    setIsLoading(true);
    try {
      // Query the database for the user with this ID
      const usersRef = ref(db, 'User');
      const q = query(usersRef, orderByChild('id'), equalTo(user.email));
      const snapshot = await get(q);

      if (snapshot.exists()) {
        // User found! Get the data.
        const data = snapshot.val();
        const key = Object.keys(data)[0]; // e.g., "depw_1"
        const userData = data[key];

        // Check Password (Note: In production, never store plain text passwords!)
        if (String(userData.password) === user.password) {

          // CHECK: Is this First Time Access?
          if (userData.firstTimeAccess === true) {
            setTempUserKey(key); // Save key (depw_1) to update later
            setChangePassVisible(true); // Show the Force Change Password Modal
          } else {
            navigation('Dashboard'); // Normal Login
          }
        } else {
          Alert.alert("Login Failed", "Incorrect password.");
        }
      } else {
        Alert.alert("Login Failed", "User ID not found.");
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. UPDATE PASSWORD LOGIC ---
  const onUpdatePassword = async (newPass, confirmPass) => {
    if (newPass !== confirmPass) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }
    if (newPass.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setIsLoading(true);
    try {
      // Update DB: Set new password and turn off firstTimeAccess
      const userRef = ref(db, `User/${tempUserKey}`);
      await update(userRef, {
        password: newPass, // In real apps, hash this!
        firstTimeAccess: false
      });

      Alert.alert("Success", "Password updated! You are now logged in.");
      setChangePassVisible(false);
      navigation('Dashboard');
    } catch (error) {
      Alert.alert("Update Failed", error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    data: { user, isRemembered, isLoading, isChangePassVisible },
    actions: {
      handleEmailChange,
      handlePasswordChange,
      toggleRemember,
      onLogin,
      onUpdatePassword,
      closeModal: () => setChangePassVisible(false)
    }
  };
};