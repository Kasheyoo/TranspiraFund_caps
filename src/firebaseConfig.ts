import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { CustomProvider, initializeAppCheck } from "firebase/app-check";
import { initializeApp } from "firebase/app";
import { getReactNativePersistence, initializeAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

if (__DEV__) {
  (globalThis as Record<string, unknown>).FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const firebaseConfig = {
  apiKey: "AIzaSyBznumKpktI9C71TOBlvXi6VOO0JpwB2gY",
  authDomain: "transpirafund-webapp.firebaseapp.com",
  projectId: "transpirafund-webapp",
  storageBucket: "transpirafund-webapp.firebasestorage.app",
  messagingSenderId: "693869638538",
  appId: "1:693869638538:web:2ef6730f38dd5a31248e73",
  measurementId: "G-0DSYB9ZDWL",
};

const app = initializeApp(firebaseConfig);

export const appCheck = initializeAppCheck(app, {
  provider: new CustomProvider({
    getToken: () =>
      Promise.resolve({
        token: "stub-token-monitoring-mode-only",
        expireTimeMillis: Date.now() + 60 * 60 * 1000,
      }),
  }),
  isTokenAutoRefreshEnabled: true,
});

export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const storage = getStorage(app);

export default app;
