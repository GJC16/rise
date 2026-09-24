import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyDa4WcA-yGgY2SGKAXzJqWdnAvRUvU_RBc",
  authDomain: "rise-iot.firebaseapp.com",
  projectId: "rise-iot",
  storageBucket: "rise-iot.firebasestorage.app",
  messagingSenderId: "522550086491",
  appId: "1:522550086491:web:3e2d25b1986fad5b61687e"
};

const app = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);
