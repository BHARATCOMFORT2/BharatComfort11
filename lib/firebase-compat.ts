/**
 * lib/firebase-compat.ts
 *
 * Compatibility shim: export a small subset of the *client* firestore helpers
 * but implemented using the Admin SDK. Use in server-side API routes to avoid
 * client/admin type mismatches.
 *
 * NOTE: This is a compatibility layer / temporary bypass. Prefer rewriting server
 * routes to use Admin SDK idiomatic methods (db.collection(...).doc(...).get(), FieldValue.serverTimestamp()).
 */

import admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

if (!admin.apps.length) {
  // Initialize admin if not already initialized using your existing admin config
  // Your existing lib/firebaseadmin.ts probably already initializes admin.
  // This block is defensive — if you already init elsewhere, it's harmless.
  try {
    admin.initializeApp();
  } catch (e) {
    // ignore if already initialized
  }
}

export const db = admin.firestore();

// Minimal client-style helpers implemented via Admin SDK
export function doc(dbParam: any, collectionPath: string, docId?: string) {
  // If developer passed admin db instance, ignore and use our admin db
  const root = db; // always use admin db to avoid mismatch
  if (docId !== undefined) {
    return root.collection(collectionPath).doc(docId);
  }
  // If only one arg (rare), or doc(...) used differently, attempt to handle gracefully
  return root.collection(collectionPath);
}

export async function getDoc(docRef: any) {
  // docRef is expected to be admin DocumentReference (from doc())
  const snap = await docRef.get();
  // For compatibility with client getDoc API, return object with exists() and data()
  return {
    exists: () => snap.exists,
    data: () => snap.data(),
    // keep raw snapshot if needed
    _raw: snap,
  };
}

export async function updateDoc(docRef: any, data: any) {
  // If docRef is an admin DocumentReference
  // note: admin.update accepts plain object
  return docRef.update(data);
}

export function serverTimestamp() {
  return FieldValue.serverTimestamp();
}

/**
 * A convenience wrapper for collection() to mimic client CollectionReference pathing if needed.
 */
export function collection(dbParam: any, collectionPath: string) {
  return db.collection(collectionPath);
}

/**
 * Helper to create document refs from path string
 * example: docRefFromPath("collection/docId")
 */
export function docRefFromPath(path: string) {
  const parts = path.split("/").filter(Boolean);
  if (parts.length % 2 !== 0) {
    // collection path only, return collection ref
    return db.collection(parts.join("/"));
  }
  const collection = parts.slice(0, parts.length - 1).join("/");
  const id = parts[parts.length - 1];
  return db.collection(collection).doc(id);
}
