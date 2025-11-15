// lib/adminAuth.ts
import "server-only";
import { adminAuth } from "./firebaseadmin";

export interface AuthResult {
  uid: string;
  email?: string;
  admin?: boolean;
  partner?: boolean;
  decoded: any;
}

/**
 * Extract Bearer token from a Request
 */
export function extractToken(req: Request): string | null {
  const header = (req as any).headers?.get
    ? (req as any).headers.get("authorization")
    : (req as any).headers?.authorization;

  if (!header) return null;

  const match = header.match(/^Bearer (.+)$/);
  return match ? match[1] : null;
}

/**
 * Verify ID token and return decoded claims
 */
export async function verifyUser(req: Request): Promise<AuthResult> {
  const token = extractToken(req);

  if (!token) {
    throw { status: 401, message: "Missing Authorization header" };
  }

  let decoded;
  try {
    decoded = await adminAuth.verifyIdToken(token, true);
  } catch (err) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  return {
    uid: decoded.uid,
    email: decoded.email || null,
    admin: decoded.admin || false,
    partner: decoded.partner || false,
    decoded,
  };
}

/**
 * Ensure user is logged in
 */
export function requireAuth(user: AuthResult | null) {
  if (!user) {
    throw { status: 401, message: "Authentication required" };
  }
}

/**
 * Ensure user is an admin
 */
export function requireAdmin(user: AuthResult) {
  if (!user?.admin) {
    throw { status: 403, message: "Admin access required" };
  }
}

/**
 * Ensure user is a partner
 */
export function requirePartner(user: AuthResult) {
  if (!user?.partner) {
    throw { status: 403, message: "Partner access required" };
  }
}

/**
 * Ensure user is owner of a resource
 */
export function requireOwner(user: AuthResult, ownerUid: string) {
  if (user.uid !== ownerUid && !user.admin) {
    throw { status: 403, message: "Access denied (not owner)" };
  }
}
