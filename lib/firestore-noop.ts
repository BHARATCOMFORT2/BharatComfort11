// lib/firestore-noop.ts
// 🔥 GLOBAL FIRESTORE BYPASS FOR CLIENT-SIDE
// Jo bhi function call karega, network pe kuch nahi jayega.

export const getFirestore = (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: getFirestore called");
  return {} as any;
};

export const collection = (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: collection called");
  return {} as any;
};

export const doc = (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: doc called");
  return {} as any;
};

export const query = (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: query called");
  return {} as any;
};

export const where = (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: where called");
  return {} as any;
};

export const onSnapshot = (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: onSnapshot called (no network)");
  // Return unsubscribe function
  return () => {};
};

export const getDoc = async (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: getDoc called");
  return { exists: () => false, data: () => null } as any;
};

export const getDocs = async (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: getDocs called");
  return { docs: [] } as any;
};

export const updateDoc = async (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: updateDoc called");
  return;
};

export const deleteDoc = async (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: deleteDoc called");
  return;
};

export const setDoc = async (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: setDoc called");
  return;
};

export const addDoc = async (..._args: any[]) => {
  console.warn("🛑 Firestore NOOP: addDoc called");
  return { id: "noop" } as any;
};

// Agar kahin aur koi function import ho jaye, crash na ho:
export const serverTimestamp = () => new Date();
export const FieldValue = { serverTimestamp };
