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
import { FaRegTrashAlt, FaDownload } from "react-icons/fa";
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
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import jsPDF from "jspdf";
import autoTable, { Styles, RowInput, CellInput } from "jspdf-autotable";
import * as XLSX from "xlsx";

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
  isMobile: boolean;
}

interface DraggableSessionProps {
  id: string;
  session: Session;
  isDragging?: boolean;
  isDisabled?: boolean;
}

interface DroppableDivProps {
  id: string;
  children: React.ReactNode;
  isEmpty: boolean;
  isDraggingOver: boolean;
  isMobile: boolean;
}

const SessionDetails: React.FC<SessionDetailsProps> = React.memo(
  ({ session, isPlaceholder = false }) => (
    <div
      className={`text-center p-1 rounded-md text-sm ${
        isPlaceholder ? "text-gray-300 bg-gray-100 opacity-50" : ""
      }`}
    >
      <div className="font-medium leading-tight">
        {session.Subject || "Unknown Course"}
      </div>
      <div className="text-sm leading-tight">
        {session.Teacher || "No Faculty"}
      </div>
      <div className="text-sm leading-tight">{session.Section || ""}</div>
    </div>
  )
);
SessionDetails.displayName = "SessionDetails";

const DroppableCell: React.FC<DroppableCellProps> = React.memo(
  ({ id, children, isEmpty, isDraggingOver, isMobile }) => {
    const { setNodeRef, isOver } = useDroppable({
      id,
      disabled: isMobile,
    });
    const className = `border p-3 transition-all duration-200 min-w-0 ${
      !isMobile && isOver ? "bg-blue-100 border-2 border-blue-400" : ""
    } ${
      !isMobile && isDraggingOver && isEmpty ? "bg-gray-100 opacity-50" : ""
    }`;
    return (
      <td ref={setNodeRef} className={className}>
        {children}
      </td>
    );
  }
);
DroppableCell.displayName = "DroppableCell";

const DraggableSession: React.FC<DraggableSessionProps> = React.memo(
  ({ id, session, isDragging = false, isDisabled = false }) => {
    const { attributes, listeners, setNodeRef } = useDraggable({
      id,
      disabled: isDisabled,
    });
    const className = `transition-all ease-in-out ${
      isDisabled
        ? "cursor-not-allowed opacity-50"
        : "cursor-move hover:bg-gray-50"
    } ${
      isDragging ? "opacity-70 scale-105 rotate-1 shadow-xl bg-blue-50" : ""
    }`;
    const staticAttributes = {
      ...attributes,
      "aria-describedby": `DndDescribedBy-${id.replace(/[^a-zA-Z0-9]/g, "")}`,
    };
    return (
      <div
        ref={setNodeRef}
        {...(isDisabled ? {} : listeners)}
        {...staticAttributes}
        className={className}
      >
        <SessionDetails session={session} />
      </div>
    );
  }
);
DraggableSession.displayName = "DraggableSession";

