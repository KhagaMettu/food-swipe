/**
 * Firebase client SDK initialization.
 * This file is safe to import in client components.
 * It uses NEXT_PUBLIC_ environment variables which are bundled into the client.
 *
 * Initialization is lazy to prevent errors during Next.js static generation
 * when environment variables may not be available.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "",
};

function getFirebaseApp(): FirebaseApp {
  return getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
}

// Lazy singletons — only initialized when accessed at runtime
let _auth: Auth | null = null;
let _db: Firestore | null = null;

export function getFirebaseAuth(): Auth {
  if (!_auth) _auth = getAuth(getFirebaseApp());
  return _auth;
}

export function getFirebaseDb(): Firestore {
  if (!_db) _db = getFirestore(getFirebaseApp());
  return _db;
}

// Backward-compatible exports for existing code
export const auth: Auth = typeof window !== "undefined" ? getFirebaseAuth() : ({} as Auth);
export const db: Firestore = typeof window !== "undefined" ? getFirebaseDb() : ({} as Firestore);

export default getFirebaseApp;
