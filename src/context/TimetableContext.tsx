"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { TimetableData, Session, RoomSchedule } from "@/app/timetable/types";
import { toast } from "sonner";
import { Days } from "@/helpers/page";

interface Conflict {
  day: string;
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
  setSelectedVersion: (version: number | null) => Promise<void>;
  saveTimetableData: (data: TimetableData, version?: number) => Promise<number>;
  deleteVersion: (version: number) => Promise<void>;
  checkConflicts: (data: TimetableData) => void;
}

const TimetableVersionContext = createContext<
  TimetableVersionContextType | undefined
>(undefined);

interface TimetableVersionProviderProps {
  initialData: {
    versions: number[];
    selectedVersion: number | null;
    timetableData: TimetableData;
  };
  children: React.ReactNode;
}

export const TimetableVersionProvider: React.FC<
  TimetableVersionProviderProps
> = ({ initialData, children }) => {
  const [versions, setVersions] = useState<number[]>(initialData.versions);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(
    initialData.selectedVersion
  );
  const [timetableData, setTimetableData] = useState<TimetableData>(
    initialData.timetableData
  );
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const detectConflicts = (data: TimetableData): Conflict[] => {
    const conflicts: Conflict[] = [];

    Days.forEach((day) => {
      const roomSchedules: RoomSchedule[] = data[day] || [];
      const timeSlots: Record<
        string,
        { session: Session; room: string; index: number }[]
      > = {};
      const roomTimeSlots: Record<
        string,
        Record<string, { session: Session; index: number }[]>
      > = {};

      roomSchedules.forEach((roomSchedule) => {
        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName] || [];
        if (!roomTimeSlots[roomName]) {
          roomTimeSlots[roomName] = {};
        }
        sessions.forEach((session, index) => {
          if (!("Teacher" in session)) return;
          const time = session.Time;
          if (!timeSlots[time]) {
            timeSlots[time] = [];
          }
          timeSlots[time].push({
            session: session as Session,
            room: roomName,
            index,
          });
          if (!roomTimeSlots[roomName][time]) {
            roomTimeSlots[roomName][time] = [];
          }
          roomTimeSlots[roomName][time].push({
            session: session as Session,
            index,
          });
        });
      });

      Object.entries(timeSlots).forEach(([time, slotSessions]) => {
        const teacherCount: Record<string, { room: string; index: number }[]> =
          {};
        slotSessions.forEach(({ session, room, index }) => {
          const teacher = session.Teacher || "Unknown";
          if (!teacherCount[teacher]) {
            teacherCount[teacher] = [];
          }
          teacherCount[teacher].push({ room, index });
        });

        Object.entries(teacherCount).forEach(([teacher, instances]) => {
          if (instances.length > 1 && teacher !== "Unknown") {
            instances.forEach(({ room, index }) => {
              conflicts.push({
                day,
                time,
                room,
                classIndex: index,
                message: `Teacher ${teacher} has multiple classes at ${time} on ${day}`,
              });
            });
          }
        });
      });

      Object.entries(timeSlots).forEach(([time, slotSessions]) => {
        const subjectSectionCount: Record<
          string,
          { room: string; index: number }[]
        > = {};

        slotSessions.forEach(({ session, room, index }) => {
          const subject = session.Subject || "Unknown";
          const section = session.Section || "";
          // Create a unique key combining subject and section
          const key = `${subject}__${section}`;

          if (!subjectSectionCount[key]) {
            subjectSectionCount[key] = [];
          }
          subjectSectionCount[key].push({ room, index });
        });

        Object.entries(subjectSectionCount).forEach(([key, instances]) => {
          const [subjectPart] = key.split("__");
          // Skip if subject is "Unknown"
          if (subjectPart === "Unknown") return;

          if (instances.length > 1) {
            instances.forEach(({ room, index }) => {
              conflicts.push({
                day,
                time,
                room,
                classIndex: index,
                message: `Subject "${subjectPart}" has multiple classes for same section at ${time} on ${day}`,
              });
            });
          }
        });
      });

      Object.entries(roomTimeSlots).forEach(([roomName, timeMap]) => {
        Object.entries(timeMap).forEach(([time, sessions]) => {
          if (sessions.length > 1) {
            sessions.forEach(({ index }) => {
              conflicts.push({
                day,
                time,
                room: roomName,
                classIndex: index,
                message: `Room ${roomName} has multiple classes at ${time} on ${day}`,
              });
            });
          }
        });
      });

      return conflicts;
    });

    return conflicts;
  };

  const checkConflicts = useCallback((data: TimetableData) => {
    const newConflicts = detectConflicts(data);
    setConflicts(newConflicts);
  }, []);

  const fetchTimetableData = useCallback(
    async (version: number) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/timetable?version=${version}`);
        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || "Failed to fetch timetable data");
        }
        const data = await response.json();
        const fetchedData: TimetableData = data || {
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
        };

        Days.forEach((day) => {
          if (!fetchedData[day]) {
            fetchedData[day] = [];
          }
        });

        setTimetableData(fetchedData);
        checkConflicts(fetchedData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch timetable data"
        );
        setTimetableData({
          Monday: [],
          Tuesday: [],
          Wednesday: [],
          Thursday: [],
          Friday: [],
        });
        setConflicts([]);
      } finally {
        setLoading(false);
      }
    },
    [checkConflicts]
  );

  const setSelectedVersionHandler = useCallback(
    async (version: number | null) => {
      setSelectedVersion(version);
      if (version !== null && versions.includes(version)) {
        await fetchTimetableData(version);
      }
    },
    [versions, fetchTimetableData]
  );

  const saveTimetableData = useCallback(
    async (data: TimetableData, version?: number): Promise<number> => {
      try {
        setLoading(true);
        const conflicts = detectConflicts(data);

        if (conflicts.length > 0) {
          const visibleConflicts = conflicts.slice(0, 5);
          visibleConflicts.forEach((conflict) => {
            toast.error(
              `Conflict on ${conflict.day} at ${conflict.time}: ${conflict.message}`
            );
          });
          if (conflicts.length > 5) {
            toast.warning("You have many conflicts. Please resolve them.");
          }
          throw new Error("Cannot save timetable due to Conflicts");
        }

        const response = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ version_number: version, ...data }),
        });

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || "Failed to save timetable");
        }

        const { version_number: newVersion } = await response.json();

        // Update versions list
        if (!versions.includes(newVersion)) {
          setVersions((prev) => [...prev, newVersion]);
        }

        setSelectedVersion(newVersion);
        await fetchTimetableData(newVersion);

        toast.success(`Timetable saved as Version ${newVersion}`);
        return newVersion;
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to save timetable"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [versions, fetchTimetableData]
  );

  const deleteVersion = useCallback(
    async (version: number) => {
      try {
        setLoading(true);
        const response = await fetch(
          `/api/timetable?version_number=${version}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const { error } = await response.json();
          throw new Error(error || "Failed to delete version");
        }

        const newVersions = versions.filter((v) => v !== version);
        setVersions(newVersions);

        if (selectedVersion === version) {
          const newSelectedVersion =
            newVersions.length > 0 ? newVersions[newVersions.length - 1] : null;

          setSelectedVersion(newSelectedVersion);

          if (newSelectedVersion) {
            await fetchTimetableData(newSelectedVersion);
          } else {
            setTimetableData({
              Monday: [],
              Tuesday: [],
              Wednesday: [],
              Thursday: [],
              Friday: [],
            });
          }
        }

        toast.success(`Version ${version} deleted`);
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to delete version"
        );
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [versions, selectedVersion, fetchTimetableData]
  );

  const value: TimetableVersionContextType = {
    versions,
    selectedVersion,
    timetableData,
    conflicts,
    loading,
    error,
    setSelectedVersion: setSelectedVersionHandler,
    saveTimetableData,
    deleteVersion,
    checkConflicts,
  };

  return (
    <TimetableVersionContext.Provider value={value}>
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
