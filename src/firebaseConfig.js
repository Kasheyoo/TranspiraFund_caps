import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// Configuration extracted from your google-services.json
const firebaseConfig = {
  apiKey: "AIzaSyDz5FGxdIJqlmYgzskwrw3_82Ivf3Icf7c",
  authDomain: "transpirafund-cf15b.firebaseapp.com",
  projectId: "transpirafund-cf15b",
  storageBucket: "transpirafund-cf15b.firebasestorage.app",
  messagingSenderId: "427541163832",
  appId: "1:427541163832:android:f5f3d98fc797ec052c9bcd",
  // Standard Realtime Database URL format
  databaseURL: "https://transpirafund-cf15b-default-rtdb.firebaseio.com"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Export Realtime Database for use in Presenters
export const db = getDatabase(app);