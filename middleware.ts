import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  const { data: { session } } = await supabase.auth.getSession();

  // Bypass auth checks for /update-password, /login, and /reset-password
  if (
    request.nextUrl.pathname === "/update-password" ||
    request.nextUrl.pathname === "/login" ||
    request.nextUrl.pathname === "/reset-password"
  ) {
    return res;
  }

  // Protect /protected routes
  if (!session && request.nextUrl.pathname.startsWith("/protected")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect /course, /AddNewCourse, /generateTimetable for superadmin only
  if (
    request.nextUrl.pathname.startsWith("/course") ||
    request.nextUrl.pathname.startsWith("/AddNewCourse") ||
    request.nextUrl.pathname.startsWith("/generateTimetable")
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
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect logged-in users from /login to /dashboard
  if (session && request.nextUrl.pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return res;
}

export const config = {
  matcher: [
    "/",
    "/login",
    "/reset-password",
    "/update-password",
    "/protected/:path*",
    "/course/:path*",
    "/AddNewCourse/:path*",
    "/generateTimetable/:path*",
  ],
};