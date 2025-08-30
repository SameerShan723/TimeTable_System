import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function PUT(request: NextRequest) {
  const supabase = await createSupabaseServerClient();

  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version");

    if (!version) {
      return NextResponse.json(
        { error: "Version parameter is required" },
        { status: 400 }
      );
    }

    const versionNumber = parseInt(version);
    if (isNaN(versionNumber) || versionNumber <= 0) {
      return NextResponse.json(
        { error: "Invalid version number" },
        { status: 400 }
      );
    }

    const { data: versionData, error: versionError } = await supabase
      .from("timetable_data")
      .select("version_number")
      .eq("version_number", versionNumber)
      .single();

    if (versionError || !versionData) {
      return NextResponse.json(
        { error: "Version not found in timetable data" },
        { status: 404 }
      );
    }

    const { error: updateError } = await supabase
      .from("selected_version")
      .update({ version_number: versionNumber })
      .eq("id", 1);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({
      success: true,
      version_number: versionNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}
