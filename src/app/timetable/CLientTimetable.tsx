"use client";

import React, { useCallback, useMemo, useState, useId } from "react";
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
import { FaRegTrashAlt } from "react-icons/fa";
import Select from "react-select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast, Toaster } from "sonner";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
  VersionOption,
} from "./types";

const timeSlots: string[] = [
  "9:30-10:30",
  "10:30-11:30",
  "11:30-12:30",
  "12:30-1:30",
  "1:30-2:30",
  "2:30-3:30",
  "3:30-4:30",
];

const DAY_ORDER: string[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
];

const PREDEFINED_ROOMS: string[] = [
  "NAB-R01",
  "NAB-R02",
  "NAB-R03",
  "NAB-R04",
  "NAB-R05",
  "NAB-R06",
  "NAB-R07",
  "NAB-R08",
  "NAB-R09",
  "NAB-R10",
  "NAB-R11",
  "NAB-R12",
  "Lab1",
  "Lab2",
  "Lab3",
  "Lab4",
  "R210-lab",
];

interface ClientTimetableProps {
  initialData: TimetableData;
  versions: number[];
  initialSelectedVersion: number | undefined;
}

interface SessionDetailsProps {
  session: Session;
  isPlaceholder?: boolean;
}

interface DroppableCellProps {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isDraggingOver: boolean;
}

interface DraggableSessionProps {
  id: string;
  session: Session;
  isDragging?: boolean;
}

const SessionDetails: React.FC<SessionDetailsProps> = React.memo(
  ({ session, isPlaceholder = false }) => {
    return (
      <div
        className={`text-center p-2 rounded-md ${
          isPlaceholder ? "text-gray-300 bg-gray-100 opacity-50" : "bg-white"
        }`}
      >
        <div className="font-medium">
          {session["Course Details"] || "Unknown Course"}
        </div>
        <div className="text-sm">
          {session["Faculty Assigned"] || "No Faculty"}
        </div>
        <div className="text-sm">{session["Section"] || ""}</div>
        <div className="text-xs text-gray-500">
          {session["Subject Type"] || ""}
        </div>
      </div>
    );
  }
);
SessionDetails.displayName = "SessionDetails";

const DroppableCell: React.FC<DroppableCellProps> = React.memo(
  ({ id, children, isEmpty, isDraggingOver }) => {
    const { setNodeRef, isOver } = useDroppable({ id });
    const className = `border p-2 transition-all duration-200 ${
      isOver ? "bg-blue-100 border-2 border-blue-400" : ""
    } ${isDraggingOver && isEmpty ? "bg-gray-100 opacity-50" : ""}`;

    return (
      <td ref={setNodeRef} className={className}>
        {children}
      </td>
    );
  }
);
DroppableCell.displayName = "DroppableCell";

const DraggableSession: React.FC<DraggableSessionProps> = React.memo(
  ({ id, session, isDragging = false }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({ id });
    const className = `cursor-move transition-all ease-in-out ${
      isDragging
        ? "opacity-70 scale-105 rotate-1 shadow-xl bg-blue-50 z-50"
        : "hover:bg-gray-50"
    }`;

    const staticAttributes = {
      ...attributes,
      "aria-describedby": `DndDescribedBy-${id.replace(/[^a-zA-Z0-9]/g, "")}`,
    };

    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...staticAttributes}
        className={className}
      >
        <SessionDetails session={session} />
      </div>
    );
  }
);
DraggableSession.displayName = "DraggableSession";

