// lib/reviews.ts
import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

const REVIEWS_COLLECTION = "reviews";

/**
 * Add a new review
 * @param listingId - ID of the listing being reviewed
 * @param userId - ID of the user writing the review
 * @param rating - star rating (1–5)
 * @param comment - review text
 */
export async function addReview(
  listingId: string,
  userId: string,
  rating: number,
  comment: string
) {
  const colRef = collection(db, REVIEWS_COLLECTION);
  const reviewDoc = await addDoc(colRef, {
    listingId,
    userId,
    rating,
    comment,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return reviewDoc.id;
}

/**
 * Get all reviews for a listing
 */
export async function getReviewsForListing(listingId: string) {
  const q = query(
    collection(db, REVIEWS_COLLECTION),
    where("listingId", "==", listingId),
    orderBy("createdAt", "desc")
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

/**
 * Get a single review
 */
export async function getReviewById(reviewId: string) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  const snapshot = await getDoc(docRef);
  if (snapshot.exists()) {
    return { id: snapshot.id, ...snapshot.data() };
  }
  return null;
}

/**
 * Update a review (only owner or admin should be allowed)
 */
export async function updateReview(reviewId: string, data: Partial<{ rating: number; comment: string }>) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a review
 */
export async function deleteReview(reviewId: string) {
  const docRef = doc(db, REVIEWS_COLLECTION, reviewId);
  await deleteDoc(docRef);
}

/**
 * Get average rating for a listing
 */
export async function getAverageRating(listingId: string) {
  const reviews = await getReviewsForListing(listingId);
  if (reviews.length === 0) return 0;
  const total = reviews.reduce((sum, r: any) => sum + r.rating, 0);
  return total / reviews.length;
}
