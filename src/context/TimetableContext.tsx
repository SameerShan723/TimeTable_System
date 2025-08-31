"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import { usePathname } from "next/navigation";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
} from "@/app/timetable/types";
import { useAuth } from "@/context/AuthContext";
interface Conflict {
  day: keyof TimetableData;
  time: string;
  room: string;
  classIndex: number;
  message: string;
}
interface TimetableVersionContextType {
  versions: number[];
  selectedVersion: number | null;
  timetableData: TimetableData;
  conflicts: Conflict[];
  loading: boolean;
  error: string | null;
  setSelectedVersion: (version: number) => Promise<void>;
  finalizeVersion: (version: number) => Promise<void>;
  saveTimetableData: (data: TimetableData, version?: number) => Promise<number>;
  saveTimetableDataWithConflicts: (data: TimetableData, version?: number) => Promise<number>;
  deleteVersion: (version: number) => Promise<void>;
  checkConflicts: (data: TimetableData) => void;
  setTimetableData: (data: TimetableData) => void;
  fetchVersions: () => Promise<void>;
  fetchGlobalVersion: () => Promise<void>;
}

interface TimetableVersionProviderProps {
  children: React.ReactNode;
  initialData: {
    versions: number[];
    selectedVersion: number | null;
    timetableData: TimetableData | null;
  };
}

const TimetableVersionContext = createContext<
  TimetableVersionContextType | undefined
>(undefined);

export const TimetableVersionProvider: React.FC<
  TimetableVersionProviderProps
