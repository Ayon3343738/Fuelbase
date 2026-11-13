import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyChqtSAjRXAkTEdichWS-VdcduPQRJT5P0",
  authDomain: "qrapp-b8d1c.firebaseapp.com",
  databaseURL: "https://qrapp-b8d1c-default-rtdb.firebaseio.com",
  projectId: "qrapp-b8d1c",
  storageBucket: "qrapp-b8d1c.firebasestorage.app",
  messagingSenderId: "404248340310",
  appId: "1:404248340310:web:52448cfdb9e04d105498f7",
  measurementId: "G-8PB5K81G06",
};

// Initialize Firebase

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
