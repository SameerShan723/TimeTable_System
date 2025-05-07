"use client";
import React, { useCallback, useMemo, useEffect, useRef } from "react";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
} from "@dnd-kit/core";
import { produce } from "immer";

// Define types for our data structure
interface Session {
  Room: string;
  Time: string;
  "Faculty Assigned": string;
  "Course Details": string;
  "Subject Code": string;
  "Subject TYPE": string;
  Domain: string;
  "Pre-Req": string;
  Sem: string;
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

const Timetable = () => {
  const [data, setData] = React.useState<TimetableData>({});
  const hasLoaded = useRef(false);

  // Normalize data to handle empty slots and invalid data
  const normalizeData = useCallback((rawData: unknown): TimetableData => {
    const normalized: TimetableData = {};
    if (!rawData || typeof rawData !== "object") {
      // console.warn("Invalid raw data, returning empty timetable");
      return normalized;
    }

    Object.entries(rawData).forEach(([day, daySchedule]) => {
      if (!Array.isArray(daySchedule)) {
        // console.warn(`Invalid day schedule for ${day}, skipping`);
        return;
      }

      const validRooms: RoomSchedule[] = [];
      daySchedule.forEach((roomSchedule) => {
        if (!roomSchedule || typeof roomSchedule !== "object") {
          console.warn(`Invalid room schedule for ${day}, skipping`);
          return;
        }

        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName];

        if (!sessions || !Array.isArray(sessions)) {
          // console.warn(
          //   `Invalid or undefined sessions for ${roomName} on ${day}, initializing empty slots`
          // );
          validRooms.push({
            [roomName]: timeSlots.map((time) => ({ Time: time })),
          });
          return;
        }

        // console.log(`Normalizing room: ${roomName} for ${day}`);
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
      } else {
        console.warn(`No valid rooms for ${day}, skipping`);
      }
    });

    // console.log("Normalized data:", JSON.stringify(normalized, null, 2));
    return normalized;
  }, []);

  // Load data from API or fallback to local JSON
  useEffect(() => {
    if (hasLoaded.current) return;
    hasLoaded.current = true;

    const loadData = async () => {
      try {
        console.log("Fetching timetable data from API endpoint...");
        const response = await fetch("/api/timetable");

        if (!response.ok) {
          console.error(`API error: ${response.status} ${response.statusText}`);
          throw new Error(`HTTP error: ${response.status}`);
        }

        const jsonData = await response.json();
        console.log("API returned data successfully");

        setData(normalizeData(jsonData));
      } catch (error) {
        console.error("Error loading timetable from API:", error);
        // Initialize with empty data
        setData({});
      }
    };
    loadData();

    // console.log(
    //   "Timetable.tsx loaded - Using @dnd-kit/core, Version: 2025-05-16"
    // );
  }, [normalizeData]);

  const allRooms = useMemo(() => {
    const rooms = Array.from(
      new Set(
        Object.values(data).flatMap((day) =>
          day.flatMap((room) =>
            Object.keys(room).filter((key) => room[key] !== undefined)
          )
        )
      )
    );
    // console.log("All rooms:", rooms);
    return rooms;
  }, [data]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      // console.log("No drop target");
      return;
    }

    const sourceId = active.id as string;
    const destId = over.id as string;

    // Parse IDs (e.g., "Monday-NAB-R01-12:30-1:30-Linear Algebra")
    const sourceParts = sourceId.split("-");
    const destParts = destId.split("-");
    const sourceDay = sourceParts[0];
    const destDay = destParts[0];
    const timeIndex = sourceParts.findIndex((p) => p.includes(":"));
    const sourceRoom = sourceParts.slice(1, timeIndex).join("-");
    const destRoom = destParts.slice(1, timeIndex).join("-");
    const sourceTime =
      sourceParts[timeIndex] + "-" + sourceParts[timeIndex + 1];
    const destTime = destParts[timeIndex] + "-" + destParts[timeIndex + 1];

    // console.log("Parsed IDs:", {
    //   sourceDay,
    //   sourceRoom,
    //   sourceTime,
    //   destDay,
    //   destRoom,
    //   destTime,
    // });

    setData((prevData) =>
      produce(prevData, (draft) => {
        if (
          sourceDay === destDay &&
          sourceRoom === destRoom &&
          sourceTime === destTime
        ) {
          // console.log("Same position, no update");
          return;
        }

        // console.log("Updating state:", { sourceId, destId });

        // const dayRooms =
        //   draft[sourceDay]?.map((room: RoomSchedule) => Object.keys(room)[0]) ||
        //   [];
        // console.log(`Rooms in ${sourceDay}:`, dayRooms);

        const sourceRoomData = draft[sourceDay]?.find(
          (room: RoomSchedule) => Object.keys(room)[0] === sourceRoom
        );
        const destRoomData = draft[destDay]?.find(
          (room: RoomSchedule) => Object.keys(room)[0] === destRoom
        );

        if (!sourceRoomData || !destRoomData) {
          console.log("Room data not found:", {
            sourceRoomData,
            destRoomData,
            sourceRoom,
            destRoom,
          });
          return;
        }

        const sourceSessions = sourceRoomData[sourceRoom];
        const destSessions = destRoomData[destRoom];

        if (!sourceSessions || !destSessions) {
          // console.log("Invalid sessions:", { sourceSessions, destSessions });
          return;
        }

        const sourceIndex = sourceSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === sourceTime
        );
        const destIndex = destSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === destTime
        );

        if (sourceIndex === -1 || destIndex === -1) {
          // console.log("Invalid indices:", {
          //   sourceIndex,
          //   destIndex,
          //   sourceTime,
          //   destTime,
          // });
          return;
        }

        const sessionToMove = sourceSessions[sourceIndex] as
          | Session
          | EmptySlot;

        if (!("Faculty Assigned" in sessionToMove)) {
          // console.log("Source is empty, cannot move:", sessionToMove);
          return;
        }

        const destSession = destSessions[destIndex] as Session | EmptySlot;

        if ("Faculty Assigned" in destSession) {
          // Swap sessions
          console.log("Swapping sessions:", {
            source: sessionToMove,
            dest: destSession,
          });
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
          // console.log(
          //   `Swapped: ${sessionToMove["Course Details"]} to ${destTime} in ${destRoom}, ${destSession["Course Details"]} to ${sourceTime} in ${sourceRoom}`
          // );
        } else {
          // Move to empty cell
          // console.log("Moving session to empty cell:", sessionToMove);
          sourceSessions[sourceIndex] = { Time: sourceTime };
          destSessions[destIndex] = {
            ...sessionToMove,
            Time: destTime,
            Room: destRoom,
          };
          // console.log(
          //   `Moved ${sessionToMove["Course Details"]} from ${sourceTime} to ${destTime} in ${destRoom}`
          // );
        }

        // console.log("State updated successfully");
      })
    );

    setData((prevData) => {
      const saveData = async () => {
        try {
          const response = await fetch("/api/timetable", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(prevData),
          });
          if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
          // console.log("Timetable saved to API successfully");
        } catch (error) {
          console.error("Error saving timetable to API:", error);
        }
      };
      saveData();
      return prevData;
    });
  }, []);

  const DroppableCell: React.FC<{
    id: string;
    children: React.ReactNode;
    isEmpty: boolean;
  }> = ({ id, children }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
      <td
        ref={setNodeRef}
        className={`border p-2 ${isOver ? "bg-yellow-100" : ""}`}
      >
        {children}
      </td>
    );
  };

  const DraggableSession: React.FC<{
    id: string;
    session: Session;
  }> = ({ id, session }) => {
    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
      id,
    });
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        className={`text-center cursor-move ${isDragging ? "opacity-50" : ""}`}
      >
        <div className="font-medium">{session["Course Details"]}</div>
        <div className="text-sm">{session["Faculty Assigned"]}</div>
        <div className="text-xs text-gray-500">
          {session["Subject Code"]} ({session["Subject TYPE"]})
        </div>
      </div>
    );
  };

  return (
    <main>
      <DndContext onDragEnd={handleDragEnd}>
        <div className="overflow-x-auto p-4">
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
                      className="border  align-center bg-gray-50 "
                    >
                      <div className="-rotate-90  font-medium">{day}</div>
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

                          return (
                            <DroppableCell
                              key={cellId}
                              id={cellId}
                              isEmpty={isEmpty}
                            >
                              {!isEmpty ? (
                                <DraggableSession
                                  id={`${cellId}-${
                                    session["Course Details"] || "session"
                                  }`}
                                  session={session as Session}
                                />
                              ) : (
                                <div className="text-center text-gray-300">
                                  -
                                </div>
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
        </div>
      </DndContext>
    </main>
  );
};

export default Timetable;
