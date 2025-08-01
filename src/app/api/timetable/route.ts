import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

interface PostRequestBody {
  version_number?: number;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");

  if (type === "versions") {
    const { data, error } = await supabase
      .from("timetable_data")
      .select("version_number")
      .order("version_number", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const versions = data.map((v) => v.version_number);
    return NextResponse.json(versions);
  }

  if (type === "global_version") {
    const { data, error } = await supabase
      .from("selected_version")
      .select("version_number")
      .eq("id", 1)
      .single();

    if (error || !data) {
      // Fallback to latest version from timetable_data
      const { data: versions, error: versionsError } = await supabase
        .from("timetable_data")
        .select("version_number")
        .order("version_number", { ascending: false })
        .limit(1);

      if (versionsError || !versions.length) {
        return NextResponse.json(
          { error: "No versions available" },
          { status: 404 }
        );
      }

      const versionNumber = versions[0].version_number || 1;

      // Update or insert default version
      const { error: updateError } = await supabase
        .from("selected_version")
        .update({ version_number: versionNumber })
        .eq("id", 1);

      if (updateError && updateError.code !== "PGRST116") {
        // PGRST116: No rows found
        return NextResponse.json(
          { error: updateError.message },
          { status: 500 }
        );
      }

      if (updateError && updateError.code === "PGRST116") {
        const { error: insertError } = await supabase
          .from("selected_version")
          .insert({ version_number: versionNumber });

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 }
          );
        }
      }

      return NextResponse.json({ version_number: versionNumber });
    }

    return NextResponse.json({ version_number: data.version_number });
  }

  // Default: Fetch timetable data for global version
  const { data: selectedVersion, error: versionError } = await supabase
    .from("selected_version")
    .select("version_number")
    .eq("id", 1)
    .single();

  if (versionError || !selectedVersion) {
    return NextResponse.json(
      { error: "Global version not found" },
      { status: 404 }
    );
  }

  const versionNumber = selectedVersion.version_number;

  try {
    const { data, error } = await supabase
      .from("timetable_data")
      .select("data")
      .eq("version_number", versionNumber)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: "Timetable data not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data.data);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
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
    const newVersionNumber =
      version_number && version_number <= latestVersion
        ? version_number
        : latestVersion + 1;

    // Save to database
    const { error: upsertError } = await supabase
      .from("timetable_data")
      .upsert(
        { version_number: newVersionNumber, data: timetableData },
        { onConflict: "version_number" }
      );

    if (upsertError) {
      throw new Error(upsertError.message);
    }

    return NextResponse.json({ version_number: newVersionNumber });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Save failed" },
      { status: 500 }
    );
  }
}

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

    // Get user from Supabase auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: User not authenticated" },
        { status: 401 }
      );
    }

    // Verify superadmin status
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    // Check if version exists in timetable_data
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

    // Update global version (only update, no insert)
    const { error: updateError } = await supabase
      .from("selected_version")
      .update({ version_number: versionNumber })
      .eq("id", 1);

    if (updateError) {
      throw new Error(updateError.message);
    }

    return NextResponse.json({ version_number: versionNumber });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Update failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  try {
    const { searchParams } = new URL(request.url);
    const version = searchParams.get("version_number");

    if (!version) {
      return NextResponse.json(
        { error: "Version number is required" },
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

    // Get user from Supabase auth
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized: User not authenticated" },
        { status: 401 }
      );
    }

    // Verify superadmin status
    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    if (roleError || !roleData) {
      return NextResponse.json(
        { error: "Unauthorized: Superadmin access required" },
        { status: 403 }
      );
    }

    // Check if version exists
    const { data: versionData, error: versionError } = await supabase
      .from("timetable_data")
      .select("version_number")
      .eq("version_number", versionNumber)
      .single();

    if (versionError || !versionData) {
      return NextResponse.json({ error: "Version not found" }, { status: 404 });
    }

    // Delete the version
    const { error } = await supabase
      .from("timetable_data")
      .delete()
      .eq("version_number", versionNumber);

    if (error) {
      throw new Error(error.message);
    }

    // If deleted version is the global version, reset to latest available
    const { data: globalVersion, error: globalError } = await supabase
      .from("selected_version")
      .select("version_number")
      .eq("id", 1)
      .single();

    if (globalError) {
      throw new Error(globalError.message);
    }

    if (globalVersion.version_number === versionNumber) {
      const { data: versions, error: versionsError } = await supabase
        .from("timetable_data")
        .select("version_number")
        .order("version_number", { ascending: false })
        .limit(1);

      if (versionsError) {
        throw new Error(versionsError.message);
      }

      const newGlobalVersion = versions[0]?.version_number || 1;
      const { error: updateError } = await supabase
        .from("selected_version")
        .update({ version_number: newGlobalVersion })
        .eq("id", 1);

      if (updateError) {
        throw new Error(updateError.message);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Delete failed" },
      { status: 500 }
    );
  }
}
