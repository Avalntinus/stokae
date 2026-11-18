import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const hasSession = Boolean(request.cookies.get("stokae_session")?.value);
  if (request.nextUrl.pathname === "/login" && hasSession) return NextResponse.redirect(new URL("/", request.url));
  if (!hasSession && request.nextUrl.pathname === "/") return NextResponse.redirect(new URL("/login", request.url));
  return NextResponse.next();
}

export const config = { matcher: ["/", "/login"] };