const DroppableDiv: React.FC<DroppableDivProps> = React.memo(
  ({ id, children, isEmpty, isDraggingOver, isMobile }) => {
    const { setNodeRef, isOver } = useDroppable({
      id,
      disabled: isMobile,
    });
    const className = `border p-1 md:p-2 transition-all duration-200 ${
      !isMobile && isOver ? "bg-blue-100 border-2 border-blue-400" : ""
    } ${
      !isMobile && isDraggingOver && isEmpty ? "bg-gray-100 opacity-50" : ""
    }`;
    return (
      <div ref={setNodeRef} className={className}>
        {children}
      </div>
    );
  }
);
DroppableDiv.displayName = "DroppableDiv";

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
  const [expandedRooms, setExpandedRooms] = useState<{
    [key: string]: boolean;
  }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const timetableRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const versionId = useId();

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
    if (selectedVersion !== undefined) {
      const url = new URL(window.location.href);
      url.searchParams.set("version", selectedVersion.toString());
      window.history.replaceState({}, "", url);
    }
  }, [selectedVersion]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
        const errorMessage =
          error instanceof Error
            ? `Failed to load timetable for version ${version}: ${error.message}`
            : `Failed to load timetable for version ${version}`;
        setError(errorMessage);
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
        setData(lastFetchedData);
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
    console.log("All Rooms:", rooms); // Debug: Check all rooms
    return rooms;
  }, [data]);

  const parseCellId = useCallback(
    (id: string): { day: string; room: string; time: string } => {
      const regex = /^([^-]+)-(.+)-(\d{1,2}:\d{2}-\d{1,2}:\d{2})(?:-(.+))?$/;
      const match = id.match(regex);
      if (!match) {
        console.warn(`Invalid cell ID format: ${id}`);
        return { day: "", room: "", time: "" };
      }
      const [, day, room, time] = match;
      return { day, room, time };
    },
    []
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      if (isMobile) return;
      const sourceId = event.active.id as string;
      const {
        day: sourceDay,
        room: sourceRoom,
        time: sourceTime,
      } = parseCellId(sourceId);
      if (!sourceDay || !sourceRoom || !sourceTime) return;
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
    [data, parseCellId, isMobile]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      if (isMobile) return;
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
        !sourceDay ||
        !destDay ||
        !sourceRoom ||
        !destRoom ||
        !sourceTime ||
        !destTime
      )
        return;
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
    [data, pendingData, parseCellId, isMobile]
  );

  const exportToPDF = useCallback(() => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const days = Object.keys(data) as (keyof TimetableData)[];

      // Create a title page
      doc.setFontSize(20);
      doc.text("University Timetable", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Version: ${selectedVersion || "Current"}`, 105, 30, {
        align: "center",
      });
      doc.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 35, {
        align: "center",
      });
      doc.addPage();

      // Process each day
      for (const day of days) {
        const dayData = data[day];
        if (!Array.isArray(dayData)) continue;

        // Prepare table data
        const tableData: RowInput[] = [];
        const tableHeaders: CellInput[] = ["Room", ...timeSlots];

        // Get all rooms for this day
        const roomsForDay: string[] = Array.from(
          new Set(
            dayData.flatMap((roomSchedule: RoomSchedule) =>
              Object.keys(roomSchedule)
            )
          )
        );

        // Build table rows
        for (const roomName of roomsForDay) {
          const roomData = dayData.find(
            (roomSchedule: RoomSchedule) =>
              Object.keys(roomSchedule)[0] === roomName
          );

          if (!roomData) continue;

          const sessions =
            roomData[roomName] ||
            timeSlots.map((time) => ({ Time: time } as EmptySlot));

          const row: CellInput[] = [roomName];

          for (const timeSlot of timeSlots) {
            const session = sessions.find(
              (s: Session | EmptySlot) => s.Time === timeSlot
            );

            if (session && "Teacher" in session) {
              row.push({
                content: [
                  session.Subject || "Unknown Course",
                  session.Teacher || "No Faculty",
                  session.Section || "",
                ].join("\n"),
                styles: { fontStyle: "normal" } as Styles,
              });
            } else {
              row.push({
                content: "Free",
                styles: {
                  fontStyle: "italic",
                  textColor: [128, 128, 128],
                } as Styles,
              });
            }
          }

          tableData.push(row);
        }

        // Add day title
        doc.setFontSize(16);
        doc.text(`${day} Timetable`, 105, 15, { align: "center" });
        doc.setFontSize(10);

        // Generate the table
        autoTable(doc, {
          head: [tableHeaders],
          body: tableData,
          startY: 20,
          margin: { top: 20 },
          styles: {
            fontSize: 8,
            cellPadding: 2,
            overflow: "linebreak",
            halign: "center",
            valign: "middle",
          } as Styles,
          headStyles: {
            fillColor: [41, 41, 84],
            textColor: [255, 255, 255],
            fontStyle: "bold",
          } as Styles,
          bodyStyles: {
            textColor: [0, 0, 0],
            lineColor: [0, 0, 0],
            lineWidth: 0.2,
          } as Styles,
          alternateRowStyles: {
            fillColor: [240, 240, 240],
          } as Styles,
        });

        // Add new page except for last day
        if (day !== days[days.length - 1]) {
          doc.addPage();
        }
      }

      const fileName = `timetable${
        selectedVersion ? `-v${selectedVersion}` : ""
      }.pdf`;
      doc.save(fileName);

      toast.success("PDF Exported Successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF Export Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [selectedVersion, data]);

  const exportToXLSX = useCallback(() => {
    try {
      console.log("Starting Excel export process...");
      const timetableData = pendingData || data;
      const sheetData: (string | undefined)[][] = [
        ["Day", "Room", ...timeSlots],
      ];

      console.log("Timetable Data for Excel Export:", timetableData);
      console.log("Days being processed:", Days);

      Days.forEach((day) => {
        console.log(`Processing day: ${day}`);
        const dayData = timetableData[day] || [];
        console.log(`Day Data for ${day}:`, dayData);

        allRooms.forEach((roomName) => {
          console.log(`Processing room for ${day}: ${roomName}`);
          const roomData = dayData.find(
            (room: RoomSchedule) => Object.keys(room)[0] === roomName
          );
          const sessions = roomData
            ? roomData[roomName] || timeSlots.map((time) => ({ Time: time }))
            : timeSlots.map((time) => ({ Time: time }));

          const row: (string | undefined)[] = [day, roomName];
          timeSlots.forEach((timeSlot) => {
            const session = sessions.find(
              (s: Session | EmptySlot) => s.Time === timeSlot
            ) as Session | EmptySlot | undefined;
            row.push(
              session && "Teacher" in session
                ? `${session.Subject || "Unknown Course"} (${
                    session.Teacher || "No Faculty"
                  }${session.Section ? ` - ${session.Section}` : ""})`
                : "Free"
            );
          });
          sheetData.push(row);
        });
      });

      console.log("Sheet Data for Excel:", sheetData);

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");

      const fileName = `timetable${
        selectedVersion ? `-v${selectedVersion}` : ""
      }.xlsx`;
      console.log(`Attempting to save Excel as ${fileName}...`);

      // Fallback: If XLSX.writeFile fails, use a manual Blob download
      const binary = XLSX.write(workbook, { bookType: "xlsx", type: "binary" });
      const buffer = new ArrayBuffer(binary.length);
      const view = new Uint8Array(buffer);
      for (let i = 0; i < binary.length; i++) {
        view[i] = binary.charCodeAt(i) & 0xff;
      }
      const blob = new Blob([buffer], { type: "application/octet-stream" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Excel Exported Successfully");
    } catch (error) {
      console.error("Excel Export Error:", error);
      toast.error("Excel Export Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [data, pendingData, selectedVersion, allRooms]);

  const toggleRoom = (day: string, room: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [`${day}-${room}`]: !prev[`${day}-${room}`],
    }));
  };

  if (error) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-4rem)] flex-1">
        <div className="text-xl text-red-500 flex flex-col items-center gap-2">
          <span>{error}</span>
          <button
            onClick={() =>
              selectedVersion !== undefined &&
              fetchTimetableData(selectedVersion, true)
            }
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={isVersionLoading}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="w-full h-full bg-gray-50 relative flex flex-col lg:px-2">
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="flex flex-col h-full">
          <div className="bg-[#042954] w-full flex flex-col md:flex-row items-center h-auto md:h-16 px-2 sticky top-0 justify-between z-40 py-2 md:py-0">
            <div className="flex items-center w-full md:w-[30%] mb-2 md:mb-0">
              <label className="mr-2 flex text-white text-sm md:text-base">
                Select Version:
              </label>
              <div className="relative w-32 md:w-40 text-xs md:text-sm">
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
                        className={`flex justify-between items-center p-2 text-sm hover:bg-blue-300 hover:text-white ${
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
            {/*  */}
            <div className="flex items-center gap-2">
              {pendingData && (
                <>
                  <button
                    onClick={() => handleSaveAction("cancel")}
                    className="bg-red-800 hover:bg-red-900 text-white px-2 md:px-3 py-1 rounded disabled:opacity-50 text-xs md:text-sm"
                    disabled={isSaving !== "none"}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => handleSaveAction("same", e)}
                    className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-2 md:px-3 py-1 rounded flex items-center gap-1 md:gap-2 disabled:opacity-50 text-xs md:text-sm"
                    disabled={isSaving !== "none"}
                  >
                    Save in Same Version
                    {isSaving === "same" && (
                      <svg
                        className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white"
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
                    className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-2 md:px-3 py-1 rounded flex items-center gap-1 md:gap-2 disabled:opacity-50 text-xs md:text-sm"
                    disabled={isSaving !== "none"}
                  >
                    Save in New Version
                    {isSaving === "new" && (
                      <svg
                        className="animate-spin h-4 w-4 md:h-5 md:w-5 text-white"
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

              {/* Export dropdown */}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(!showExportDropdown)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-2 md:px-3 py-1 rounded flex items-center gap-1 md:gap-2 text-xs md:text-sm"
                  disabled={isVersionLoading}
                >
                  <FaDownload className="text-base md:text-lg" />
                </button>

                {showExportDropdown && (
                  <div className="absolute right-0 mt-1 w-40 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowExportDropdown(false);
                        exportToPDF();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50"
                      disabled={isVersionLoading}
                    >
                      Download in pdf
                    </button>
                    <button
                      onClick={() => {
                        setShowExportDropdown(false);
                        exportToXLSX();
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 border-t"
                      disabled={isVersionLoading}
                    >
                      Download in Excel
                    </button>
                  </div>
                )}
              </div>
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
                id="timetable-container"
                className="relative w-full"
                style={{
                  height: "calc(100vh - 8.5rem)",
                  overflowY: isVersionLoading ? "hidden" : "auto",
                }}
              >
                <LoaderOverlay isLoading={isVersionLoading} />

                <div className="block md:hidden space-y-4 p-4">
                  {Object.entries(pendingData || data).map(([day, rooms]) => (
                    <div key={day} className="mb-6">
                      <h2 className="text-lg font-semibold text-gray-700 mb-2">
                        {day}
                      </h2>
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
                        const isExpanded =
                          expandedRooms[`${day}-${roomName}`] || false;

                        return (
                          <div
                            key={`${day}-${roomName}`}
                            className="border rounded-lg shadow-sm bg-white mb-2"
                          >
                            <div
                              className="flex justify-between items-center p-3 cursor-pointer bg-gray-100"
                              onClick={() => toggleRoom(day, roomName)}
                            >
                              <h3 className="text-sm font-medium">
                                {roomName}
                              </h3>
                              {isExpanded ? (
                                <IoIosArrowUp size={16} />
                              ) : (
                                <IoIosArrowDown size={16} />
                              )}
                            </div>
                            {isExpanded && (
                              <div className="p-3 space-y-2">
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
                                    <div
                                      key={cellId}
                                      className="flex items-center border-b py-2"
                                    >
                                      <div className="w-1/3 text-sm font-medium">
                                        {timeSlot}
                                      </div>
                                      <div className="w-2/3">
                                        <DroppableDiv
                                          id={cellId}
                                          isEmpty={isEmpty}
                                          isDraggingOver={
                                            !!isDraggingThisSession
                                          }
                                          isMobile={isMobile}
                                        >
                                          {!isEmpty &&
                                          !isDraggingThisSession &&
                                          session &&
                                          "Teacher" in session ? (
                                            <DraggableSession
                                              id={`${cellId}-${(
                                                session.Subject || "session"
                                              ).replace(/[^a-zA-Z0-9]/g, "_")}`}
                                              session={session as Session}
                                              isDisabled={
                                                isSaving !== "none" || isMobile
                                              }
                                            />
                                          ) : isDraggingThisSession &&
                                            session &&
                                            "Teacher" in session ? (
                                            <SessionDetails
                                              session={session as Session}
                                              isPlaceholder
                                            />
                                          ) : (
                                            <div className="text-center text-gray-600 text-sm">
                                              Free
                                            </div>
                                          )}
                                        </DroppableDiv>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>

                <div className="hidden md:block overflow-x-auto">
                  <table
                    id="timetable-table"
                    className="border-collapse border bg-gray-50 w-full"
                  >
                    <thead>
                      <tr className="bg-gray-100">
                        {[
                          <th
                            key="day"
                            className="border p-3 text-sm md:text-base max-w-[60px]"
                          >
                            Day
                          </th>,
                          <th
                            key="room"
                            className="border p-3 text-sm md:text-base max-w-[80px]"
                          >
                            Room
                          </th>,
                          ...timeSlots.map((time) => (
                            <th
                              key={time}
                              className="border p-3 text-center text-xs md:text-sm whitespace-normal"
                            >
                              {time}
                            </th>
                          )),
                        ]}
                      </tr>
                    </thead>
                    <tbody>
                      {Object.entries(pendingData || data).map(
                        ([day, rooms]) => (
                          <React.Fragment key={day}>
                            <tr>
                              <td
                                rowSpan={allRooms.length + 1}
                                className="border align-middle bg-gray-50 p-2 max-w-[60px] text-sm md:text-base"
                              >
                                <div className="-rotate-90 font-medium">
                                  {day}
                                </div>
                              </td>
                            </tr>
                            {allRooms.map((roomName, roomIndex, roomArray) => {
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
                              const isLastRow =
                                roomIndex === roomArray.length - 1;
                              return (
                                <tr
                                  key={`${day}-${roomName}`}
                                  className={isLastRow ? "border-b-2" : ""}
                                >
                                  <td className="border p-1 text-sm md:text-base max-w-[80px]">
                                    {roomName}
                                  </td>
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
                                      session.Subject ===
                                        activeSession.Subject &&
                                      session.Time === activeSession.Time;
                                    return (
                                      <DroppableCell
                                        key={cellId}
                                        id={cellId}
                                        isEmpty={isEmpty}
                                        isDraggingOver={!!isDraggingThisSession}
                                        isMobile={isMobile}
                                      >
                                        {!isEmpty &&
                                        !isDraggingThisSession &&
                                        session &&
                                        "Teacher" in session ? (
                                          <DraggableSession
                                            id={`${cellId}-${(
                                              session.Subject || "session"
                                            ).replace(/[^a-zA-Z0-9]/g, "_")}`}
                                            session={session as Session}
                                            isDisabled={
                                              isSaving !== "none" || isMobile
                                            }
                                          />
                                        ) : isDraggingThisSession &&
                                          session &&
                                          "Teacher" in session ? (
                                          <SessionDetails
                                            session={session as Session}
                                            isPlaceholder
                                          />
                                        ) : (
                                          <div className="text-center text-gray-300 text-sm"></div>
                                        )}
                                      </DroppableCell>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
        <DragOverlay style={{ zIndex: 60, pointerEvents: "none" }}>
          {!isMobile && activeSession ? (
            <DraggableSession
              id={`overlay-${activeSession.Subject}`}
              session={activeSession}
              isDragging
              isDisabled={isSaving !== "none"}
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
                <AlertDialogDescription className="text-[#9ea8b5] text-sm">
                  Are you sure you want to delete Version {versionToDelete}?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => setIsDeleteDialogOpen(false)}
                  className="bg-red-800 hover:bg-red-900 text-white text-sm"
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
                  className="bg-blue-900 hover:bg-blue-800 text-white flex items-center gap-2 text-sm"
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
