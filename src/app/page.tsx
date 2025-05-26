import { supabase } from "@/lib/supabase/supabase";
import ClientTimetable from "./timetable/CLientTimetable";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
} from "./timetable/types";
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

  // console.log("Normalized data (page.tsx):", normalized);
  return normalized;
};
interface HomePageProps {
  searchParams: Promise<{ version?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const versionParam = resolvedSearchParams.version;

  // console.log("Fetching versions for initial load");
  const { data: versionData, error: versionError } = await supabase
    .from("timetable_data")
    .select("version_number")
    .order("version_number", { ascending: true });

  if (versionError) {
    // console.error("Supabase error fetching versions:", versionError.message);
    return (
      <div className="flex justify-center items-center h-64 flex-1">
        <div className="text-xl text-red-500">
          Error: Failed to load versions
        </div>
      </div>
    );
  }

  const versions: number[] = versionData.map(
    (v: SupabaseVersion) => v.version_number
  );
  let selectedVersion: number | undefined;

  if (versionParam) {
    const parsedVersion = Number(versionParam);
    if (
      !isNaN(parsedVersion) &&
      parsedVersion > 0 &&
      Number.isInteger(parsedVersion) &&
      versions.includes(parsedVersion)
    ) {
      selectedVersion = parsedVersion;
    }
  }

  if (!selectedVersion && versions.length > 0) {
    selectedVersion = versions[versions.length - 1];
  }

  let timetableData: TimetableData = DAYS.reduce(
    (acc, day) => ({ ...acc, [day]: [] }),
    {}
  );
  if (selectedVersion !== undefined) {
    // console.log(`Fetching timetable for version ${selectedVersion}`);
    const { data, error } = await supabase
      .from("timetable_data")
      .select("data")
      .eq("version_number", selectedVersion)
      .maybeSingle();

    if (error) {
      console.error("Supabase error fetching timetable:", error.message);
      return (
        <div className="flex justify-center items-center h-64 flex-1">
          <div className="text-xl text-red-500">
            Error: Failed to load timetable
          </div>
        </div>
      );
    }

    if (data?.data) {
      timetableData = normalizeData(data.data);
    } else {
      // console.warn(`No data found for version ${selectedVersion}`);
    }
  }

  return (
    <main>
      <ClientTimetable
        initialData={timetableData}
        versions={versions}
        initialSelectedVersion={selectedVersion}
      />
    </main>
  );
}
