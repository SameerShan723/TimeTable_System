"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { toast } from "react-toastify";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
} from "@/app/timetable/types";
import { supabaseClient } from "@/lib/supabase/supabase";
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
  saveTimetableData: (data: TimetableData, version?: number) => Promise<number>;
  deleteVersion: (version: number) => Promise<void>;
  checkConflicts: (data: TimetableData) => void;
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
                  otherSession.Time === Time &&
                  otherSession.Teacher === Teacher &&
                  (otherSession.Subject !== Subject ||
                    otherSession.Section !== Section)
              )
            );
          });

          if (teacherConflict) {
            newConflicts.push({
              day,
              time: Time,
              room: roomName,
              classIndex: index,
              message: `Teacher ${Teacher} is scheduled in multiple rooms at ${Time}`,
            });
          }

          // Check for subject/section conflicts
          const sectionConflict = dayData.some((otherRoom: RoomSchedule) => {
            const otherRoomName = Object.keys(otherRoom)[0];
            const otherSessions = otherRoom[otherRoomName] || [];
            return (
              roomName !== otherRoomName &&
              otherSessions.some(
                (otherSession: Session | EmptySlot) =>
                  "Subject" in otherSession &&
                  otherSession.Time === Time &&
                  otherSession.Subject === Subject &&
                  otherSession.Section === Section
              )
            );
          });

          if (sectionConflict) {
            newConflicts.push({
              day,
              time: Time,
              room: roomName,
              classIndex: index,
              message: `Subject ${Subject} for section ${Section} is scheduled multiple times at ${Time}`,
            });
          }

          // Check for room conflicts
          const roomConflict = sessions.some(
            (otherSession: Session | EmptySlot, otherIndex: number) =>
              otherIndex !== index &&
              "Teacher" in otherSession &&
              otherSession.Time === Time
          );

          if (roomConflict) {
            newConflicts.push({
              day,
              time: Time,
              room: roomName,
              classIndex: index,
              message: `Room ${roomName} is double-booked at ${Time}`,
            });
          }

          timeSlots.add(Time);
        });
      });
    });

    setConflicts(newConflicts);

    if (newConflicts.length > 0) {
      toast.error("Conflicts detected in the timetable. Please resolve them.");
    }
  }, []);

  const fetchTimetableData = useCallback(
    async (version: number) => {
      setLoading(true);
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
        toast.error(
          err instanceof Error ? err.message : "Failed to fetch timetable data"
        );
      } finally {
        setLoading(false);
      }
    },
    [checkConflicts]
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
      toast.error(
        err instanceof Error ? err.message : "Failed to fetch versions"
      );
    } finally {
      setLoading(false);
    }
  }, []);

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
      toast.error(err instanceof Error ? err.message : "Failed to fetch ");
    } finally {
      setLoading(false);
    }
  }, [fetchTimetableData]);

  const setSelectedVersion = useCallback(
    async (version: number) => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

        const response = await fetch(`/api/timetable?version=${version}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to update  version");
        }

        setSelectedVersionState(version);
        await fetchTimetableData(version);
        toast.success(`Successfully change to Version ${version} `);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to set version");
        toast.error(
          err instanceof Error ? err.message : "Failed to set version"
        );
      } finally {
        setLoading(false);
      }
    },
    [fetchTimetableData]
  );

  const saveTimetableData = useCallback(
    async (data: TimetableData, version?: number) => {
      checkConflicts(data);
      if (conflicts.length > 0) {
        toast.error("Cannot save: Conflicts detected in the timetable");
        throw new Error("Conflicts detected");
      }

      setLoading(true);
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
        toast.success(`Timetable saved as Version ${newVersion}`);
        return newVersion;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        toast.error("Failed to save timetable data");
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [checkConflicts, conflicts]
  );

  const deleteVersion = useCallback(
    async (version: number) => {
      setLoading(true);
      try {
        const {
          data: { user },
        } = await supabaseClient.auth.getUser();
        if (!user) {
          throw new Error("User not authenticated");
        }

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
        toast.success(`Version ${version} deleted successfully`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        toast.error(
          err instanceof Error ? err.message : "Failed to delete version"
        );
      } finally {
        setLoading(false);
      }
    },
    [selectedVersion, fetchGlobalVersion]
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
        saveTimetableData,
        deleteVersion,
        checkConflicts,
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
