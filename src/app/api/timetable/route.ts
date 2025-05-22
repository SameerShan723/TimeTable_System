import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";

const PREDEFINED_ROOMS = [
  "NAB-R01",
  "NAB-R02",
  "NAB-R03",
  "NAB-R04",
  "NAB-R05",
  "NAB-R06",
  "NAB-R07",
  "NAB-R08",
  "NAB-R09",
  "NAB-R10",
  "NAB-R11",
  "NAB-R12",
  "Lab1",
  "Lab2",
  "Lab3",
  "Lab4",
  "R210-lab",
];

const DAY_ORDER = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export async function GET(request: NextRequest) {
  try {
    // Debug query to check all table access
    const { data: debugData, error: debugError } = await supabase
      .from("timetable_data")
      .select("*");
    console.log("Debug query result:", debugData, "Debug error:", debugError);

    // Parse version parameter
    const versionParam = request.nextUrl.searchParams.get("version");
    let version: number | null = null;
    if (versionParam) {
      const parsedVersion = Number(versionParam);
      if (
        !isNaN(parsedVersion) &&
        parsedVersion > 0 &&
        Number.isInteger(parsedVersion)
      ) {
        version = parsedVersion;
        console.log("Parsed and validated version:", version);
      } else {
        console.warn("Invalid version parameter:", versionParam);
      }
    } else {
      console.log("No version parameter provided, defaulting to latest");
    }
    // console.log("Requested version:", version ?? "default (latest)");

    // Build the query
    let query = supabase
      .from("timetable_data")
      .select("data, version_number")
      .order("version_number", { ascending: false });
    // console.log("Query built:", query);

    if (version !== null) {
      // console.log("Filtering for version:", version);
      query = query.eq("version_number", version).limit(1);
    } else {
      console.log("Fetching the latest version");
      query = query.limit(1);
    }

    const { data, error } = await query.maybeSingle();
    console.log("Query result - Data:", data, "Error:", error);

    if (error) {
      console.error("Supabase GET error:", error);
      return NextResponse.json(
        { error: "Database error", detail: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn("No timetable data found for version:", version ?? "latest");
      return NextResponse.json({
        Monday: [],
        version_number: 0,
      });
    }

    // console.log("Fetched data from Supabase:", data);

    const filteredData = Object.fromEntries(
      DAY_ORDER.map((day) => {
        const rooms = data.data[day] || [];
        if (!Array.isArray(rooms)) {
          console.warn(`Invalid rooms array for ${day}:`, rooms);
          return [day, []];
        }
        const validRooms = rooms
          .flatMap((roomObj: string) => {
            const roomName = Object.keys(roomObj)[0];
            console.log(`Checking room: ${roomName} against PREDEFINED_ROOMS`);
            return PREDEFINED_ROOMS.includes(roomName) ? [roomObj] : [];
          })
          .filter((room: string) => Object.keys(room).length > 0);
        return [day, validRooms.length > 0 ? validRooms : []];
      })
    );

    console.log("Filtered data:", filteredData);

    return NextResponse.json({
      ...filteredData,
      version_number: data.version_number,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error fetching timetable:", error);
      return NextResponse.json(
        { error: "Could not load data", detail: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    console.log("Received timetable data:", body);

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid JSON data" }, { status: 400 });
    }

    const { version_number, ...timetableData } = body;

    // Only include days from DAY_ORDER and filter rooms
    const filteredData = Object.fromEntries(
      DAY_ORDER.map((day) => {
        const rooms = timetableData[day] || [];
        return [
          day,
          Array.isArray(rooms)
            ? rooms.filter((roomObj: string[]) => {
                const roomName = Object.keys(roomObj)[0];
                return PREDEFINED_ROOMS.includes(roomName);
              })
            : [],
        ];
      })
    );

    // console.log("Filtered data for saving:", filteredData);
    // console.log("Version number received:", version_number);

    if (
      version_number !== null &&
      version_number !== undefined &&
      Number.isInteger(version_number) &&
      version_number > 0
    ) {
      // Check if the version exists
      const { data: existingVersion, error: versionError } = await supabase
        .from("timetable_data")
        .select("version_number, data")
        .eq("version_number", version_number)
        .maybeSingle();

      if (versionError) {
        console.error("Error checking version:", versionError);
        return NextResponse.json(
          { error: "Could not verify version", detail: versionError.message },
          { status: 500 }
        );
      }

      if (!existingVersion) {
        console.warn(`Version ${version_number} does not exist`);
        return NextResponse.json(
          { error: "Specified version does not exist" },
          { status: 404 }
        );
      }

      // Update existing version
      const { data, error } = await supabase
        .from("timetable_data")
        .update({ data: filteredData })
        .eq("version_number", version_number)
        .select("version_number, data")
        .single();

      if (error) {
        console.error("Supabase UPDATE error:", error);
        return NextResponse.json(
          { error: "Could not update data", detail: error.message },
          { status: 500 }
        );
      }

      console.log(`Updated timetable for version: ${version_number}`, data);
      return NextResponse.json({
        success: true,
        version_number: data.version_number,
        data: data.data,
      });
    } else {
      // Create new version
      const { data: latestData, error: latestError } = await supabase
        .from("timetable_data")
        .select("version_number")
        .order("version_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (latestError) {
        console.error("Error fetching latest version:", latestError);
        return NextResponse.json(
          { error: "Could not fetch version", detail: latestError.message },
          { status: 500 }
        );
      }

      const newVersion = latestData ? latestData.version_number + 1 : 1;

      const { data, error } = await supabase
        .from("timetable_data")
        .insert([{ data: filteredData, version_number: newVersion }])
        .select("version_number, data")
        .single();

      if (error) {
        console.error("Supabase POST error:", error);
        return NextResponse.json(
          { error: "Could not save data", detail: error.message },
          { status: 500 }
        );
      }

      console.log(
        "Saved timetable successfully with version:",
        newVersion,
        data
      );
      return NextResponse.json({
        success: true,
        version_number: newVersion,
        data: data.data,
      });
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error saving timetable:", error);
      return NextResponse.json(
        { error: "Could not save data", detail: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const versionNumber = request.nextUrl.searchParams.get("version_number");

    if (!versionNumber || isNaN(parseInt(versionNumber))) {
      return NextResponse.json(
        {
          error: "version_number is required and must be a valid number",
        },
        { status: 400 }
      );
    }

    const versionNum = parseInt(versionNumber);

    const { error } = await supabase
      .from("timetable_data")
      .delete()
      .eq("version_number", versionNum);

    if (error) {
      console.error("Deletion error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: "Version deleted successfully",
      version_number: versionNum,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error("Error deleting timetable:", error);
      return NextResponse.json(
        { error: "Could not delete data", detail: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(
      { error: "Unknown error occurred" },
      { status: 500 }
    );
  }
}
