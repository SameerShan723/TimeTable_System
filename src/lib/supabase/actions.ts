"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function getSession() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookieStore.get(name))?.value;
          },
          set(name: string, value: string, options) {
            cookieStore.set(name, value, {
              ...options,
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
              maxAge: 60 * 60 * 24 * 7, // 1 week
            });
          },
          remove(name: string) {
            cookieStore.delete({
              name,
              path: "/",
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          },
        },
      }
    );

    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      console.error("Session fetch error:", error);
      return { session: null, error: error.message };
    }

    return { session, error: null };
  } catch (error) {
    console.error("Unexpected error in getSession:", error);
    return { session: null, error: "An unexpected error occurred" };
  }
}

export async function signOut() {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          async get(name: string) {
            return (await cookieStore.get(name))?.value;
          },
          set(name: string, value: string, options) {
            cookieStore.set(name, value, {
              ...options,
              path: "/",
              httpOnly: true,
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          },
          remove(name: string) {
            cookieStore.delete({
              name,
              path: "/",
              secure: process.env.NODE_ENV === "production",
              sameSite: "lax",
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error);
      return { error: error.message };
    }

    // Explicitly clear all Supabase-related cookies
    const allCookies = await cookieStore.getAll();
    for (const cookie of allCookies) {
      if (cookie.name.startsWith("sb-")) {
        await cookieStore.delete({
          name: cookie.name,
          path: "/",
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
        });
      }
    }

    return { error: null };
  } catch (error) {
    console.error("Unexpected error in signOut:", error);
    return { error: "An unexpected error occurred during sign out" };
  }
}
