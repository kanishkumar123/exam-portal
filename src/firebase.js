// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDmLqsJTI9o5PDeRPeziwfLC5LgoLlhdds",
  authDomain: "variyar-1b71e.firebaseapp.com",
  projectId: "variyar-1b71e",
  storageBucket: "variyar-1b71e.firebasestorage.app",
  messagingSenderId: "784254383187",
  appId: "1:784254383187:web:27c55cd75b8ff07a1b02a6",
  measurementId: "G-YEGK38KL8L",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// helper: create user profile in Firestore
export async function createUserProfile(user, role = "student") {
  const userRef = doc(db, "users", user.uid);
  await setDoc(userRef, {
    uid: user.uid,
    email: user.email,
    role,
    createdAt: new Date(),
  });
}

// helper: fetch the user profile
export async function fetchUserProfile(uid) {
  const userSnap = await getDoc(doc(db, "users", uid));
  return userSnap.exists() ? userSnap.data() : null;
}
