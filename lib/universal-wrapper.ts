// lib/universal-wrapper.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "./firebaseadmin";

/**
 * Universal wrapper for App Router route handlers.
 *
 * Exports:
 *  - withAuth(handler, opts)  -> wraps your handler and verifies auth (session cookie or id token)
 *  - extractSessionToken(req) -> returns __session cookie value (if present)
 *  - createSessionCookie(idToken, expiresInMs) -> creates a session cookie string using adminAuth
 *  - verifyTokenOnly(req) -> verifies idToken or session cookie and returns decoded token or null
 *
 * Handler signature:
 *   async function handler(req: Request, ctx: { adminAuth, adminDb, adminStorage, decoded }) { ... }
 *
 * Options:
 *  - requireRole?: string | string[]  (e.g. "admin" or ["admin","partner"])
 *  - allowGuest?: boolean  (skip auth check if true)
 */

export type HandlerContext = {
  adminAuth: ReturnType<typeof getFirebaseAdmin> extends infer R ? any : any;
  adminDb: any;
  adminStorage: any;
  decoded: any;
};

type WithAuthOpts = {
  requireRole?: string | string[];
  allowGuest?: boolean;
};

function extractSessionToken(req: Request): string | null {
  const cookieHeader = req.headers.get("cookie") || "";
  const match = cookieHeader.match(/__session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Create a session cookie (returns the cookie string value).
 * Note: requires adminAuth from getFirebaseAdmin()
 */
async function createSessionCookie(idToken: string, expiresInMs = 7 * 24 * 60 * 60 * 1000) {
  const { adminAuth } = getFirebaseAdmin();
  if (!idToken) throw new Error("Missing idToken");
  const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn: expiresInMs });
  return sessionCookie;
}

/**
 * verifyTokenOnly - attempt to verify session cookie, then idToken
 * returns decoded token object or null
 */
async function verifyTokenOnly(req: Request) {
  const { adminAuth } = getFirebaseAdmin();
  const cookieToken = extractSessionToken(req);
  const authHeader = req.headers.get("authorization") || "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : authHeader || "";

  // Try session cookie first (preferred)
  if (cookieToken) {
    try {
      const decoded = await adminAuth.verifySessionCookie(cookieToken, true);
      return decoded;
    } catch (e) {
      // fall through to try id token
    }
  }

  if (bearer) {
    try {
      const decoded = await adminAuth.verifyIdToken(bearer);
      return decoded;
    } catch (e) {
      // invalid token
    }
  }

  return null;
}

/**
 * requireRoleOrFail - helper to check role claims on decoded token
 */
function requireRole(decoded: any, required?: string | string[]) {
  if (!required) return true;
  const requiredList = Array.isArray(required) ? required : [required];
  const userRoles = [];

  // custom claims may have 'role' or boolean flags
  if (decoded?.role) userRoles.push(String(decoded.role));
  if (decoded?.admin) userRoles.push("admin");
  if (decoded?.partner) userRoles.push("partner");
  if (decoded?.staff) userRoles.push("staff");

  // also include uid for sanity
  // if none match -> fail
  for (const r of requiredList) {
    if (userRoles.includes(r)) return true;
  }
  return false;
}

/**
 * withAuth - wrapper for route handlers
 * handler receives (req, ctx) where ctx = { adminAuth, adminDb, adminStorage, decoded }
 */
export function withAuth(
  handler: (req: Request, ctx: HandlerContext) => Promise<Response | ReturnType<typeof NextResponse.json>>,
  opts: WithAuthOpts = {}
) {
  return async function (req: Request) {
    const { adminAuth, adminDb, adminStorage } = getFirebaseAdmin();

    // allow shortcuts for non-auth endpoints
    if (opts.allowGuest) {
      const ctx = { adminAuth, adminDb, adminStorage, decoded: null };
      try {
        return await handler(req, ctx);
      } catch (err: any) {
        console.error("Wrapped handler error:", err);
        return NextResponse.json({ error: err?.message || "Server error" }, { status: 500 });
      }
    }

    // verify token (session cookie or id token)
    let decoded: any = null;
    try {
      decoded = await verifyTokenOnly(req);
    } catch (e) {
      console.warn("Token verify error:", e);
      decoded = null;
    }

    if (!decoded) {
      // unauthorized
      return NextResponse.json({ ok: false, error: "Not authenticated" }, { status: 401 });
    }

    // role check
    if (opts.requireRole && !requireRole(decoded, opts.requireRole)) {
      return NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 });
    }

    // build ctx
    const ctx: HandlerContext = {
      adminAuth,
      adminDb,
      adminStorage,
      decoded,
    };

    try {
      const result = await handler(req, ctx);
      return result as any;
    } catch (err: any) {
      console.error("Wrapped handler runtime error:", err);
      return NextResponse.json({ ok: false, error: err?.message || "Internal error" }, { status: 500 });
    }
  };
}

export {
  extractSessionToken,
  createSessionCookie,
  verifyTokenOnly,
  requireRole,
};
