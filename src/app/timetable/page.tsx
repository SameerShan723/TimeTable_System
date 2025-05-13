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
// import { useRouter } from "next/navigation";
// Define types for our data structure
interface Session {
  Room: string;
  Time: string;
  "Faculty Assigned": string;
  "Course Details": string;
  "Subject Type": string;
  Domain: string;
  "Pre-Req": string;
  // Sem: string;
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

// Reusable component to display session details
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
  // const [saving, setSaving] = useState(false);
  const hasLoaded = useRef(false);
  // const router = useRouter();

  // const handleTeacherButton = () => {
  //   router.push("/checkTeachersTimetable");
  // };
  // Normalize data to handle empty slots and validate required fields
  const normalizeData = useCallback((rawData: unknown): TimetableData => {
    const normalized: TimetableData = {};
    if (!rawData || typeof rawData !== "object") {
      return normalized;
    }

    Object.entries(rawData).forEach(([day, daySchedule]) => {
      if (!Array.isArray(daySchedule)) {
        return;
      }

      const validRooms: RoomSchedule[] = [];
      daySchedule.forEach((roomSchedule) => {
        if (!roomSchedule || typeof roomSchedule !== "object") {
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

  // Load data from API
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadData = async () => {
      try {
        const response = await fetch("/api/timetable");
        if (!response.ok) {
          throw new Error(`HTTP error: ${response.status}`);
        }
        const jsonData = await response.json();
        setData(normalizeData(jsonData));
      } catch (error) {
        console.error("Error loading timetable from API:", error);
        setData({});
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [normalizeData]);

  // Save data to API function
  const saveData = useCallback(async (dataToSave: TimetableData) => {
    // setSaving(true);
    try {
      const response = await fetch("/api/timetable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSave),
      });
      if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
    } catch (error) {
      console.error("Error saving timetable to API:", error);
    } finally {
      // setSaving(false);
    }
  }, []);

  // Memoize all rooms to prevent recalculations
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

  // Parse cell ID into components
  const parseCellId = useCallback((id: string) => {
    const [day, ...rest] = id.split("-");
    const timeIndex = rest.findIndex((p) => p.includes(":"));
    const room = rest.slice(0, timeIndex).join("-");
    const time = rest[timeIndex] + "-" + rest[timeIndex + 1];
    return { day, room, time };
  }, []);

  // Handle drag start to set active session
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

  // Handle drag end to update timetable
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

      // Skip if dragging to the same spot
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
          return;
        }

        const sourceSessions = sourceRoomData[sourceRoom];
        const destSessions = destRoomData[destRoom];

        if (!sourceSessions || !destSessions) {
          return;
        }

        const sourceIndex = sourceSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === sourceTime
        );
        const destIndex = destSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === destTime
        );

        if (sourceIndex === -1 || destIndex === -1) {
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

      // Update state first
      setData(updatedData);

      // Then save to API
      saveData(updatedData);
    },
    [data, parseCellId, saveData]
  );

  // Droppable cell component
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

  // Draggable session component
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 flex-1">
        <div className="text-xl">Loading timetable...</div>
      </div>
    );
  }

  return (
    <main>
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        {/* <div className="overflow-x-auto p-4">
          {saving && (
            <div className="fixed top-4 right-4 bg-blue-500 text-white px-4 py-2 rounded shadow-md">
              Saving changes...
            </div>
          )} */}
        <div className="bg-red-200  max-w-screen w-full flex items-center h-15 px-2 sticky top-0 justify-center z-50 flex-1">
          <div>
            Please check your time table &quot;Daily&quot; for any possible
            change!
          </div>
          {/* <button
            className="bg-blue-400 px-4 py-2 cursor-pointer"
            onClick={() => handleTeacherButton()}
          >
            Check Timetable By Teacher
          </button> */}
        </div>
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
                    (room: RoomSchedule) => Object.keys(room)[0] === roomName
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
                              <div className="text-center text-gray-300">-</div>
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
        {/* </div> */}
        <DragOverlay>
          {activeSession ? (
            <DraggableSession
              id={`overlay-${activeSession["Course Details"]}`}
              session={activeSession}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </main>
  );
};

export default Timetable;
