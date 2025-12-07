// lib/firebase.ts
// ✅ This file is now NEUTRALIZED.
// ✅ It simply re-exports everything from firebase-client
// ✅ So even if old imports use "@/lib/firebase", they will
// ✅ still use the SAME single Firebase app instance.

export * from "./firebase-client";
