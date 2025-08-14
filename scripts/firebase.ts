// scripts/firebase.ts
import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: thay bằng config của bạn trong Firebase console
const firebaseConfig = {
  apiKey: "AIzaSyDv1AQ1AJoc2sM8GCPvGV5qmNZ4b-TNC-w",
  authDomain: "math-master-f4c7e.firebaseapp.com",
  projectId: "math-master-f4c7e",
  storageBucket: "math-master-f4c7e.firebasestorage.app",
  messagingSenderId: "161585192269",
  appId: "1:161585192269:web:33ac0dd5eb343cc9546b04",
  measurementId: "G-HGJVC2NJME"
};


const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
