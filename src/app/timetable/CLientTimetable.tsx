"use client";

import React, {
  useCallback,
  useMemo,
  useState,
  useId,
  useRef,
  useEffect,
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
  AlertDialogOverlay,
  AlertDialogPortal,
} from "@/components/ui/alert-dialog";
import { toast, Toaster } from "sonner";
import {
  TimetableData,
  Session,
  EmptySlot,
  RoomSchedule,
  VersionOption,
} from "./types";
import { Rooms } from "@/helpers/page";
import { timeSlots } from "@/helpers/page";
import { Days } from "@/helpers/page";

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
  ({ session, isPlaceholder = false }) => (
    <div
      className={`text-center p-2 rounded-md ${
        isPlaceholder ? "text-gray-300 bg-gray-100 opacity-50" : ""
      }`}
    >
      <div className="font-medium">{session.Subject || "Unknown Course"}</div>
      <div className="text-sm">{session.Teacher || "No Faculty"}</div>
      <div className="text-sm">{session.Section || ""}</div>
    </div>
  )
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
        ? "opacity-70 scale-105 rotate-1 shadow-xl bg-blue-50"
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

const LoaderOverlay = ({ isLoading }: { isLoading: boolean }) =>
  isLoading ? (
    <div
      className="absolute inset-0 bg-white/50 flex items-center justify-center z-10 min-h-full"
      style={{ backdropFilter: "blur(2px)" }}
    >
      <svg
        className="animate-spin h-12 w-12 text-blue-500"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
        />
      </svg>
      <span className="ml-4 text-lg text-gray-700">Loading Version...</span>
    </div>
  ) : null;

