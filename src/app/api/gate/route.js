import { NextResponse } from "next/server";

const COOKIE_NAME = "ds_site_access";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("");
}

export async function POST(request) {
  const { password } = await request.json().catch(() => ({}));
  const expected = process.env.SITE_ACCESS_PASSWORD;

  // Unset means the gate is effectively disabled (matches middleware's own check) —
  // fail closed rather than silently accepting any password.
  if (!expected) {
    return NextResponse.json({ error: "Access gate is not configured" }, { status: 500 });
  }
  if (!password || password !== expected) {
    return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
  }

  const token = await sha256Hex(expected);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: MAX_AGE,
    path: "/",
  });
  return res;
}
