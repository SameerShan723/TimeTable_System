// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  console.log("⚡ Middleware triggered:", req.nextUrl.pathname);

  if (req.nextUrl.pathname.startsWith("/courses")) {
    const token = req.cookies.get("auth_token");

    if (!token) {
      console.log("🚫 No token, redirecting...");
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/courses/:path*"],
};
