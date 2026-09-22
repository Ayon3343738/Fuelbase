import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

import firebase from "firebase/compat/app";
import "firebase/compat/auth";

const firebaseConfig = {
  apiKey: "AIzaSyChqtSAjRXAkTEdichWS-VdcduPQRJT5P0",
  authDomain: "qrapp-b8d1c.firebaseapp.com",
  projectId: "qrapp-b8d1c",
  storageBucket: "qrapp-b8d1c.firebasestorage.app",
  messagingSenderId: "404248340310",
  appId: "1:404248340310:web:0d16de02abb007c65498f7",
};

// ✅ IMPORTANT: prevent duplicate app initialization
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const db = getFirestore(app);
const auth = getAuth(app);

export { app, auth, db };

