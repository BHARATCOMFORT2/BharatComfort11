// ✅ Force Node.js runtime & dynamic execution
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/**
 * 🧠 GET /api/debug/firebase
 * Tests Firebase Admin initialization and Firestore connectivity.
 * Safe for read-only diagnostics (no data modification).
 */
export async function GET() {
  try {
    const { admin, adminApp, db } = getFirebaseAdmin();

    // 🔐 Validate Firestore connection
    if (!db || typeof db.listCollections !== "function") {
      throw new Error("❌ Firestore Admin not initialized correctly.");
    }

    // Try fetching collection list
    const collections = await db.listCollections();
    const collectionNames = collections.map((c) => c.id);

    // Optional: Test reading one document (non-sensitive)
    let testResult = "ok";
    try {
      const testCol = collections[0];
      if (testCol) {
        const firstDoc = await testCol.limit(1).get();
        testResult = firstDoc.empty ? "No docs found" : "Docs accessible ✅";
      } else {
        testResult = "No collections yet";
      }
    } catch (e: any) {
      testResult = `⚠️ Error reading test doc: ${e.message}`;
    }

    return NextResponse.json({
      status: "ok",
      firebase: {
        appName: adminApp.name,
        projectId: adminApp.options.projectId,
        storageBucket: adminApp.options.storageBucket || null,
      },
      firestore: {
        connected: true,
        collections: collectionNames,
        testResult,
      },
      envCheck: {
        FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
        FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
        FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
      },
    });
  } catch (err: any) {
    console.error("🔥 Firebase Debug Error:", err);
    return NextResponse.json(
      {
        status: "error",
        message: err.message || "Unknown Firebase Admin issue.",
        envCheck: {
          FIREBASE_PROJECT_ID: !!process.env.FIREBASE_PROJECT_ID,
          FIREBASE_CLIENT_EMAIL: !!process.env.FIREBASE_CLIENT_EMAIL,
          FIREBASE_PRIVATE_KEY: !!process.env.FIREBASE_PRIVATE_KEY,
        },
      },
      { status: 500 }
    );
  }
}
