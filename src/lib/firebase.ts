import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDVtuORBblfef5Eu8kgWARjv2uA83q-rWc",
  authDomain: "autocheck-9bc9f.firebaseapp.com",
  projectId: "autocheck-9bc9f",
  storageBucket: "autocheck-9bc9f.firebasestorage.app",
  messagingSenderId: "6715168925",
  appId: "1:6715168925:web:f52108ecda5d4fd8c21c74",
  measurementId: "G-QBGTQRNSVB"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);