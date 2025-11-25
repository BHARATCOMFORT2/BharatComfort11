// lib/universal-wrapper.ts
/**
 * Universal wrapper for Next.js App Router route handlers.
 *
 * Usage:
 *  - Import `wrapRoute` and wrap your handler:
 *
 *    import { wrapRoute } from "@/lib/universal-wrapper";
 *
 *    export const runtime = "nodejs";
 *    export const dynamic = "force-dynamic";
 *
 *    export const POST = wrapRoute(async (req, ctx) => {
 *      // ctx contains: decoded, adminAuth, adminDb, adminStorage, uid, claims, rawSession
 *      // your handler code here
 *      return NextResponse.json({ ok: true });
 *    }, { requireAuth: true, requireAdmin: false });
 *
 * Options:
 *  - requireAuth: boolean (if true, will require a valid Firebase session or idToken)
 *  - requireAdmin: boolean (if true, will require decoded.admin === true)
 *
 * The wrapper uses getFirebaseAdmin() from your repo (expected to return adminAuth, adminDb, adminStorage).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

export type WrappedContext = {
  req: Request;
  decoded: any | null;
  uid?: string | null;
  claims?: Record<string, any> | null;
  adminAuth: any;
  adminDb: any;
  adminStorage: any;
  rawSession?: string | null;
};

export function jsonError(message: string, status = 500) {
  return NextResponse.json({ error: message }, { status });
}

function readSessionFromHeaders(req: Request) {
  try {
    const cookieHeader = (req as any).headers?.get
      ? (req as any).headers.get("cookie") || ""
      : (typeof window !== "undefined" ? document.cookie : "");
    if (!cookieHeader) return "";

    const parts = cookieHeader.split(";").map((c: string) => c.trim());
    const findCookie = (names: string[]) =>
      parts.find((c: string) => names.some((n) => c.startsWith(n + "=")));
    const raw =
      findCookie(["__session", "session", "firebase_session"]) ||
      parts.find((c: string) => c.startsWith("firebaseToken=")) ||
      "";
    return raw ? raw.split("=")[1] : "";
  } catch (e) {
    return "";
  }
}

/**
 * wrapRoute - high level wrapper
 *
 * handler: async (req, ctx) => NextResponse | Response | object
 * options:
 *   requireAuth?: boolean (default false) - if true, verifies session or id token
 *   requireAdmin?: boolean (default false) - if true, requires decoded.admin true
 */
export function wrapRoute(
  handler: (req: Request, ctx: WrappedContext) => Promise<any>,
  options?: { requireAuth?: boolean; requireAdmin?: boolean }
) {
  const requireAuth = options?.requireAuth ?? false;
  const requireAdmin = options?.requireAdmin ?? false;

  return async function (req: Request) {
    try {
      const { adminAuth, adminDb, adminStorage } = getFirebaseAdmin();

      // attach base ctx
      const ctxBase: Partial<WrappedContext> = {
        req,
        adminAuth,
        adminDb,
        adminStorage,
        decoded: null,
        uid: null,
        claims: null,
        rawSession: null,
      };

      // 1) Read bearer token (Authorization: Bearer ...)
      const authHeader = (req as any).headers?.get
        ? (req as any).headers.get("authorization") || ""
        : "";

      const bearer = authHeader.startsWith("Bearer ")
        ? authHeader.substring(7)
        : "";

      // 2) Read cookie session from common names
      const sessionFromCookie = readSessionFromHeaders(req);
      ctxBase.rawSession = sessionFromCookie || null;

      // 3) Prefer verifying session cookie (server session) -> adminAuth.verifySessionCookie
      let decoded: any = null;
      if (sessionFromCookie) {
        try {
          decoded = await adminAuth.verifySessionCookie(sessionFromCookie, true).catch(() => null);
        } catch (e) {
          decoded = null;
        }
      }

      // 4) If no session cookie verified, try ID token (bearer or passed in body)
      if (!decoded) {
        const idToken = bearer || (await extractIdTokenFromBody(req));
        if (idToken) {
          decoded = await adminAuth.verifyIdToken(idToken).catch(() => null);
        }
      }

      // 5) Fill ctx with decoded
      if (decoded) {
        ctxBase.decoded = decoded;
        ctxBase.uid = decoded.uid || null;
        ctxBase.claims = decoded;
      }

      // 6) Auth checks
      if (requireAuth && !decoded) {
        return jsonError("Not authenticated", 401);
      }

      if (requireAdmin && (!decoded || !decoded.admin)) {
        return jsonError("Admin access required", 403);
      }

      // 7) Call user handler
      const ctx = ctxBase as WrappedContext;
      const result = await handler(req, ctx);

      // Handler may directly return NextResponse or raw object
      if (result instanceof NextResponse) return result;
      if (isResponseLike(result)) return result;

      // otherwise return JSON
      return NextResponse.json(result);
    } catch (err: any) {
      console.error("Universal wrapper error:", err);
      return jsonError(err?.message || "Internal server error", 500);
    }
  };
}

/** helper to extract idToken from JSON body if present (non-consuming for other flows) */
async function extractIdTokenFromBody(req: Request) {
  try {
    // clone the request stream so we can try to parse JSON safely
    const ct = (req as any).headers?.get ? (req as any).headers.get("content-type") || "" : "";
    if (!ct.includes("application/json")) return "";
    const bodyText = await req.text();
    if (!bodyText) return "";
    const parsed = JSON.parse(bodyText);
    return parsed?.token || parsed?.idToken || "";
  } catch (e) {
    return "";
  }
}

function isResponseLike(obj: any) {
  return obj && (obj.body !== undefined || obj.headers !== undefined || obj.status !== undefined);
}
