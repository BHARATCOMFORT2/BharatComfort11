// lib/storage.ts
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Upload a file to Firebase Storage
 * @param path - storage path (e.g. "listings/{listingId}/image.jpg")
 * @param file - file (Blob | Uint8Array | ArrayBuffer)
 * @returns download URL
 */
export async function uploadFile(path: string, file: Blob | Uint8Array | ArrayBuffer): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  const url = await getDownloadURL(snapshot.ref);
  return url;
}

/**
 * Get a public download URL for a stored file
 * @param path - storage path
 */
export async function getFileURL(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

/**
 * Delete a file from Firebase Storage
 * @param path - storage path
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}
