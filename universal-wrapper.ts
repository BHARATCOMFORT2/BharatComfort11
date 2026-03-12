import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

/* ---------------------------------------------------------
Types
--------------------------------------------------------- */

export type WrappedContext = {
  req: Request;
  decoded: any | null;
  uid: string | null;
  claims: Record<string, any> | null;
  adminAuth: any;
  adminDb: any;
  adminStorage: any;
  rawSession?: string | null;
};

/* ---------------------------------------------------------
Helpers
--------------------------------------------------------- */

function jsonError(message: string, status = 500) {
  return NextResponse.json({ success: false, error: message }, { status });
}

/* ---------------------------------------------------------
Read session cookie safely
--------------------------------------------------------- */

function readSessionFromHeaders(req: Request) {
  try {
    const cookieHeader = req.headers.get("cookie") || "";
    if (!cookieHeader) return "";

    const cookies = cookieHeader.split(";").map((c) => c.trim());

    const names = [
      "__session",
      "session",
      "firebase_session",
      "firebaseToken",
    ];

    for (const cookie of cookies) {
      for (const name of names) {
        if (cookie.startsWith(name + "=")) {
          return cookie.split("=")[1];
        }
      }
    }

    return "";
  } catch {
    return "";
  }
}

/* ---------------------------------------------------------
Extract idToken from request body (SAFE)
--------------------------------------------------------- */

async function extractIdTokenFromBody(req: Request) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (!contentType.includes("application/json")) return "";

    const cloned = req.clone();

    const body = await cloned.json().catch(() => null);

    return body?.token || body?.idToken || "";
  } catch {
    return "";
  }
}

/* ---------------------------------------------------------
Response check helper
--------------------------------------------------------- */

function isResponseLike(obj: any) {
  return (
    obj &&
    (obj instanceof Response ||
      obj?.status !== undefined ||
      obj?.headers !== undefined)
  );
}

/* ---------------------------------------------------------
Main Wrapper
--------------------------------------------------------- */

export function wrapRoute(
  handler: (req: Request, ctx: WrappedContext) => Promise<any>,
  options?: {
    requireAuth?: boolean;
    requireAdmin?: boolean;
  }
) {
  const requireAuth = options?.requireAuth ?? false;
  const requireAdmin = options?.requireAdmin ?? false;

  return async function (req: Request) {
    try {
      const { adminAuth, adminDb, adminStorage } = getFirebaseAdmin();

      let decoded: any = null;
      let rawSession: string | null = null;

      /* ---------------------------------------------------------
         1️⃣ Authorization header
      --------------------------------------------------------- */

      const authHeader = req.headers.get("authorization") || "";

      const bearer = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : "";

      /* ---------------------------------------------------------
         2️⃣ Session cookie
      --------------------------------------------------------- */

      const sessionCookie = readSessionFromHeaders(req);

      if (sessionCookie) {
        rawSession = sessionCookie;

        try {
          decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
        } catch {
          decoded = null;
        }
      }

      /* ---------------------------------------------------------
         3️⃣ Bearer token
      --------------------------------------------------------- */

      if (!decoded && bearer) {
        try {
          decoded = await adminAuth.verifyIdToken(bearer);
        } catch {
          decoded = null;
        }
      }

      /* ---------------------------------------------------------
         4️⃣ Token from body
      --------------------------------------------------------- */

      if (!decoded) {
        const idToken = await extractIdTokenFromBody(req);

        if (idToken) {
          try {
            decoded = await adminAuth.verifyIdToken(idToken);
          } catch {
            decoded = null;
          }
        }
      }

      /* ---------------------------------------------------------
         Build context
      --------------------------------------------------------- */

      const ctx: WrappedContext = {
        req,
        decoded,
        uid: decoded?.uid || null,
        claims: decoded || null,
        adminAuth,
        adminDb,
        adminStorage,
        rawSession,
      };

      /* ---------------------------------------------------------
         Auth checks
      --------------------------------------------------------- */

      if (requireAuth && !decoded) {
        return jsonError("Not authenticated", 401);
      }

      if (requireAdmin && (!decoded || !decoded.admin)) {
        return jsonError("Admin access required", 403);
      }

      /* ---------------------------------------------------------
         Run handler
      --------------------------------------------------------- */

      const result = await handler(req, ctx);

      if (isResponseLike(result)) return result;

      return NextResponse.json(result);
    } catch (err: any) {
      console.error("Universal wrapper error:", err);

      return jsonError(err?.message || "Internal server error", 500);
    }
  };
}
