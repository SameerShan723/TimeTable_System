import { supabase } from "@/lib/supabase/supabase";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
} from "@/app/timetable/types";
import { timeSlots, Rooms, Days } from "@/helpers/page";

interface SupabaseVersion {
  version_number: number;
  data: unknown;
}

const normalizeData = (rawData: unknown): TimetableData => {
  const normalized: TimetableData = Days.reduce(
    (acc, day) => ({ ...acc, [day]: [] }),
    {} as TimetableData
  );

  Days.forEach((day) => {
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
        if (!Rooms.includes(roomName)) return null;

        const sessions: unknown[] =
          typeof (roomObj as Record<string, unknown>)[roomName] === "object" &&
          Array.isArray((roomObj as Record<string, unknown>)[roomName])
            ? ((roomObj as Record<string, unknown>)[roomName] as unknown[])
            : [];

        const roomSchedule: RoomSchedule = {};
        roomSchedule[roomName] = timeSlots.map((time, index) => {
          const session = sessions[index];
          if (
            session &&
            typeof session === "object" &&
            "Teacher" in session &&
            "Subject" in session
          ) {
            return {
              Room: roomName,
              Time: time,
              Teacher:
                typeof (session as Record<string, unknown>).Teacher === "string"
                  ? ((session as Record<string, unknown>).Teacher as string)
                  : "",
              Subject:
                typeof (session as Record<string, unknown>).Subject === "string"
                  ? ((session as Record<string, unknown>).Subject as string)
                  : "",
              Section:
                typeof (session as Record<string, unknown>).Section === "string"
                  ? ((session as Record<string, unknown>).Section as string)
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

  return normalized;
};

export async function getServerData() {
  // Initialize default values
  let versions: number[] = [];
  let selectedVersion: number | null = null;
  let allVersionData: Record<number, TimetableData> = {};
  const defaultTimetableData: TimetableData = Days.reduce(
    (acc, day) => ({
      ...acc,
      [day]: Rooms.map((room) => ({
        [room]: timeSlots.map((time) => ({ Time: time } as EmptySlot)),
      })),
    }),
    {} as TimetableData
  );

  // Fetch all versions and their data
  const { data: versionDataRows, error: versionError } = await supabase
    .from("timetable_data")
    .select("version_number, data")
    .order("version_number", { ascending: true })
    .limit(50); // Limit to prevent excessive data; adjust as needed

  if (versionError || !versionDataRows || versionDataRows.length === 0) {
    const { error: insertError } = await supabase
      .from("timetable_data")
      .insert({ version_number: 1, data: defaultTimetableData });

    if (insertError) {
      console.error("Failed to initialize timetable:", insertError);
      return {
        versions: [1],
        selectedVersion: 1,
        allVersionData: { 1: defaultTimetableData },
      };
    }

    versions = [1];
    selectedVersion = 1;
    allVersionData = { 1: defaultTimetableData };
  } else {
    versions = versionDataRows.map((v: SupabaseVersion) => v.version_number);
    selectedVersion = versions[versions.length - 1];
    allVersionData = versionDataRows.reduce(
      (acc: Record<number, TimetableData>, row: SupabaseVersion) => {
        acc[row.version_number] = normalizeData(row.data);
        return acc;
      },
      {}
    );
  }

  return {
    versions,
    selectedVersion,
    allVersionData,
  };
}
