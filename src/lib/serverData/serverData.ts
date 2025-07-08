import { supabase } from "@/lib/supabase/supabase";
import { TimetableData } from "@/app/timetable/types";

export async function getServerData() {
  try {
    // Fetch all versions
    const { data: versionsData, error: versionsError } = await supabase
      .from("timetable_data")
      .select("version_number")
      .order("version_number", { ascending: true });

    if (versionsError || !versionsData) {
      throw new Error(versionsError?.message || "Failed to fetch versions");
    }

    const versions = versionsData.map((v) => v.version_number);
    const latestVersion = versions.length > 0 ? Math.max(...versions) : null;

    // Fetch timetable data for latest version
    let timetableData: TimetableData = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };

    if (latestVersion) {
      const { data: timetableRes, error: timetableError } = await supabase
        .from("timetable_data")
        .select("data")
        .eq("version_number", latestVersion)
        .single();

      if (!timetableError && timetableRes?.data) {
        timetableData = timetableRes.data as TimetableData;
      }
    }

    return {
      versions,
      selectedVersion: latestVersion,
      timetableData,
    };
  } catch (error) {
    console.error("Server data error:", error);
    return {
      versions: [],
      selectedVersion: null,
      timetableData: {
        Monday: [],
        Tuesday: [],
        Wednesday: [],
        Thursday: [],
        Friday: [],
      },
    };
  }
}
