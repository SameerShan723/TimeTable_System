import { createSupabaseServerClient } from "@/lib/supabase/server";
import { TimetableData } from "@/app/timetable/types";

export interface TimetableServerData {
  versions: number[];
  selectedVersion: number | null;
  timetableData: TimetableData | null;
  isAuthenticated: boolean;
  isSuperadmin: boolean;
  error: string | null;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
  } | null;
}

export async function getTimetableData(): Promise<TimetableServerData> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const isAuthenticated = !authError && !!user;
  let isSuperadmin = false;

  let userObj = null;
  if (isAuthenticated && user) {
    userObj = {
      id: user.id,
      email: user.email || "",
      name: user.user_metadata?.full_name || user.user_metadata?.name,
      avatar_url:

        user.user_metadata?.profile_picture ||
        user.user_metadata?.picture ||
        "",
    };

    const { data: roleData, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("id", user.id)
      .eq("role", "superadmin")
      .maybeSingle();

    isSuperadmin = !roleError && !!roleData;
  }

  // Fetch all versions
  const { data: versionsData, error: versionsError } = await supabase
    .from("timetable_data")
    .select("version_number")
    .order("version_number", { ascending: true });

  const versions = versionsError
    ? []
    : versionsData.map((v) => v.version_number);

  // Fetch global version from selected_version
  const { data: selectedVersion, error: versionError } = await supabase
    .from("selected_version")
    .select("version_number")
    .eq("id", 1)
    .single();

  if (versionError || !selectedVersion) {
    // Only return error if no versions exist in timetable_data
    if (versions.length === 0) {
      return {
        versions: [],
        selectedVersion: null,
        timetableData: null,
        isAuthenticated,
        isSuperadmin,
        error:
          versionError?.message || "No global version or timetable data found",
        user: userObj,
      };
    }

    // Use default version (1) if selected_version is empty
    const defaultVersion = 1;
    const { data: timetableData, error: dataError } = await supabase
      .from("timetable_data")
      .select("data")
      .eq("version_number", defaultVersion)
      .single();

    return {
      versions,
      selectedVersion: defaultVersion,
      timetableData: timetableData ? timetableData.data : null,
      isAuthenticated,
      isSuperadmin,
      error: dataError
        ? dataError.message
        : "Global version not found, using default version",
      user: userObj,
    };
  }

  // Fetch timetable data for the selected version
  const { data: timetableData, error: dataError } = await supabase
    .from("timetable_data")
    .select("data")
    .eq("version_number", selectedVersion.version_number)
    .single();

  if (dataError || !timetableData) {
    return {
      versions,
      selectedVersion: selectedVersion.version_number,
      timetableData: null,
      isAuthenticated,
      isSuperadmin,
      error:
        dataError?.message || "Timetable data not found for selected version",
      user: userObj,
    };
  }

  return {
    versions,
    selectedVersion: selectedVersion?.version_number ?? null,
    timetableData: timetableData?.data ?? null,
    isAuthenticated,
    isSuperadmin,
    error: null,
    user: userObj,
  };
}
