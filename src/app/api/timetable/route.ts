import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

interface PostRequestBody {
  version_number?: number;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version");
  const type = searchParams.get("type");

  if (type === "versions") {
    const { data, error } = await supabase
      .from("timetable_data")
      .select("version_number")
      .order("version_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  }

  if (!version) {
    return NextResponse.json(
      { error: "Version parameter is required" },
      { status: 400 }
    );
  }

  const versionNumber = Number(version);
  if (isNaN(versionNumber) || versionNumber <= 0) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  try {
    const { data, error } = await supabase
      .from("timetable_data")
      .select("data")
      .eq("version_number", versionNumber)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: error?.message || "Data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data.data);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as PostRequestBody;
    const { version_number, ...timetableData } = body;

    // Get latest version
    const { data: versions, error: versionsError } = await supabase
      .from("timetable_data")
      .select("version_number")
      .order("version_number", { ascending: false })
      .limit(1);

    if (versionsError) {
      throw new Error(versionsError.message);
    }

    const latestVersion = versions[0]?.version_number || 0;
    const newVersion =
      version_number && version_number <= latestVersion
        ? version_number
        : latestVersion + 1;

    // Save to database
    const { error: upsertError } = await supabase
      .from("timetable_data")
      .upsert(
        { version_number: newVersion, data: timetableData },
        { onConflict: "version_number" }
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    return NextResponse.json({ version_number: newVersion });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version_number");

  if (!version) {
    return NextResponse.json(
      { error: "Version number is required" },
      { status: 400 }
    );
  }

  const versionNumber = Number(version);
  if (isNaN(versionNumber) || versionNumber <= 0) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  try {
    const { error } = await supabase
      .from("timetable_data")
      .delete()
      .eq("version_number", versionNumber);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
