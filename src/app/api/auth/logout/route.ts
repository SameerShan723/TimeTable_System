// /app/api/logout/route.ts (app router)
import { signOut } from "@/lib/supabase/actions";
import { NextResponse } from "next/server";

export async function POST() {
  const { error } = await signOut();
  return NextResponse.json({ success: !error, error });
}
