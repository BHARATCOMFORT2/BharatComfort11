/**
 * 🔹 Script: setAdminRole.ts
 * Purpose: Assign or remove admin role for a Firebase user (by UID or email)
 *
 * Usage:
 *  npx tsx scripts/setAdminRole.ts <UID or EMAIL> [--remove]
 */

import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import { initializeApp, getApps, cert } from "firebase-admin/app";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID!,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
      privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
    }),
  });
}

const args = process.argv.slice(2);
if (args.length < 1) {
  console.error("❌ Usage: npx tsx scripts/setAdminRole.ts <UID or EMAIL> [--remove]");
  process.exit(1);
}

const identifier = args[0];
const remove = args.includes("--remove");

(async () => {
  const auth = getAuth();

  try {
    // Get user by UID or email
    const user =
      identifier.includes("@")
        ? await auth.getUserByEmail(identifier)
        : await auth.getUser(identifier);

    if (!user) {
      console.error("❌ User not found.");
      process.exit(1);
    }

    if (remove) {
      await auth.setCustomUserClaims(user.uid, {});
      console.log(`🚫 Removed admin role from ${user.email || user.uid}`);
    } else {
      await auth.setCustomUserClaims(user.uid, { role: "admin", isAdmin: true });
      console.log(`✅ Granted admin role to ${user.email || user.uid}`);
    }

    // Optional: log to Firestore (audit)
    await db.collection("admin_logs").add({
      userId: user.uid,
      email: user.email || null,
      action: remove ? "removed" : "granted",
      role: "admin",
      timestamp: new Date(),
    });
  } catch (error) {
    console.error("❌ Failed to update user role:", error);
  }
})();
