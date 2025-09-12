// lib/firestore.ts
import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/**
 * Generic Firestore Helpers
 */

// Add a new document
export async function addDocument(collectionName: string, data: any) {
  const colRef = collection(db, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

// Set or overwrite a document
export async function setDocument(collectionName: string, id: string, data: any) {
  const docRef = doc(db, collectionName, id);
  await setDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Get single document
export async function getDocument(collectionName: string, id: string) {
  const docRef = doc(db, collectionName, id);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
}

// Get all documents from a collection
export async function getAllDocuments(collectionName: string) {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

// Update document
export async function updateDocument(collectionName: string, id: string, data: any) {
  const docRef = doc(db, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// Delete document
export async function deleteDocument(collectionName: string, id: string) {
  const docRef = doc(db, collectionName, id);
  await deleteDoc(docRef);
}

/**
 * Domain-specific Helpers
 */

// Listings
export async function getListings() {
  return getAllDocuments("listings");
}

export async function getListingById(id: string) {
  return getDocument("listings", id);
}

export async function addListing(data: any) {
  return addDocument("listings", data);
}

// Stories
export async function getStories() {
  return getAllDocuments("stories");
}

export async function addStory(data: any) {
  return addDocument("stories", data);
}

// Notifications
export async function addNotification(userId: string, message: string) {
  return addDocument("notifications", {
    userId,
    message,
    read: false,
  });
}

export async function getUserNotifications(userId: string) {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), orderBy("createdAt", "desc"));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}
