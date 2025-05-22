/* eslint-disable react-hooks/exhaustive-deps */
"use client";
import React, {
  useCallback,
  useMemo,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import { produce } from "immer";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";
import { supabase } from "@/lib/supabase/supabase";
import { RiArrowDropUpLine } from "react-icons/ri";
import { RiArrowDropDownLine } from "react-icons/ri";

interface Session {
  Room: string;
  Time: string;
  "Faculty Assigned": string;
  "Course Details": string;
  "Subject Type": string;
  Domain: string;
  "Pre-Req": string;
  Section: string;
  "Semester Details": string;
}

interface EmptySlot {
  Time: string;
}

interface RoomSchedule {
  [roomName: string]: (Session | EmptySlot)[] | undefined;
}

type DaySchedule = RoomSchedule[];

interface TimetableData {
  [day: string]: DaySchedule;
}

const timeSlots = [
  "9:30-10:30",
  "10:30-11:30",
  "11:30-12:30",
  "12:30-1:30",
  "1:30-2:30",
  "2:30-3:30",
  "3:30-4:30",
];

const SessionDetails = React.memo<{
  session: Session;
  isPlaceholder?: boolean;
}>(({ session, isPlaceholder = false }) => {
  return (
    <div
      className={`text-center p-2 rounded-md ${
        isPlaceholder ? "text-gray-300 bg-gray-100 opacity-50" : "bg-white"
      }`}
    >
      <div className="font-medium">{session["Course Details"]}</div>
      <div className="text-sm">{session["Faculty Assigned"]}</div>
      <div className="text-sm">{session["Section"]}</div>
      <div className="text-xs text-gray-500">{session["Subject Type"]}</div>
    </div>
  );
});
SessionDetails.displayName = "SessionDetails";

const Timetable = () => {
  const [data, setData] = useState<TimetableData>({});
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [versions, setVersions] = useState<number[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pendingData, setPendingData] = useState<TimetableData | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const dropDownRef = useRef<HTMLDivElement>(null);

  const hasLoaded = useRef(false);

  const normalizeData = useCallback((rawData: unknown): TimetableData => {
    const normalized: TimetableData = {};
    if (!rawData || typeof rawData !== "object") {
      console.warn("Invalid raw data:", rawData);
      return normalized;
    }

    Object.entries(rawData).forEach(([day, daySchedule]) => {
      if (day === "version_number") return;
      if (!Array.isArray(daySchedule)) {
        console.warn(`Invalid schedule for ${day}:`, daySchedule);
        return;
      }

      const validRooms: RoomSchedule[] = [];
      daySchedule.forEach((roomSchedule) => {
        if (!roomSchedule || typeof roomSchedule !== "object") {
          console.warn("Invalid room schedule:", roomSchedule);
          return;
        }

        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName];

        if (!sessions || !Array.isArray(sessions)) {
          validRooms.push({
            [roomName]: timeSlots.map((time) => ({ Time: time })),
          });
          return;
        }

        const normalizedSessions = timeSlots.map((time, index) => {
          const session = sessions[index];
          if (
            !session ||
            Object.keys(session).length === 0 ||
            !("Faculty Assigned" in session)
          ) {
            return { Time: time };
          }
          return session;
        });
        validRooms.push({ [roomName]: normalizedSessions });
      });

      if (validRooms.length > 0) {
        normalized[day] = validRooms;
      }
    });

    return normalized;
  }, []);

  const loadData = async (versionOverride?: string | number | null) => {
    setLoading(true);
    setError(null);

    try {
      const { data: versionData, error: versionError } = await supabase
        .from("timetable_data")
        .select("version_number")
        .order("version_number", { ascending: true });

      if (versionError) {
        // console.error("Version fetch error:", versionError);
        throw new Error(versionError.message);
      }

      const versionNumbers = versionData.map((v) => v.version_number);
      setVersions(versionNumbers);

      const versionToUse =
        versionOverride ||
        selectedVersion ||
        versionNumbers[versionNumbers.length - 1] ||
        null;

      if (!selectedVersion && versionToUse) {
        setSelectedVersion(versionToUse);
      }

      if (!versionToUse) {
        throw new Error("No valid version available.");
      }

      const url = `/api/timetable?version=${versionToUse}`;

      const response = await fetch(url);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Fetch error:", errorData);
        throw new Error(errorData.error || `HTTP error: ${response.status}`);
      }

      const jsonData = await response.json();
      const normalized = normalizeData(jsonData);
      setData(normalized);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message || "Failed to load timetable");
        setData({});
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (hasLoaded.current) return;

    hasLoaded.current = true;
    loadData();
    const subscription = supabase
      .channel("timetable_data")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "timetable_data" },
        async () => {
          // console.log("New timetable data inserted, reloading...");
          await loadData();
        }
      )
      .subscribe((status, error) => {
        if (error) {
          console.error("Subscription error:", error);
          setError("Real-time updates failed");
        }
      });

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  useEffect(() => {
    if (!hasLoaded.current || !selectedVersion) return;
    loadData(selectedVersion);
  }, [selectedVersion]);
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropDownRef.current &&
        !dropDownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside, true);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside, true);
    };
  }, []);

  const saveData = useCallback(
    async (dataToSave: TimetableData, version?: number) => {
      try {
        const response = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...dataToSave,
            version_number: version,
          }),
        });
        if (!response.ok) {
          const errorData = await response.json();
          console.error("Save error:", errorData);
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }
        // Reload data to ensure UI reflects the latest state
        await loadData(version || undefined);
      } catch (error) {
        if (error instanceof Error) {
          setError(error.message || "Failed to save timetable");
        }
      }
    },
    []
  );

  const allRooms = useMemo(() => {
    return Array.from(
      new Set(
        Object.values(data).flatMap((day) =>
          day.flatMap((room) =>
            Object.keys(room).filter((key) => room[key] !== undefined)
          )
        )
      )
    );
  }, [data]);

  const parseCellId = useCallback((id: string) => {
    const [day, ...rest] = id.split("-");
    const timeIndex = rest.findIndex((p) => p.includes(":"));
    const room = rest.slice(0, timeIndex).join("-");
    const time = rest[timeIndex] + "-" + rest[timeIndex + 1];
    return { day, room, time };
  }, []);

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const sourceId = event.active.id as string;
      const {
        day: sourceDay,
        room: sourceRoom,
        time: sourceTime,
      } = parseCellId(sourceId);

      const sourceRoomData = data[sourceDay]?.find(
        (room: RoomSchedule) => Object.keys(room)[0] === sourceRoom
      );
      const sourceSessions = sourceRoomData?.[sourceRoom];
      const sourceIndex = sourceSessions?.findIndex(
        (session: Session | EmptySlot) => session.Time === sourceTime
      );

      if (
        sourceIndex !== undefined &&
        sourceIndex !== -1 &&
        sourceSessions?.[sourceIndex] &&
        "Faculty Assigned" in sourceSessions[sourceIndex]
      ) {
        setActiveSession(sourceSessions[sourceIndex] as Session);
      }
    },
    [data, parseCellId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      setActiveSession(null);

      if (!over) {
        return;
      }

      const sourceId = active.id as string;
      const destId = over.id as string;

      const {
        day: sourceDay,
        room: sourceRoom,
        time: sourceTime,
      } = parseCellId(sourceId);
      const {
        day: destDay,
        room: destRoom,
        time: destTime,
      } = parseCellId(destId);

      if (
        sourceDay === destDay &&
        sourceRoom === destRoom &&
        sourceTime === destTime
      ) {
        return;
      }

      const updatedData = produce(data, (draft) => {
        const sourceRoomData = draft[sourceDay]?.find(
          (room: RoomSchedule) => Object.keys(room)[0] === sourceRoom
        );
        const destRoomData = draft[destDay]?.find(
          (room: RoomSchedule) => Object.keys(room)[0] === destRoom
        );

        if (!sourceRoomData || !destRoomData) {
          console.warn("Missing room data:", { sourceRoomData, destRoomData });
          return;
        }

        const sourceSessions = sourceRoomData[sourceRoom];
        const destSessions = destRoomData[destRoom];

        if (!sourceSessions || !destSessions) {
          console.warn("Missing sessions:", { sourceSessions, destSessions });
          return;
        }

        const sourceIndex = sourceSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === sourceTime
        );
        const destIndex = destSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === destTime
        );

        if (sourceIndex === -1 || destIndex === -1) {
          console.warn("Invalid indices:", { sourceIndex, destIndex });
          return;
        }

        const sessionToMove = sourceSessions[sourceIndex] as
          | Session
          | EmptySlot;

        if (!("Faculty Assigned" in sessionToMove)) {
          return;
        }

        const destSession = destSessions[destIndex] as Session | EmptySlot;

        if ("Faculty Assigned" in destSession) {
          sourceSessions[sourceIndex] = {
            ...destSession,
            Time: sourceTime,
            Room: sourceRoom,
          };
          destSessions[destIndex] = {
            ...sessionToMove,
            Time: destTime,
            Room: destRoom,
          };
        } else {
          sourceSessions[sourceIndex] = { Time: sourceTime };
          destSessions[destIndex] = {
            ...sessionToMove,
            Time: destTime,
            Room: destRoom,
          };
        }
      });

      // Store pending changes and open modal
      setPendingData(updatedData);
      setIsModalOpen(true);
    },
    [data, parseCellId]
  );

  const handleModalAction = useCallback(
    (action: "cancel" | "same" | "new") => {
      if (action === "cancel" || !pendingData) {
        setIsModalOpen(false);
        setPendingData(null);
        return;
      }

      setData(pendingData);
      if (action === "same") {
        saveData(pendingData, selectedVersion || undefined);
      } else {
        saveData(pendingData);
      }
      setIsModalOpen(false);
      setPendingData(null);
    },
    [pendingData, saveData, selectedVersion]
  );

  const DroppableCell = React.memo<{
    id: string;
    children: React.ReactNode;
    isEmpty: boolean;
    isDraggingOver: boolean;
  }>(({ id, children, isEmpty, isDraggingOver }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const className = useMemo(
      () =>
        `border p-2 transition-all duration-200 ${
          isOver ? "bg-blue-100 border-2 border-blue-400" : ""
        } ${isDraggingOver && isEmpty ? "bg-gray-100 opacity-50" : ""}`,
      [isOver, isDraggingOver, isEmpty]
    );

    return (
      <td ref={setNodeRef} className={className}>
        {children}
      </td>
    );
  });
  DroppableCell.displayName = "DroppableCell";

  const DraggableSession = React.memo<{
    id: string;
    session: Session;
    isDragging?: boolean;
  }>(({ id, session, isDragging = false }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({ id });
    const className = useMemo(
      () =>
        `cursor-move transition-all ease-in-out ${
          isDragging
            ? "opacity-70 scale-105 rotate-1 shadow-xl bg-blue-50 z-50"
            : "hover:bg-gray-50"
        }`,
      [isDragging]
    );

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={className}
      >
        <SessionDetails session={session} />
      </div>
    );
  });
  DraggableSession.displayName = "DraggableSession";

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 flex-1">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  const deleteVersion = async (version: number) => {
    await fetch(`api/timetable?version_number=${version}`, {
      method: "DELETE",
    });
  };

  return (
    <main className="w-full max-w-full">
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="w-full">
          <div className="bg-red-400 w-full flex items-center h-15 px-2 sticky top-0 justify-center z-50">
            <div className="flex items-center w-[30%]">
              <label className="mr-2 flex">Select Version:</label>
              <div ref={dropDownRef} className="relative w-40 text-sm">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="w-full border p-2 rounded  flex justify-between px-3 items-center"
                >
                  {selectedVersion
                    ? `Version ${selectedVersion}`
                    : "Select Version"}

                  {isOpen ? (
                    <RiArrowDropUpLine size={28} />
                  ) : (
                    <RiArrowDropDownLine size={28} />
                  )}
                </button>

                {isOpen && (
                  <ul className="absolute w-full border mt-1 bg-white rounded shadow z-10">
                    {versions.map((version) => (
                      <li
                        key={version}
                        className="flex justify-between items-center p-2 hover:bg-gray-100"
                      >
                        <span
                          onClick={() => {
                            setSelectedVersion(version);
                            setIsOpen(false);
                          }}
                          className="cursor-pointer"
                        >
                          Version {version}
                        </span>
                        <button
                          onClick={() => deleteVersion(version)}
                          className="text-red-500 hover:text-red-700"
                        >
                          ❌
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="font-medium w-[70%]">
              Please check your timetable daily for any possible change!
            </div>
          </div>
          {loading ? (
            <div className="flex justify-center items-center h-[calc(100vh-4rem)] flex-1">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <table className="min-w-full border-collapse border">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border p-2">Day</th>
                  <th>Room</th>
                  {timeSlots.map((time) => (
                    <th key={time} className="border p-2 text-center">
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {Object.entries(data).map(([day, rooms]) => (
                  <React.Fragment key={day}>
                    <tr>
                      <td
                        rowSpan={allRooms.length + 1}
                        className="border align-middle bg-gray-50"
                      >
                        <div className="-rotate-90 font-medium">{day}</div>
                      </td>
                    </tr>
                    {allRooms.map((roomName) => {
                      const roomData = rooms.find(
                        (room: RoomSchedule) =>
                          Object.keys(room)[0] === roomName
                      );
                      const sessions = roomData
                        ? roomData[roomName] ||
                          timeSlots.map((time) => ({ Time: time }))
                        : timeSlots.map((time) => ({ Time: time }));

                      return (
                        <tr key={`${day}-${roomName}`}>
                          <td className="border p-2">{roomName}</td>
                          {timeSlots.map((timeSlot) => {
                            const session = sessions.find(
                              (s: Session | EmptySlot) => s.Time === timeSlot
                            ) as Session | EmptySlot;
                            const isEmpty =
                              !session || !("Faculty Assigned" in session);
                            const cellId = `${day}-${roomName}-${timeSlot}`;
                            const isDraggingThisSession =
                              activeSession &&
                              session &&
                              "Faculty Assigned" in session &&
                              session["Course Details"] ===
                                activeSession["Course Details"] &&
                              session.Time === activeSession.Time;

                            return (
                              <DroppableCell
                                key={cellId}
                                id={cellId}
                                isEmpty={isEmpty}
                                isDraggingOver={!!isDraggingThisSession}
                              >
                                {!isEmpty && !isDraggingThisSession ? (
                                  <DraggableSession
                                    id={`${cellId}-${
                                      session["Course Details"] || "session"
                                    }`}
                                    session={session as Session}
                                  />
                                ) : isDraggingThisSession ? (
                                  <SessionDetails
                                    session={session as Session}
                                    isPlaceholder
                                  />
                                ) : (
                                  <div className="text-center text-gray-300"></div>
                                )}
                              </DroppableCell>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <DragOverlay>
          {activeSession ? (
            <DraggableSession
              id={`overlay-${activeSession["Course Details"]}`}
              session={activeSession}
              isDragging
            />
          ) : null}
        </DragOverlay>
        {isModalOpen && (
          <div className="fixed inset-0 bg-gray-900/60 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg shadow-lg">
              <h2 className="text-lg font-semibold mb-4">
                Save Timetable Changes
              </h2>
              <p className="mb-4">
                Do you want to save the changes to the current version, create a
                new version, or cancel?
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => handleModalAction("cancel")}
                  className="px-4 py-2 bg-red-800 rounded hover:bg-red-900 text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleModalAction("same")}
                  className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
                >
                  Save in Same Version
                </button>
                <button
                  onClick={() => handleModalAction("new")}
                  className="px-4 py-2 bg-blue-900 text-white rounded hover:bg-blue-800"
                >
                  Save in New Version
                </button>
              </div>
            </div>
          </div>
        )}
      </DndContext>
    </main>
  );
};

export default Timetable;
