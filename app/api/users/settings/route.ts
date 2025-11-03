import { NextResponse } from "next/server";
import { getAuth } from "firebase-admin/auth";
import { db } from "@/lib/firebaseadmin";
import {
  doc,
  getDoc,
  updateDoc,
  setDoc,
  collection,
  getDocs,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/**
 * GET /api/users/settings
 * - User: fetch their own settings
 * - Admin: fetch all user settings
 */
export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;
    const role = (decoded as any).role || "user";

    const usersRef = collection(db, "users");

    // ✅ Admin — fetch all user settings
    if (role === "admin") {
      const q = query(usersRef, orderBy("createdAt", "desc"));
      const snap = await getDocs(q);

      const userSettings = snap.docs.map((doc) => {
        const d = doc.data();
        return {
          uid: doc.id,
          name: d.name || "",
          email: d.email || "",
          phone: d.phone || "",
          refundPreference: d.refundPreference || "bank_transfer",
          bankDetails: d.bankDetails || {},
          aadharImageUrl: d.aadharImageUrl || "",
          createdAt: d.createdAt,
        };
      });

      return NextResponse.json({ success: true, userSettings });
    }

    // ✅ Regular user — fetch their settings
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) {
      return NextResponse.json(
        { error: "User record not found" },
        { status: 404 }
      );
    }

    const data = userSnap.data();

    return NextResponse.json({
      success: true,
      settings: {
        refundPreference: data.refundPreference || "bank_transfer",
        bankDetails: data.bankDetails || {
          accountHolder: "",
          accountNumber: "",
          ifsc: "",
          upi: "",
        },
        aadharImageUrl: data.aadharImageUrl || "",
        aadharNumber: data.aadharNumber
          ? `XXXX-XXXX-${data.aadharNumber.slice(-4)}`
          : "",
      },
    });
  } catch (error) {
    console.error("Error fetching user settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch user settings" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/users/settings
 * - User updates refund preference, bank details, Aadhaar info
 */
export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const token = authHeader.replace("Bearer ", "");
    const decoded = await getAuth().verifyIdToken(token);
    const uid = decoded.uid;

    const {
      refundPreference,
      bankDetails,
      aadharNumber,
      aadharImageUrl,
    } = await req.json();

    // Validate refund mode
    const validRefundModes = ["bank_transfer", "upi"];
    if (refundPreference && !validRefundModes.includes(refundPreference)) {
      return NextResponse.json(
        { error: "Invalid refund preference" },
        { status: 400 }
      );
    }

    // Prepare update payload
    const updateData: Record<string, any> = {
      updatedAt: serverTimestamp(),
    };

    if (refundPreference) updateData.refundPreference = refundPreference;
    if (bankDetails) {
      updateData.bankDetails = {
        accountHolder: bankDetails.accountHolder || "",
        accountNumber: bankDetails.accountNumber || "",
        ifsc: bankDetails.ifsc || "",
        upi: bankDetails.upi || "",
      };
    }
    if (aadharNumber) updateData.aadharNumber = aadharNumber;
    if (aadharImageUrl) updateData.aadharImageUrl = aadharImageUrl;

    const userRef = doc(db, "users", uid);
    await setDoc(userRef, updateData, { merge: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating user settings:", error);
    return NextResponse.json(
      { error: "Failed to update user settings" },
      { status: 500 }
    );
  }
}
