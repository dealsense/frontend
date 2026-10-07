import { NextResponse } from "next/server";

const COOKIE_NAME = "ds_site_access";

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function middleware(request) {
  const expected = process.env.SITE_ACCESS_PASSWORD;
  // Unset means the gate is off entirely — lets local dev (no .env.local entry needed)
  // and any deploy that intentionally doesn't want this feature pass through untouched.
  if (!expected) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (pathname === "/gate" || pathname.startsWith("/api/gate") || pathname.startsWith("/_next") || pathname === "/icon.svg" || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const expectedHash = await sha256Hex(expected);
  if (cookie === expectedHash) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = "/gate";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