export default function ClientTimetable({
  initialData,
  versions: initialVersions,
  initialSelectedVersion,
}: ClientTimetableProps) {
  const [data, setData] = useState<TimetableData>(initialData);
  const [pendingData, setPendingData] = useState<TimetableData | null>(null);
  const [lastFetchedData, setLastFetchedData] =
    useState<TimetableData>(initialData);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [versions, setVersions] = useState<number[]>(initialVersions);
  const [selectedVersion, setSelectedVersion] = useState<number | undefined>(
    initialSelectedVersion
  );
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [versionToDelete, setVersionToDelete] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<"none" | "same" | "new">("none");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isVersionLoading, setIsVersionLoading] = useState<boolean>(false);
  const timetableRef = useRef<HTMLDivElement>(null);
  const versionId = useId();

  useEffect(() => {
    document.body.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    if (timetableRef.current) {
      timetableRef.current.style.overflowY = isVersionLoading
        ? "hidden"
        : "auto";
      if (isVersionLoading) {
        timetableRef.current.scrollTop = 0;
      }
    }
  }, [isVersionLoading]);

  useEffect(() => {
    // Update URL with selected version
    if (selectedVersion !== undefined) {
      const url = new URL(window.location.href);
      url.searchParams.set("version", selectedVersion.toString());
      window.history.replaceState({}, "", url);
    }
  }, [selectedVersion]);

  const saveData = useCallback(
    async (
      dataToSave: TimetableData,
      version?: number
    ): Promise<number | undefined> => {
      try {
        const response = await fetch("/api/timetable", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...dataToSave, version_number: version }),
        });
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown server error" }));
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }
        const result: { version_number: number } = await response.json();
        const newVersions = await fetchVersions();
        setVersions(newVersions);
        return result.version_number;
      } catch (error) {
        console.error("Save error details:", error);
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
      if (!response.ok) throw new Error("Failed to fetch versions");
      const versionData: { version_number: number }[] = await response.json();
      return versionData.map((v) => v.version_number);
    } catch (error) {
      console.error("Error fetching versions:", error);
      toast.error("Failed to load versions");
      return versions;
    }
  }, [versions]);

  const fetchTimetableData = useCallback(
    async (version: number, isManualSelect: boolean = false): Promise<void> => {
      if (isManualSelect) setIsVersionLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/timetable?version=${version}`);
        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Unknown server error" }));
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }
        const jsonData: TimetableData = await response.json();
        const isValidData = Days.every(
          (day) =>
            jsonData[day] === undefined ||
            (Array.isArray(jsonData[day]) &&
              jsonData[day].every(
                (roomObj: RoomSchedule) =>
                  roomObj &&
                  typeof roomObj === "object" &&
                  Object.keys(roomObj).length > 0 &&
                  Rooms.includes(Object.keys(roomObj)[0])
              ))
        );
        if (!isValidData) {
          const defaultData = Days.reduce(
            (acc, day) => ({
              ...acc,
              [day]: Rooms.map((room) => ({
                [room]: timeSlots.map((time) => ({ Time: time } as EmptySlot)),
              })),
            }),
            {}
          );
          setData(defaultData);
          setLastFetchedData(defaultData);
          throw new Error("Invalid timetable data structure");
        }
        setData(jsonData);
        setLastFetchedData(jsonData);
        setPendingData(null);
      } catch (error) {
        console.error("Fetch timetable error:", error);
        setError("Failed to load timetable for version " + version);
        toast.error("Failed to load timetable", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        if (isManualSelect) setIsVersionLoading(false);
      }
    },
    []
  );

  const deleteVersion = useCallback(
    async (version: number): Promise<void> => {
      setIsDeleting(true);
      try {
        const response = await fetch(
          `/api/timetable?version_number=${version}`,
          { method: "DELETE" }
        );
        if (!response.ok) {
          const errorData: { error?: string } = await response.json();
          throw new Error(errorData.error || `HTTP error: ${response.status}`);
        }
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
          const defaultData = Days.reduce(
            (acc, day) => ({
              ...acc,
              [day]: Rooms.map((room) => ({
                [room]: timeSlots.map((time) => ({ Time: time } as EmptySlot)),
              })),
            }),
            {}
          );
          setData(defaultData);
          setLastFetchedData(defaultData);
        }
        toast.success(`Version ${version} deleted successfully`);
      } catch (error) {
        console.error("Failed to delete version:", error);
        toast.error("Deletion Failed", {
          description: "Could not delete the version. Please try again.",
          duration: 3000,
        });
      } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
      }
    },
    [versions, fetchVersions, fetchTimetableData]
  );

  const handleSaveAction = useCallback(
    async (
      action: "cancel" | "same" | "new",
      e?: React.MouseEvent<HTMLButtonElement>
    ): Promise<void> => {
      if (e) e.preventDefault();
      if (action === "cancel" || !pendingData) {
        setPendingData(null);
        setData(lastFetchedData); // Revert to last fetched data
        return;
      }
      setIsSaving(action);
      try {
        let result: number | undefined;
        if (action === "same") {
          result = await saveData(pendingData, selectedVersion);
        } else if (action === "new") {
          result = await saveData(pendingData);
        }
        if (result !== undefined) {
          setData(pendingData);
          setLastFetchedData(pendingData);
          setPendingData(null);
          if (action === "same" && selectedVersion !== undefined) {
            await fetchTimetableData(selectedVersion);
            toast.success("Changes saved in same version");
          } else if (action === "new") {
            setSelectedVersion(result);
            await fetchTimetableData(result);
            toast.success("Changes saved in new version");
          }
        }
      } finally {
        setIsSaving("none");
      }
    },
    [
      pendingData,
      saveData,
      selectedVersion,
      fetchTimetableData,
      lastFetchedData,
    ]
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
        "Teacher" in sourceSessions[sourceIndex]
      ) {
        setActiveSession(sourceSessions[sourceIndex] as Session);
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
      setActiveSession(null);
      if (!over) return;
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
      )
        return;
      const updatedData = produce(pendingData || data, (draft) => {
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
        if (!("Teacher" in sessionToMove)) {
          console.warn("Not a draggable session:", sessionToMove);
          return;
        }
        const destSession = destSessions[destIndex] as Session | EmptySlot;
        if ("Teacher" in destSession) {
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
    },
    [data, pendingData, parseCellId]
  );

  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)] flex-1">
        <div className="text-xl text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <main className="w-full h-full bg-gray-50 relative flex flex-col">
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="flex flex-col h-full px-2">
          <div className="bg-red-400 w-full flex items-center h-16 px-2 sticky top-0 justify-between z-40">
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
                      fetchTimetableData(newVersion, true);
                    }
                  }}
                  placeholder="Select Version"
                  isDisabled={isSaving !== "none" || isDeleting}
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
            <div className="flex items-center gap-2">
              {pendingData && (
                <>
                  <button
                    onClick={() => handleSaveAction("cancel")}
                    className="bg-red-800 hover:bg-red-900 text-white px-3 py-1 rounded disabled:opacity-50"
                    disabled={isSaving !== "none"}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => handleSaveAction("same", e)}
                    className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-3 py-1 rounded flex items-center gap-2 disabled:opacity-50"
                    disabled={isSaving !== "none"}
                  >
                    Save in Same Version
                    {isSaving === "same" && (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={(e) => handleSaveAction("new", e)}
                    className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-3 py-1 rounded flex items-center gap-2 disabled:opacity-50"
                    disabled={isSaving !== "none"}
                  >
                    Save in New Version
                    {isSaving === "new" && (
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
          <div className="flex-1 w-full">
            {Object.keys(data).length === 0 ? (
              <div className="flex justify-center items-center h-full flex-1">
                <div className="text-xl text-gray-500">
                  No timetable data available
                </div>
              </div>
            ) : (
              <div
                ref={timetableRef}
                className=""
                style={{
                  height: "calc(100vh - 8.5rem)",
                  overflowY: isVersionLoading ? "hidden" : "auto",
                }}
              >
                <LoaderOverlay isLoading={isVersionLoading} />
                <table className="border-collapse border bg-gray-50">
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
                    {Object.entries(pendingData || data).map(([day, rooms]) => (
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
                                  (s: Session | EmptySlot) =>
                                    s.Time === timeSlot
                                ) as Session | EmptySlot | undefined;
                                const isEmpty =
                                  !session || !("Teacher" in session);
                                const cellId = `${day}-${roomName}-${timeSlot}`;
                                const isDraggingThisSession =
                                  activeSession &&
                                  session &&
                                  "Teacher" in session &&
                                  session.Subject === activeSession.Subject &&
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
                                    "Teacher" in session ? (
                                      <DraggableSession
                                        id={`${cellId}-${
                                          session.Subject || "session"
                                        }`}
                                        session={session as Session}
                                      />
                                    ) : isDraggingThisSession &&
                                      session &&
                                      "Teacher" in session ? (
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
              </div>
            )}
          </div>
        </div>
        <DragOverlay style={{ zIndex: 60, pointerEvents: "none" }}>
          {activeSession ? (
            <DraggableSession
              id={`overlay-${activeSession.Subject}`}
              session={activeSession}
              isDragging
            />
          ) : null}
        </DragOverlay>
        <AlertDialog
          open={isDeleteDialogOpen}
          onOpenChange={setIsDeleteDialogOpen}
        >
          <AlertDialogPortal>
            <AlertDialogOverlay
              className="bg-[#042957]"
              style={{ backdropFilter: "blur(2px)" }}
            />
            <AlertDialogContent className="bg-[#042957] text-[#9ea8b5]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#9EA8F5]">
                  Confirm Deletion
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#9ea8b5]">
                  Are you sure you want to delete Version {versionToDelete}?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="bg-red-800 hover:bg-red-900 text-white"
                  disabled={isDeleting}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    if (versionToDelete !== null) {
                      deleteVersion(versionToDelete);
                    }
                  }}
                  className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2"
                  disabled={isDeleting}
                >
                  Confirm
                  {isDeleting && (
                    <svg
                      className="animate-spin h-5 w-5 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialogPortal>
        </AlertDialog>
      </DndContext>
      <Toaster />
    </main>
  );
}
