import { supabase } from "@/lib/supabase/supabase";
import ClientTimetable from "./timetable/CLientTimetable";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
} from "./timetable/types";
import { timeSlots } from "@/helpers/page";
import { Rooms } from "@/helpers/page";
import { Days } from "@/helpers/page";

interface SupabaseVersion {
  version_number: number;
}

const normalizeData = (rawData: unknown): TimetableData => {
  const normalized: TimetableData = Days.reduce(
    (acc, day) => ({ ...acc, [day]: [] }),
    {}
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
              Domain:
                typeof (session as Record<string, unknown>).Domain === "string"
                  ? ((session as Record<string, unknown>).Domain as string)
                  : undefined,
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

interface HomePageProps {
  searchParams: Promise<{ version?: string }>;
}

export default async function HomePage({ searchParams }: HomePageProps) {
  const resolvedSearchParams = await searchParams;
  const versionParam = resolvedSearchParams.version;

  const { data: versionData, error: versionError } = await supabase
    .from("timetable_data")
    .select("version_number")
    .order("version_number", { ascending: true });

  if (versionError || !versionData || versionData.length === 0) {
    // Create a default version if none exists
    const defaultData: TimetableData = Days.reduce(
      (acc, day) => ({
        ...acc,
        [day]: Rooms.map((room) => ({
          [room]: timeSlots.map((time) => ({ Time: time } as EmptySlot)),
        })),
      }),
      {}
    );
    const { error: insertError } = await supabase
      .from("timetable_data")
      .insert({ version_number: 1, data: defaultData });

    if (insertError) {
      return (
        <div className="flex justify-center items-center h-64 flex-1 bg-gray-50">
          <div className="text-xl text-red-500">
            Error: Failed to initialize timetable
          </div>
        </div>
      );
    }

    return (
      <main className="bg-gray-50">
        <ClientTimetable
          initialData={defaultData}
          versions={[1]}
          initialSelectedVersion={1}
        />
      </main>
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

  let timetableData: TimetableData = Days.reduce(
    (acc, day) => ({
      ...acc,
      [day]: Rooms.map((room) => ({
        [room]: timeSlots.map((time) => ({ Time: time } as EmptySlot)),
      })),
    }),
    {}
  );

  if (selectedVersion !== undefined) {
    const { data, error } = await supabase
      .from("timetable_data")
      .select("data")
      .eq("version_number", selectedVersion)
      .maybeSingle();

    if (error || !data?.data) {
      return (
        <div className="flex justify-center items-center h-64 flex-1 bg-gray-50">
          <div className="text-xl text-red-500">
            Error: Failed to load timetable for version {selectedVersion}
          </div>
        </div>
      );
    }

    timetableData = normalizeData(data.data);
  }

  return (
    <main className="bg-gray-50">
      <ClientTimetable
        initialData={timetableData}
        versions={versions}
        initialSelectedVersion={selectedVersion}
      />
    </main>
  );
}
