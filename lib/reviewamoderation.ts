// lib/reviewsModeration.ts
import { db } from "./firebase";
import {
  doc,
  updateDoc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const REVIEWS_COLLECTION = "reviews";

/**
 * Approve a review → makes it visible
 */
export async function approveReview(reviewId: string) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await updateDoc(docRef, {
    status: "approved",
    moderatedAt: serverTimestamp(),
  });
}

/**
 * Reject a review → hides it permanently
 */
export async function rejectReview(reviewId: string, reason?: string) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await updateDoc(docRef, {
    status: "rejected",
    rejectionReason: reason || "Not specified",
    moderatedAt: serverTimestamp(),
  });
}

/**
 * Flag a review for further review (e.g. spam, offensive content)
 */
export async function flagReview(reviewId: string, flagReason: string) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await updateDoc(docRef, {
    status: "flagged",
    flagReason,
    moderatedAt: serverTimestamp(),
  });
}

/**
 * Get all reviews awaiting moderation
 */
export async function getPendingReviews() {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("status", "==", "pending"),
    orderBy("createdAt", "asc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Check current moderation status of a review
 */
export async function getReviewStatus(reviewId: string) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return snapshot.data().status || "pending";
  }
  return "not_found";
}