export default function ClientTimetable({
  initialData,
  versions: initialVersions,
  initialSelectedVersion,
}: ClientTimetableProps) {
  const [data, setData] = useState<TimetableData>(initialData);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [versions, setVersions] = useState<number[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    initialSelectedVersion
  );
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [pendingData, setPendingData] = useState<TimetableData | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [versionToDelete, setVersionToDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState<boolean>(false);
  const [isDragProcessing, setIsDragProcessing] = useState<boolean>(false); // New state for drag operations
  const versionId = useId();

  const saveData = useCallback(
    async (
      dataToSave: TimetableData,
      version?: number
    ): Promise<number | undefined> => {
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
          const errorData: { error?: string } = await response.json();
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }

        const result: { version_number: number } = await response.json();
        const newVersions = await fetchVersions();
        setVersions(newVersions);
        return result.version_number;
      } catch (error) {
        console.error("Save error:", error);
        toast.error("Save Failed", {
          description: error instanceof Error ? error.message : "Unknown error",
          duration: 3000,
        });
        return undefined;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const fetchVersions = useCallback(async (): Promise<number[]> => {
    try {
      const response = await fetch("/api/timetable?type=versions");
      if (!response.ok) {
        throw new Error("Failed to fetch versions");
      }
      const versionData: { version_number: number }[] = await response.json();
      // console.log("Fetched versions:", versionData);
      return versionData.map((v) => v.version_number);
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Failed to load versions");
      return versions;
    }
  }, [versions]);

  const fetchTimetableData = useCallback(
    async (version: number): Promise<void> => {
      if (isFetching) return;
      setIsFetching(true);
      setError(null);
      try {
        // console.log(`Fetching timetable for version ${version}`);
        const response = await fetch(`/api/timetable?version=${version}`);
        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }
        const jsonData: TimetableData = await response.json();
        // console.log("API response:", jsonData);

        // Validate data structure
        const isValidData = DAY_ORDER.every(
          (day) =>
            jsonData[day] === undefined ||
            (Array.isArray(jsonData[day]) &&
              jsonData[day].every(
                (roomObj: RoomSchedule) =>
                  roomObj &&
                  typeof roomObj === "object" &&
                  Object.keys(roomObj).length > 0 &&
                  PREDEFINED_ROOMS.includes(Object.keys(roomObj)[0])
              ))
        );

        if (!isValidData) {
          // console.warn("Invalid timetable data:", jsonData);
          setData(DAY_ORDER.reduce((acc, day) => ({ ...acc, [day]: [] }), {}));
          throw new Error("Invalid timetable data structure");
        }

        setData(jsonData);
        // console.log("Updated data state:", jsonData);
      } catch (error) {
        console.error("Error fetching timetable:", error);
        setError("Failed to load timetable for selected version");
        toast.error("Failed to load timetable", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsFetching(false);
      }
    },
    [isFetching]
  );

  const deleteVersion = useCallback(
    async (version: number): Promise<void> => {
      try {
        const response = await fetch(
          `/api/timetable?version_number=${version}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }

        const res: { version_number: number } = await response.json();
        toast.success(`Version ${res.version_number} deleted successfully`);
        const newVersions = await fetchVersions();
        setVersions(newVersions);

        let newSelectedVersion: number | undefined = undefined;
        const currentIndex = versions.indexOf(version);
        if (newVersions.length > 0) {
          if (currentIndex === 0) {
            newSelectedVersion = newVersions[0];
          } else if (currentIndex >= newVersions.length) {
            newSelectedVersion = newVersions[newVersions.length - 1];
          } else {
            newSelectedVersion =
              newVersions[currentIndex] || newVersions[currentIndex - 1];
          }
        }

        setSelectedVersion(newSelectedVersion);
        if (newSelectedVersion !== undefined) {
          await fetchTimetableData(newSelectedVersion);
        } else {
          setData(DAY_ORDER.reduce((acc, day) => ({ ...acc, [day]: [] }), {}));
        }
      } catch (error) {
        console.error("Failed to delete version:", error);
        toast.error("Deletion Failed", {
          description: "Could not delete the version. Please try again.",
          duration: 3000,
        });
      } finally {
        setIsDeleteDialogOpen(false);
      }
    },
    [versions, fetchVersions, fetchTimetableData]
  );

  const handleModalAction = useCallback(
    async (action: "cancel" | "same" | "new"): Promise<void> => {
      if (action === "cancel" || !pendingData) {
        setIsModalOpen(false);
        setPendingData(null);
        setIsDragProcessing(false); // Reset drag processing state
        return;
      }

      if (action === "same") {
        const result = await saveData(pendingData, selectedVersion);
        if (result !== undefined) {
          toast.success("Changes saved in same version");
          await fetchTimetableData(selectedVersion!);
        }
      } else if (action === "new") {
        const latestVersion = await saveData(pendingData);
        if (latestVersion !== undefined) {
          setSelectedVersion(latestVersion);
          toast.success("Changes saved in new version");
          await fetchTimetableData(latestVersion);
        }
      }

      setIsModalOpen(false);
      setPendingData(null);
      setIsDragProcessing(false); // Reset drag processing state
    },
    [pendingData, saveData, selectedVersion, fetchTimetableData]
  );

  const allRooms = useMemo((): string[] => {
    const rooms = Array.from(
      new Set(
        Object.values(data).flatMap((day) =>
          Array.isArray(day)
            ? day.flatMap((room) =>
                room && typeof room === "object"
                  ? Object.keys(room).filter((key) => room[key] !== undefined)
                  : []
              )
            : []
        )
      )
    );
    // console.log("Computed allRooms:", rooms);
    return rooms;
  }, [data]);

  const parseCellId = useCallback(
    (id: string): { day: string; room: string; time: string } => {
      const [day, ...rest] = id.split("-");
      const timeIndex = rest.findIndex((p) => p.includes(":"));
      const room = rest.slice(0, timeIndex).join("-");
      const time = rest[timeIndex] + "-" + rest[timeIndex + 1];
      return { day, room, time };
    },
    []
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      const sourceId = event.active.id as string;
      // console.log("Drag started:", sourceId);
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
        // console.log("Active session set:", sourceSessions[sourceIndex]);
      } else {
        console.warn("No valid session found for drag:", {
          sourceId,
          sourceSessions,
          sourceIndex,
        });
      }
    },
    [data, parseCellId]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      const { active, over } = event;
      // console.log("Drag ended:", { activeId: active.id, overId: over?.id });

      setActiveSession(null);

      if (!over) {
        // console.log("No drop target");
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
        // console.log("Same cell, no action needed");
        return;
      }

      // Set drag processing state immediately when drag ends
      setIsDragProcessing(true);

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
          console.warn("Not a draggable session:", sessionToMove);
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

      setPendingData(updatedData);
      setIsModalOpen(true);
      // console.log("Pending data set for save:", updatedData);
    },
    [data, parseCellId]
  );

  if (error) {
    return (
      <div className="flex justify-center items-center h-64 flex-1">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

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
              <div className="relative w-40 text-sm">
                <Select<VersionOption>
                  instanceId={versionId}
                  options={versions.map((version) => ({
                    value: version,
                    label: `Version ${version}`,
                  }))}
                  value={
                    selectedVersion !== undefined
                      ? {
                          value: selectedVersion,
                          label: `Version ${selectedVersion}`,
                        }
                      : null
                  }
                  onChange={(selectedOption) => {
                    const newVersion = selectedOption?.value;
                    setSelectedVersion(newVersion);
                    if (newVersion !== undefined) {
                      // console.log("Selected version:", newVersion);
                      fetchTimetableData(newVersion);
                    }
                  }}
                  placeholder="Select Version"
                  isDisabled={isFetching || isDragProcessing} // Disable during both fetch and drag processing
                  components={{
                    Option: ({ innerRef, innerProps, data, isSelected }) => (
                      <div
                        ref={innerRef}
                        {...innerProps}
                        className={`flex justify-between items-center p-2 hover:bg-blue-300 hover:text-white ${
                          isSelected
                            ? "bg-blue-900 text-white hover:bg-blue-900"
                            : ""
                        }`}
                      >
                        <span className="cursor-pointer">{data.label}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setVersionToDelete(data.value);
                            setIsDeleteDialogOpen(true);
                          }}
                          className="text-red-500 hover:text-red-700"
                        >
                          <FaRegTrashAlt />
                        </button>
                      </div>
                    ),
                  }}
                  className="text-black"
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      border: state.isFocused ? "0px" : provided.border,
                      outline: state.isFocused ? "none" : provided.outline,
                      boxShadow: state.isFocused ? "none" : provided.boxShadow,
                    }),
                  }}
                />
              </div>
            </div>
            <div className="font-medium w-[70%]">
              Please check your timetable daily for any possible change!
            </div>
          </div>
          {isFetching || isDragProcessing ? ( // Show loader for both conditions
            <div className="flex justify-center items-center h-[calc(100vh-8rem)] flex-1">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : Object.keys(data).length === 0 ? (
            <div className="flex justify-center items-center h-64 flex-1">
              <div className="text-xl text-gray-500">
                No timetable data available
              </div>
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
                      const roomData = Array.isArray(rooms)
                        ? rooms.find(
                            (room: RoomSchedule) =>
                              Object.keys(room)[0] === roomName
                          )
                        : null;
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
                            ) as Session | EmptySlot | undefined;
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
                                {!isEmpty &&
                                !isDraggingThisSession &&
                                session &&
                                "Faculty Assigned" in session ? (
                                  <DraggableSession
                                    id={`${cellId}-${
                                      session["Course Details"] || "session"
                                    }`}
                                    session={session as Session}
                                  />
                                ) : isDraggingThisSession &&
                                  session &&
                                  "Faculty Assigned" in session ? (
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
          <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <AlertDialogContent className="bg-black text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Save Timetable Changes</AlertDialogTitle>
                <AlertDialogDescription>
                  Do you want to save the changes to the current version, create
                  a new version, or cancel?
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => handleModalAction("cancel")}
                  className="bg-red-800 hover:bg-red-900 text-white"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleModalAction("same")}
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                >
                  Save in Same Version
                </AlertDialogAction>
                <AlertDialogAction
                  onClick={() => handleModalAction("new")}
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                >
                  Save in New Version
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        {isDeleteDialogOpen && (
          <AlertDialog
            open={isDeleteDialogOpen}
            onOpenChange={setIsDeleteDialogOpen}
          >
            <AlertDialogContent className="bg-black text-white">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete Version {versionToDelete}?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="bg-red-800 hover:bg-red-900 text-white"
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (versionToDelete !== null) {
                      deleteVersion(versionToDelete);
                    }
                  }}
                  className="bg-blue-900 hover:bg-blue-800 text-white"
                >
                  Confirm
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </DndContext>
      <Toaster />
    </main>
  );
}
