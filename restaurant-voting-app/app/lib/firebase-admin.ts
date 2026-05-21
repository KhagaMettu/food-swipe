/**
 * Firebase Admin SDK initialization.
 * SERVER-ONLY: This file must never be imported by client components.
 * It is only safe to use in Server Actions and API routes.
 */

import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth, type Auth } from "firebase-admin/auth";

function getAdminApp(): App {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Missing Firebase Admin SDK environment variables. " +
        "Ensure FIREBASE_ADMIN_PROJECT_ID, FIREBASE_ADMIN_CLIENT_EMAIL, " +
        "and FIREBASE_ADMIN_PRIVATE_KEY are set in .env.local."
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      // Replace escaped newlines that may appear when the key is stored as a single-line env var
      privateKey: privateKey.replace(/\\n/g, "\n"),
    }),
  });
}

const adminApp: App = getAdminApp();

export const adminDb: Firestore = getFirestore(adminApp);
export const adminAuth: Auth = getAuth(adminApp);

export default adminApp;
