// lib/storage.ts
import { storage } from "./firebase";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

/**
 * Upload a single file
 * @param path - storage path (e.g. "listings/{listingId}/image.jpg")
 * @param file - Blob | Uint8Array | ArrayBuffer
 * @returns download URL
 */
export async function uploadFile(path: string, file: Blob | Uint8Array | ArrayBuffer): Promise<string> {
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file);
  return getDownloadURL(snapshot.ref);
}

/**
 * Upload multiple files and return their URLs
 * @param basePath - base folder (e.g. "listings/{listingId}/gallery")
 * @param files - array of File | Blob | Uint8Array | ArrayBuffer
 * @returns array of download URLs
 */
export async function uploadMultipleFiles(basePath: string, files: (File | Blob | Uint8Array | ArrayBuffer)[]): Promise<string[]> {
  const uploadPromises = files.map(async (file, index) => {
    const path = `${basePath}/file_${Date.now()}_${index}`;
    return uploadFile(path, file);
  });

  return Promise.all(uploadPromises);
}

/**
 * Get a public download URL for a stored file
 */
export async function getFileURL(path: string): Promise<string> {
  const storageRef = ref(storage, path);
  return getDownloadURL(storageRef);
}

/**
 * Delete a single file
 */
export async function deleteFile(path: string): Promise<void> {
  const storageRef = ref(storage, path);
  await deleteObject(storageRef);
}

/**
 * Delete multiple files
 */
export async function deleteMultipleFiles(paths: string[]): Promise<void> {
  const deletePromises = paths.map(async (path) => {
    await deleteFile(path);
  });
  await Promise.all(deletePromises);
}
