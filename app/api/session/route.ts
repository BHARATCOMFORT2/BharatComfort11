// app/api/session/route.ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

// ✅ Header helper (browser / server dono ke liye safe)
function getAuthHeader(req: Request) {
  const anyReq = req as any;
  if (anyReq.headers?.get) {
    return (
      anyReq.headers.get("authorization") ||
      anyReq.headers.get("Authorization")
    );
  }
  return anyReq.headers?.authorization || anyReq.headers?.Authorization;
}

// ✅ Common handler (GET + POST dono yahi use karenge)
async function handleSession(req: Request) {
  try {
    const authHeader = getAuthHeader(req);

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        {
          success: false,
          user: null,
          message: "Missing Authorization",
        },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { auth: adminAuth } = getFirebaseAdmin();

    // ✅ Token verify
    const decoded = await adminAuth.verifyIdToken(token, true);

    return NextResponse.json({
      success: true,
      user: {
        uid: decoded.uid,
        email: decoded.email || null,
        role: (decoded as any).role || "user",
      },
    });
  } catch (err) {
    console.error("SESSION API ERROR:", err);
    return NextResponse.json(
      {
        success: false,
        user: null,
        message: "Session invalid",
      },
      { status: 401 }
    );
  }
}

// ✅ Frontend se POST aa raha hai → ye required hai (405 fix)
export async function POST(req: Request) {
  return handleSession(req);
}

// ✅ Agar kahin GET se bhi use ho raha ho to safe hai
export async function GET(req: Request) {
  return handleSession(req);
}
