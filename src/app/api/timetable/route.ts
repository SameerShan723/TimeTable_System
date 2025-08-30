import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TimetableData, Session, EmptySlot, RoomSchedule } from "@/app/timetable/types";

interface PostRequestBody {
  version_number?: number;
  [key: string]: unknown;
}

export async function GET(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const version = searchParams.get("version");
  const fetchOnly = searchParams.get("fetch_only") === "true";

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

  // If version parameter is provided and fetch_only is true, fetch that specific version
  if (version && fetchOnly) {
    const versionNumber = parseInt(version);
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
          { error: "Timetable data not found for specified version" },
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

// export async function PUT(request: NextRequest) {
//   const supabase = await createSupabaseServerClient();
//   try {
//     const { searchParams } = new URL(request.url);
//     const version = searchParams.get("version");

//     if (!version) {
//       return NextResponse.json(
//         { error: "Version parameter is required" },
//         { status: 400 }
//       );
//     }

//     const versionNumber = parseInt(version);
//     if (isNaN(versionNumber) || versionNumber <= 0) {
//       return NextResponse.json(
//         { error: "Invalid version number" },
//         { status: 400 }
//       );
//     }

//     // Get user from Supabase auth
//     // const {
//     //   data: { user },
//     //   error: authError,
//     // } = await supabase.auth.getUser();
//     // if (authError || !user) {
//     //   return NextResponse.json(
//     //     { error: "Unauthorized: User not authenticated" },
//     //     { status: 401 }
//     //   );
//     // }

//     // Verify superadmin status
//     // const { data: roleData, error: roleError } = await supabase
//     //   .from("user_roles")
//     //   .select("role")
//     //   .eq("id", user.id)
//     //   .eq("role", "superadmin")
//     //   .maybeSingle();

//     // if (roleError || !roleData) {
//     //   return NextResponse.json(
//     //     { error: "Unauthorized: Superadmin access required" },
//     //     { status: 403 }
//     //   );
//     // }

//     // Check if version exists in timetable_data
//     const { data: versionData, error: versionError } = await supabase
//       .from("timetable_data")
//       .select("version_number")
//       .eq("version_number", versionNumber)
//       .single();

//     if (versionError || !versionData) {
//       return NextResponse.json(
//         { error: "Version not found in timetable data" },
//         { status: 404 }
//       );
//     }

//     // Update global version (only update, no insert)
//     const { error: updateError } = await supabase
//       .from("selected_version")
//       .update({ version_number: versionNumber })
//       .eq("id", 1);

//     if (updateError) {
//       throw new Error(updateError.message);
//     }

//     return NextResponse.json({ version_number: versionNumber });
//   } catch (error) {
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Update failed" },
//       { status: 500 }
//     );
//   }
// }

export async function PATCH(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  try {
    const { searchParams } = new URL(request.url);
    const operation = searchParams.get("operation");
    const version = searchParams.get("version");

    if (!operation || !version) {
      return NextResponse.json(
        { error: "Operation and version parameters are required" },
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

    const body = await request.json();
    
    if (operation === "add_class") {
      const { day, room, time, classData } = body;
      
      // Get current timetable data
      const { data: currentData, error: fetchError } = await supabase
        .from("timetable_data")
        .select("data")
        .eq("version_number", versionNumber)
        .single();

      if (fetchError || !currentData) {
        return NextResponse.json(
          { error: "Timetable data not found" },
          { status: 404 }
        );
      }

      // Update the data locally
      const updatedData = { ...currentData.data } as TimetableData;
      if (!updatedData[day]) {
        updatedData[day] = [];
      }

      // Find or create room data
      let roomData = updatedData[day].find((r: RoomSchedule) => Object.keys(r)[0] === room);
      if (!roomData) {
        roomData = { [room]: [] };
        updatedData[day].push(roomData);
      }

      // Find time slot and update
      const sessions = roomData[room] || [];
      const sessionIndex = sessions.findIndex((s: Session | EmptySlot) => s.Time === time);
      if (sessionIndex !== -1) {
        sessions[sessionIndex] = {
          Time: time,
          Room: room,
          Subject: classData.subject,
          Teacher: classData.teacher,
          Section: classData.section,
        };
      }

      // Save updated data
      const { error: saveError } = await supabase
        .from("timetable_data")
        .update({ data: updatedData })
        .eq("version_number", versionNumber);

      if (saveError) {
        throw new Error(saveError.message);
      }

      return NextResponse.json({ 
        success: true, 
        data: updatedData,
        message: "Class added successfully" 
      });

    } else if (operation === "delete_class") {
      const { day, room, time } = body;
      
      // Get current timetable data
      const { data: currentData, error: fetchError } = await supabase
        .from("timetable_data")
        .select("data")
        .eq("version_number", versionNumber)
        .single();

      if (fetchError || !currentData) {
        return NextResponse.json(
          { error: "Timetable data not found" },
          { status: 404 }
        );
      }

      // Update the data locally
      const updatedData = { ...currentData.data } as TimetableData;
      const roomData = updatedData[day]?.find((r: RoomSchedule) => Object.keys(r)[0] === room);
      
      if (roomData) {
        const sessions = roomData[room] || [];
        const sessionIndex = sessions.findIndex((s: Session | EmptySlot) => s.Time === time);
        if (sessionIndex !== -1) {
          sessions[sessionIndex] = { Time: time };
        }
      }

      // Save updated data
      const { error: saveError } = await supabase
        .from("timetable_data")
        .update({ data: updatedData })
        .eq("version_number", versionNumber);

      if (saveError) {
        throw new Error(saveError.message);
      }

      return NextResponse.json({ 
        success: true, 
        data: updatedData,
        message: "Class deleted successfully" 
      });
    }

    return NextResponse.json(
      { error: "Invalid operation" },
      { status: 400 }
    );

  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Operation failed" },
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
