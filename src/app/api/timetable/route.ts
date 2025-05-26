import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase/supabase";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
} from "../../timetable/types";
import { timeSlots } from "@/helpers/page";
import { PREDEFINED_ROOMS } from "@/helpers/page";
import { DAYS } from "@/helpers/page";

// const timeSlots: string[] = [
//   "9:30-10:30",
//   "10:30-11:30",
//   "11:30-12:30",
//   "12:30-1:30",
//   "1:30-2:30",
//   "2:30-3:30",
//   "3:30-4:30",
// ];

// const PREDEFINED_ROOMS: string[] = [
//   "NAB-R01",
//   "NAB-R02",
//   "NAB-R03",
//   "NAB-R04",
//   "NAB-R05",
//   "NAB-R06",
//   "NAB-R07",
//   "NAB-R08",
//   "NAB-R09",
//   "NAB-R10",
//   "NAB-R11",
//   "NAB-R12",
//   "Lab1",
//   "Lab2",
//   "Lab3",
//   "Lab4",
//   "R210-lab",
// ];

// const DAY_ORDER: string[] = [
//   "Monday",
//   "Tuesday",
//   "Wednesday",
//   "Thursday",
//   "Friday",
// ];

interface SupabaseVersion {
  version_number: number;
}

interface PostRequestBody {
  version_number?: number;
  [key: string]: unknown;
}

const normalizeData = (rawData: unknown): TimetableData => {
  const normalized: TimetableData = {};

  DAYS.forEach((day) => {
    const daySchedule: RoomSchedule[] =
      typeof rawData === "object" &&
      rawData !== null &&
      day in rawData &&
      Array.isArray((rawData as Record<string, unknown>)[day])
        ? ((rawData as Record<string, unknown>)[day] as RoomSchedule[])
        : [];

    const validRooms: RoomSchedule[] = daySchedule
      .map((roomObj: unknown) => {
        if (!roomObj || typeof roomObj !== "object") return null;
        const roomName = Object.keys(roomObj)[0];
        if (!PREDEFINED_ROOMS.includes(roomName)) return null;

        const sessions: unknown[] =
          typeof (roomObj as Record<string, unknown>)[roomName] === "object" &&
          Array.isArray((roomObj as Record<string, unknown>)[roomName])
            ? ((roomObj as Record<string, unknown>)[roomName] as unknown[])
            : [];

        // Create the room schedule object with proper typing
        const roomSchedule: RoomSchedule = {};
        roomSchedule[roomName] = timeSlots.map((time, index) => {
          const session = sessions[index];
          if (
            session &&
            typeof session === "object" &&
            "Faculty Assigned" in session &&
            "Course Details" in session
          ) {
            return {
              Room: roomName,
              Time: time,
              "Faculty Assigned":
                typeof (session as Record<string, unknown>)[
                  "Faculty Assigned"
                ] === "string"
                  ? ((session as Record<string, unknown>)[
                      "Faculty Assigned"
                    ] as string)
                  : "",
              "Course Details":
                typeof (session as Record<string, unknown>)[
                  "Course Details"
                ] === "string"
                  ? ((session as Record<string, unknown>)[
                      "Course Details"
                    ] as string)
                  : "",
              "Subject Type":
                typeof (session as Record<string, unknown>)["Subject Type"] ===
                "string"
                  ? ((session as Record<string, unknown>)[
                      "Subject Type"
                    ] as string)
                  : undefined,
              Domain:
                typeof (session as Record<string, unknown>).Domain === "string"
                  ? ((session as Record<string, unknown>).Domain as string)
                  : undefined,
              "Pre-Req":
                typeof (session as Record<string, unknown>)["Pre-Req"] ===
                "string"
                  ? ((session as Record<string, unknown>)["Pre-Req"] as string)
                  : undefined,
              Section:
                typeof (session as Record<string, unknown>).Section === "string"
                  ? ((session as Record<string, unknown>).Section as string)
                  : undefined,
              "Semester Details":
                typeof (session as Record<string, unknown>)[
                  "Semester Details"
                ] === "string"
                  ? ((session as Record<string, unknown>)[
                      "Semester Details"
                    ] as string)
                  : undefined,
            } as Session;
          }
          return { Time: time } as EmptySlot;
        });

        return roomSchedule;
      })
      .filter((roomObj): roomObj is RoomSchedule => roomObj !== null);

    normalized[day] = validRooms;
  });

  console.log("Normalized data (page.tsx):", normalized);
  return normalized;
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version");
  const type = searchParams.get("type");

  console.log("GET request:", { version, type });

  if (type === "versions") {
    const { data, error } = await supabase
      .from("timetable_data")
      .select("version_number")
      .order("version_number", { ascending: true });

    if (error) {
      console.error("Supabase error fetching versions:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data as SupabaseVersion[]);
  }

  if (!version) {
    return NextResponse.json(
      { error: "Version parameter is required" },
      { status: 400 }
    );
  }

  const versionNumber = Number(version);
  if (
    isNaN(versionNumber) ||
    versionNumber <= 0 ||
    !Number.isInteger(versionNumber)
  ) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("timetable_data")
    .select("data")
    .eq("version_number", versionNumber)
    .maybeSingle();

  if (error) {
    console.error("Supabase error fetching timetable:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data?.data) {
    return NextResponse.json(
      { error: "No data found for this version" },
      { status: 404 }
    );
  }

  const normalizedData = normalizeData(data.data);
  return NextResponse.json(normalizedData);
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as PostRequestBody;
  const { version_number, ...timetableData } = body;

  console.log("POST request:", { version_number, timetableData });

  if (!timetableData || typeof timetableData !== "object") {
    return NextResponse.json(
      { error: "Invalid timetable data" },
      { status: 400 }
    );
  }

  const normalizedData = normalizeData(timetableData);

  const { data: existingData, error: fetchError } = await supabase
    .from("timetable_data")
    .select("version_number")
    .order("version_number", { ascending: false })
    .limit(1);

  if (fetchError) {
    console.error(
      "Supabase error fetching latest version:",
      fetchError.message
    );
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  const latestVersion = existingData[0]?.version_number || 0;
  const newVersion =
    version_number && version_number <= latestVersion
      ? version_number
      : latestVersion + 1;

  const { error: upsertError } = await supabase
    .from("timetable_data")
    .upsert(
      { version_number: newVersion, data: normalizedData },
      { onConflict: "version_number" }
    );

  if (upsertError) {
    console.error("Supabase error saving timetable:", upsertError.message);
    return NextResponse.json({ error: upsertError.message }, { status: 500 });
  }

  return NextResponse.json({ version_number: newVersion });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const version = searchParams.get("version_number");

  console.log("DELETE request:", { version });

  if (!version) {
    return NextResponse.json(
      { error: "Version number is required" },
      { status: 400 }
    );
  }

  const versionNumber = Number(version);
  if (
    isNaN(versionNumber) ||
    versionNumber <= 0 ||
    !Number.isInteger(versionNumber)
  ) {
    return NextResponse.json(
      { error: "Invalid version number" },
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from("timetable_data")
    .delete()
    .eq("version_number", versionNumber);

  if (error) {
    console.error("Supabase error deleting version:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ version_number: versionNumber });
}