> = ({ children, initialData }) => {
  const { isSuperadmin } = useAuth();
  const pathname = usePathname();
  
  // Only show toasts when on timetable-related pages
  const isTimetablePage = pathname.startsWith("/timetable") || pathname === "/";
  
  const [versions, setVersions] = useState<number[]>(
    initialData.versions || []
  );
  const [selectedVersion, setSelectedVersionState] = useState<number | null>(
    initialData.selectedVersion
  );
  const [timetableData, setTimetableData] = useState<TimetableData>(
    initialData.timetableData || {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    }
  );
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Helper function to show toasts only on timetable pages
  const showToast = useCallback((type: 'success' | 'error' | 'warning', message: string) => {
    if (isTimetablePage) {
      if (type === 'success') {
        toast.success(message);
      } else if (type === 'error') {
        toast.error(message);
      } else if (type === 'warning') {
        toast.warning(message);
      }
    }
  }, [isTimetablePage]);

  const checkConflicts = useCallback((data: TimetableData) => {
    const newConflicts: Conflict[] = [];
    const days = Object.keys(data) as (keyof TimetableData)[];

    days.forEach((day) => {
      const dayData = data[day];
      if (!Array.isArray(dayData)) return;

      const timeSlots = new Set<string>();
      dayData.forEach((roomSchedule: RoomSchedule) => {
        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName] || [];
        sessions.forEach((session: Session | EmptySlot, index: number) => {
          if (!("Teacher" in session)) return;

          const { Time, Teacher, Subject, Section } = session;

          // Check for teacher conflicts
          const teacherConflict = dayData.some((otherRoom: RoomSchedule) => {
            const otherRoomName = Object.keys(otherRoom)[0];
            const otherSessions = otherRoom[otherRoomName] || [];
            return (
              roomName !== otherRoomName &&
              otherSessions.some(
                (otherSession: Session | EmptySlot) =>
                  "Teacher" in otherSession &&
                  otherSession.Teacher === Teacher &&
                  otherSession.Time === Time
              )
            );
          });

          if (teacherConflict) {
            newConflicts.push({
              day,
              time: Time,
              room: roomName,
              classIndex: index,
              message: `Teacher ${Teacher} is scheduled for multiple classes at ${Time}`,
            });
          }

          // Check for subject conflicts (only when same subject AND section at same time)
          const subjectConflict = dayData.some((otherRoom: RoomSchedule) => {
            const otherRoomName = Object.keys(otherRoom)[0];
            const otherSessions = otherRoom[otherRoomName] || [];
            return (
              roomName !== otherRoomName &&
              otherSessions.some(
                (otherSession: Session | EmptySlot) =>
                  "Subject" in otherSession &&
                  "Section" in otherSession &&
                  otherSession.Subject === Subject &&
                  otherSession.Section === Section &&
                  otherSession.Time === Time
              )
            );
          });

          if (subjectConflict) {
            newConflicts.push({
              day,
              time: Time,
              room: roomName,
              classIndex: index,
              message: `Subject ${Subject} Section ${Section} is scheduled in multiple rooms at ${Time}`,
            });
          }

          // Check for section conflicts (same section having multiple classes at same time)
          const sectionConflict = dayData.some((otherRoom: RoomSchedule) => {
            const otherRoomName = Object.keys(otherRoom)[0];
            const otherSessions = otherRoom[otherRoomName] || [];
            return (
              roomName !== otherRoomName &&
              otherSessions.some(
                (otherSession: Session | EmptySlot) =>
                  "Section" in otherSession &&
                  otherSession.Section === Section &&
                  otherSession.Time === Time
              )
            );
          });

          if (sectionConflict) {
            newConflicts.push({
              day,
              time: Time,
              room: roomName,
              classIndex: index,
              message: `Section ${Section} has multiple classes at ${Time}`,
            });
          }

          timeSlots.add(Time);
        });
      });
    });

    setConflicts(newConflicts);

    if (newConflicts.length > 0) {
      if (isSuperadmin) {
        showToast('error', "Conflicts detected in the timetable. Please resolve them.");
      }
    }
  }, [isSuperadmin, showToast]);

  const fetchTimetableData = useCallback(
    async (version: number) => {
      // setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/timetable?version=${version}`);
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch timetable data");
        }
        const data = await response.json();
        setTimetableData(data);
        checkConflicts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        showToast('error', err instanceof Error ? err.message : "Failed to fetch timetable data");
      } finally {
        setLoading(false);
      }
    },
    [checkConflicts, showToast]
  );

  const fetchVersions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/timetable?type=versions");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch versions");
      }
      const data = await response.json();
      setVersions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      showToast('error', err instanceof Error ? err.message : "Failed to fetch versions");
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  const fetchGlobalVersion = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/timetable?type=global_version");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch ");
      }
      const data = await response.json();
      const version = data.version_number;
      if (version !== null && !isNaN(version)) {
        setSelectedVersionState(version);
        await fetchTimetableData(version);
      } else {
        throw new Error("Invalid  version received");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      showToast('error', err instanceof Error ? err.message : "Failed to fetch ");
    } finally {
      setLoading(false);
    }
  }, [fetchTimetableData, showToast]);

  const setSelectedVersion = useCallback(
    async (version: number) => {
      setLoading(true);
      try {
        // Fetch the timetable data for the selected version without changing the global version
        const response = await fetch(
          `/api/timetable?version=${version}&fetch_only=true`
        );
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to fetch version data");
        }

        const data = await response.json();
        setSelectedVersionState(version);
        setTimetableData(data);
        checkConflicts(data);
        showToast('success', `Successfully loaded Version ${version}`);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to set version"
        );
        showToast('error',
          err instanceof Error ? err.message : "Failed to set version"
        );
      } finally {
        setLoading(false);
      }
    },
    [checkConflicts, showToast]
  );

 const finalizeVersion = useCallback(
  async (version: number) => {
    try {
      const response = await fetch(`/api/finalize-version?version=${version}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to finalize version");
      }

      const data = await response.json();
      showToast(
        "success",
        `Version ${data.version_number} has been finalized as the global version!`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to finalize version");
      showToast(
        "error",
        err instanceof Error ? err.message : "Failed to finalize version"
      );
      throw err;
    }
  },
  [showToast]
);


  const saveTimetableData = useCallback(
    async (data: TimetableData, version?: number) => {
      checkConflicts(data);
      if (conflicts.length > 0) {
        showToast('error', "Cannot save: Conflicts detected in the timetable");
        throw new Error("Conflicts detected");
      }

      // setLoading(true);
      try {
        const response = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version_number: version, ...data }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save timetable data");
        }

        const result = await response.json();
        const newVersion = result.version_number;
        setVersions((prev) =>
          [...new Set([...prev, newVersion])].sort((a, b) => a - b)
        );
        setTimetableData(data);
        showToast('success', `Timetable saved as Version ${newVersion}`);
        return newVersion;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        showToast('error', "Failed to save timetable data");
        throw err;
      }
    },
    [checkConflicts, conflicts, showToast]
  );

  const saveTimetableDataWithConflicts = useCallback(
    async (data: TimetableData, version?: number) => {
      // setLoading(true);
      try {
        const response = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version_number: version, ...data }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to save timetable data");
        }

        const result = await response.json();
        const newVersion = result.version_number;
        setVersions((prev) =>
          [...new Set([...prev, newVersion])].sort((a, b) => a - b)
        );
        setTimetableData(data);
        return newVersion;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        showToast('error', "Failed to save timetable data");
        throw err;
      } 
    },
    [showToast]
  );

  const deleteVersion = useCallback(
    async (version: number) => {
      // setLoading(true);
      try {
        // const {
        //   data: { user },
        // } = await supabaseClient.auth.getUser();
        // if (!user) {
        //   throw new Error("User not authenticated");
        // }

        const response = await fetch(
          `/api/timetable?version_number=${version}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete version");
        }

        setVersions((prev) => prev.filter((v) => v !== version));
        if (selectedVersion === version) {
          await fetchGlobalVersion();
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        showToast('error',
          err instanceof Error ? err.message : "Failed to delete version"
        );
      } 
    },
    [selectedVersion, fetchGlobalVersion, showToast]
  );

  // Check conflicts for initial timetable data
  useEffect(() => {
    if (initialData.timetableData) {
      checkConflicts(initialData.timetableData);
    }
  }, [initialData.timetableData, checkConflicts]);

  // Only fetch versions and global version if initial data is missing
  useEffect(() => {
    if (!initialData.versions.length) {
      fetchVersions();
    }
    if (!initialData.selectedVersion || !initialData.timetableData) {
      fetchGlobalVersion();
    }
  }, [initialData, fetchVersions, fetchGlobalVersion]);

  return (
    <TimetableVersionContext.Provider
      value={{
        versions,
        selectedVersion,
        timetableData,
        conflicts,
        loading,
        error,
        setSelectedVersion,
        finalizeVersion,
        saveTimetableData,
        saveTimetableDataWithConflicts,
        deleteVersion,
        checkConflicts,
        setTimetableData,
        fetchVersions,
        fetchGlobalVersion,
      }}
    >
      {children}
    </TimetableVersionContext.Provider>
  );
};

export const useTimetableVersion = () => {
  const context = useContext(TimetableVersionContext);
  if (!context) {
    throw new Error(
      "useTimetableVersion must be used within a TimetableVersionProvider"
    );
  }
  return context;
};
