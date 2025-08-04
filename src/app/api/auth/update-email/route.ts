// app/api/auth/update-email/route.ts

import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { newEmail, userId, currentPassword, currentEmail } =
    await request.json();

  if (!userId || !newEmail || !currentPassword || !currentEmail) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  // Step 1: Optional — Verify current password
  const supabaseClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error: authError } = await supabaseClient.auth.signInWithPassword({
    email: currentEmail,
    password: currentPassword,
  });

  if (authError) {
    return NextResponse.json(
      { error: "Incorrect current password" },
      { status: 401 }
    );
  }

  // Step 2: Update using Admin API
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    {
      email: newEmail,
      email_confirm: true, }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { message: "Email updated successfully", user: data },
    { status: 200 }
  );
}
