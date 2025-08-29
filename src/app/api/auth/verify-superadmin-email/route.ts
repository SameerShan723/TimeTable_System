import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Create a Supabase client with service role key for admin access
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Directly check if the provided email exists as a superadmin
    const { data: userData, error: userError } = await supabase
      .from("user_roles")
      .select("id, role")
      .eq("email", email)
      .eq("role", "superadmin")
      .single();

    if (userError || !userData) {
      return NextResponse.json(
        { error: "This email is not registered as a superadmin account" },
        { status: 403 }
      );
    }

    // Verify the user exists in auth system
    const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(userData.id);
    
    if (authError || !authUser.user) {
      return NextResponse.json(
        { error: "Failed to verify superadmin account" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, message: "Email verified successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error verifying superadmin email:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
} 