// app/api/session/route.ts
import { NextResponse } from "next/server";
import { getFirebaseAdmin } from "@/lib/firebaseadmin";

function admin() {
  const { adminAuth } = getFirebaseAdmin();
  if (!adminAuth) throw new Error("Firebase Admin not initialized");
  return { adminAuth };
}

/** Helper: safe domain detection (skip domain for localhost) */
function cookieDomainFromHost(hostHeader?: string) {
  if (!hostHeader) return undefined;
  // strip port
  const host = hostHeader.split(":")[0].trim();
  if (!host || host.includes("localhost") || host.includes("127.0.0.1")) {
    return undefined;
  }
  // ensure leading dot for cross-subdomain availability
  return host.startsWith(".") ? host : `.${host}`;
}

/* -----------------------------------------------------------
   POST → Create Session Cookie
------------------------------------------------------------ */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = body?.token;
    if (!token) {
      return NextResponse.json({ error: "Missing token" }, { status: 400 });
    }

    const { adminAuth } = admin();
    const expiresIn = 7 * 24 * 60 * 60 * 1000; // 7 days (ms)

    const sessionCookie = await adminAuth.createSessionCookie(token, {
      expiresIn,
    });

    const res = NextResponse.json({ success: true });

    // determine domain from Host header (do NOT set domain on localhost)
    const host = (req.headers.get("host") || "");
    const domain = cookieDomainFromHost(host);

    const cookieOptions: any = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: Math.floor(expiresIn / 1000), // seconds
      sameSite: "lax",
    };

    if (domain) cookieOptions.domain = domain;

    // Set cookie
    res.cookies.set("__session", sessionCookie, cookieOptions);

    console.log("♻️ Session cookie set", { domain, secure: cookieOptions.secure });
    return res;
  } catch (error: any) {
    console.error("🔥 Session creation error:", error);
    return NextResponse.json(
      { error: error.message || "Internal error" },
      { status: 500 }
    );
  }
}

/* -----------------------------------------------------------
   GET → Validate Session Cookie
   (expects cookie to be sent with credentials: 'include')
------------------------------------------------------------ */
export async function GET(req: Request) {
  try {
    const { adminAuth } = admin();

    // read cookie header robustly
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    const sessionCookie =
      cookies.find((c) => c.startsWith("__session="))?.split("=")[1] ||
      cookies.find((c) => c.startsWith("session="))?.split("=")[1] ||
      "";

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    let decoded;
    try {
      decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    } catch (verifyErr: any) {
      console.warn("⚠️ Invalid/expired session cookie:", verifyErr?.message || verifyErr);
      // clear cookie in response (domain-aware)
      const res = NextResponse.json({ authenticated: false }, { status: 401 });
      const host = req.headers.get("host") || "";
      const domain = cookieDomainFromHost(host);
      const clearOpts: any = { path: "/", maxAge: 0, httpOnly: true };
      if (domain) clearOpts.domain = domain;
      res.cookies.set("__session", "", clearOpts);
      return res;
    }

    return NextResponse.json({
      authenticated: true,
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role || "user",
    });
  } catch (error: any) {
    console.error("🔥 Session validation error:", error);
    const res = NextResponse.json({ authenticated: false }, { status: 401 });
    // try to clear cookie defensively
    res.cookies.set("__session", "", { path: "/", maxAge: 0, httpOnly: true });
    return res;
  }
}

/* -----------------------------------------------------------
   DELETE → Logout
------------------------------------------------------------ */
export async function DELETE(req: Request) {
  const res = NextResponse.json({ success: true });

  // clear with domain if present
  const host = req.headers.get("host") || "";
  const domain = cookieDomainFromHost(host);
  const clearOpts: any = { httpOnly: true, path: "/", maxAge: 0 };
  if (domain) clearOpts.domain = domain;
  res.cookies.set("__session", "", clearOpts);

  console.log("🔒 Logged out — session cookie cleared", { domain });
  return res;
}
