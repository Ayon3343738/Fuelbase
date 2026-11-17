import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import { getApp, getApps, initializeApp } from "firebase/app";
import {
  getAuth,
  getReactNativePersistence,
  initializeAuth,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

const firebaseConfig = {
  apiKey: "AIzaSyChqtSAjRXAkTEdichWS-VdcduPQRJT5P0",
  authDomain: "qrapp-b8d1c.firebaseapp.com",
  projectId: "qrapp-b8d1c",
  storageBucket: "qrapp-b8d1c.firebasestorage.app",
  messagingSenderId: "404248340310",
  appId: "1:404248340310:web:0d16de02abb007c65498f7",
};

const isNew = getApps().length === 0;
const app = isNew ? initializeApp(firebaseConfig) : getApp();

let auth;
if (Platform.OS === "web" || !isNew) {
  auth = getAuth(app);
} else {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(ReactNativeAsyncStorage),
  });
}

const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
