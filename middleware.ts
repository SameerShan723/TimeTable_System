import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const cookie = request.cookies.get(name);
          return cookie?.value;
        },
        set(name: string, value: string) {
          try {
            request.cookies.set(name, value);
          } catch (error) {
            console.error(`Error setting cookie ${name}:`, error);
          }
        },
        remove(name: string) {
          try {
            request.cookies.delete(name);
          } catch (error) {
            console.error(`Error removing cookie ${name}:`, error);
          }
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Redirect / with a code parameter to /update-password
  // const url = request.nextUrl;
  // const code = url.searchParams.get("code");
  // if (code && url.pathname === "/") {
  //   return NextResponse.redirect(
  //     new URL(`/update-password?code=${code}`, request.url)
  //   );
  // }

  // Protect /protected routes as before
  if (!session && request.nextUrl.pathname.startsWith("/protected")) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Protect /course routes for superadmin only
  if (
    request.nextUrl.pathname.startsWith("/course") ||
    request.nextUrl.pathname.startsWith("/AddNewCourse") ||
    request.nextUrl.pathname.startsWith("/generateTimetable")
  ) {
    if (!session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Check role from Supabase
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", session.user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (roleError || !roleData) {
      // Optionally, redirect to a 403 page instead of login
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/", // Add root path to matcher
    "/protected/:path*",
    "/course/:path*",
    "/AddNewCourse/:path*",
    "/generateTimetable/:path*",
  ],
};
