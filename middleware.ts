import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Redirect logged-in users from /auth/login to / FIRST
  if (session && request.nextUrl.pathname === "/auth/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Bypass auth checks for auth-related routes
  if (
    request.nextUrl.pathname === "/auth/update-password" ||
    request.nextUrl.pathname === "/auth/login" ||
    request.nextUrl.pathname === "/auth/reset-password" ||
    request.nextUrl.pathname === "/auth/otp"
  ) {
    return res;
  }

  // Protect /protected routes
  if (!session && request.nextUrl.pathname.startsWith("/protected")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect /course, /add-new-course, /generate-timetable for superadmin only
  if (
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/courses") ||
    request.nextUrl.pathname.startsWith("/add-new-course") ||
    request.nextUrl.pathname.startsWith("/generate-timetable")
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", session.user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (roleError || !roleData) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/auth/:path*",
    "/protected/:path*",
    "/courses/:path*",
    "/add-new-course/:path*",
    "/generate-timetable/:path*",
  ],
};