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
import { toast } from "sonner";
import { Session, EmptySlot, RoomSchedule, TimetableData } from "./types";
import { timeSlots, Days } from "@/helpers/page";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import jsPDF from "jspdf";
import autoTable, { Styles, RowInput, CellInput } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { useTimetableVersion } from "@/context/TimetableContext";
import debounce from "just-debounce-it";
import { DraggableSession, DroppableCell, DroppableDiv } from "./DragAndDrop";
import AddClassDialog from "./AddClassDialog";

interface SessionDetailsProps {
  session: Session;
  isPlaceholder?: boolean;
}

export const SessionDetails: React.FC<SessionDetailsProps> = React.memo(
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

const TeacherFilter: React.FC<{
  onFilterChange: (teacher: string | null) => void;
}> = React.memo(({ onFilterChange }) => {
  const { timetableData } = useTimetableVersion();
  const teacherId = useId();
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);

  const teacherOptions = useMemo(() => {
    const teachers = new Set<string>();
    Days.forEach((day) => {
      const dayData = timetableData[day] || [];
      dayData.forEach((roomSchedule: RoomSchedule) => {
        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName] || [];
        sessions.forEach((session: Session | EmptySlot) => {
          if ("Teacher" in session && session.Teacher) {
            teachers.add(session.Teacher);
          }
        });
      });
    });
    return Array.from(teachers).map((teacher) => ({
      value: teacher,
      label: teacher,
    }));
  }, [timetableData]);

  return (
    <div className="flex items-center w-full sm:w-3/4 md:w-40 lg:w-80 min-w-[120px]">
      <label className="text-white text-xs sm:text-sm">
        Filter by Teacher:
      </label>
      <div className="relative w-full text-xs sm:text-sm">
        <Select
          instanceId={teacherId}
          options={teacherOptions}
          value={
            selectedTeacher
              ? teacherOptions.find(
                  (option) => option.value === selectedTeacher
                )
              : null
          }
          onChange={(selectedOption) => {
            const value = selectedOption ? selectedOption.value : null;
            setSelectedTeacher(value);
            onFilterChange(value);
          }}
          placeholder="Select Teacher"
          isClearable={true}
          className="text-black"
          styles={{
            control: (provided, state) => ({
              ...provided,
              border: state.isFocused ? "0px" : provided.border,
              outline: state.isFocused ? "none" : provided.outline,
              boxShadow: state.isFocused ? "none" : provided.boxShadow,
              fontSize: "0.875rem",
              minHeight: "32px",
              width: "100%",
              maxWidth: "100%",
            }),
            menu: (provided) => ({
              ...provided,
              maxWidth: "100%",
            }),
            option: (provided) => ({
              ...provided,
              padding: "8px",
            }),
          }}
        />
      </div>
    </div>
  );
});
TeacherFilter.displayName = "TeacherFilter";

export default function ClientTimetable() {
  const {
    versions,
    selectedVersion,
    timetableData,
    conflicts,
    loading: isVersionLoading,
    error: hookError,
    setSelectedVersion,
    saveTimetableData,
    deleteVersion: contextDeleteVersion,
    checkConflicts,
  } = useTimetableVersion();

  const [pendingData, setPendingData] = useState<TimetableData | null>(null);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState<boolean>(false);
  const [versionToDelete, setVersionToDelete] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState<"none" | "same" | "new">("none");
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [expandedRooms, setExpandedRooms] = useState<{
    [key: string]: boolean;
  }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string | null>(null);
  const [isAddClassDialogOpen, setIsAddClassDialogOpen] = useState(false);
  const [addClassCell, setAddClassCell] = useState<{
    day: string;
    room: string;
    time: string;
  } | null>(null);
  const [isDeleteClassDialogOpen, setIsDeleteClassDialogOpen] = useState(false);
  const [deleteClassCell, setDeleteClassCell] = useState<{
    day: string;
    room: string;
    time: string;
  } | null>(null);
  const [isDeleteClassLoading, setIsDeleteClassLoading] = useState(false);
  const [isAddClassLoading, setIsAddClassLoading] = useState(false);
  const timetableRef = useRef<HTMLDivElement>(null);
  const exportDropdownRef = useRef<HTMLDivElement>(null);
  const versionId = useId();

  const [isOperationLoading, setIsOperationLoading] = useState(false);
  const debouncedCheckConflicts = useMemo(
    () => debounce(checkConflicts, 300),
    [checkConflicts]
  );

  const data = pendingData || timetableData;

  const filteredData = useMemo(() => {
    if (!selectedTeacher) return data;
    const filtered: TimetableData = {
      Monday: [],
      Tuesday: [],
      Wednesday: [],
      Thursday: [],
      Friday: [],
    };
    Days.forEach((day) => {
      const dayData = data[day] || [];
      const filteredRooms: RoomSchedule[] = dayData
        .map((roomSchedule: RoomSchedule) => {
          const roomName = Object.keys(roomSchedule)[0];
          if (!roomName) {
            return null;
          }
          const sessions = roomSchedule[roomName] || [];
          const filteredSessions = sessions.filter(
            (session: Session | EmptySlot): session is Session =>
              "Teacher" in session && session.Teacher === selectedTeacher
          );
          return { [roomName]: filteredSessions } as RoomSchedule;
        })
        .filter(
          (roomSchedule): roomSchedule is RoomSchedule =>
            !!roomSchedule && Object.values(roomSchedule)[0].length > 0
        );
      if (filteredRooms.length > 0) {
        filtered[day] = filteredRooms;
      }
    });
    return filtered;
  }, [data, selectedTeacher]);

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
    return () => {
      document.body.style.overflow = "";
    };
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
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (
        exportDropdownRef.current &&
        !exportDropdownRef.current.contains(event.target as Node)
      ) {
        setShowExportDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    debouncedCheckConflicts(data);
    return () => debouncedCheckConflicts.cancel();
  }, [data, debouncedCheckConflicts]);

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
      const regex = /^([^-]+)-(.+)-(\d{1,2}:\d{2}-\d{1,2}:\d{2})(?:-(.+))?$/;
      const match = id.match(regex);
      if (!match) {
        return { day: "", room: "", time: "" };
      }
      const [, day, room, time] = match;
      return { day, room, time };
    },
    []
  );

  const getCellConflicts = useCallback(
    (day: string, room: string, time: string): string[] => {
      const roomData = (selectedTeacher ? filteredData : data)[day]?.find(
        (r: RoomSchedule) => Object.keys(r)[0] === room
      );
      if (!roomData) return [];
      const sessions = roomData[room] || [];
      const sessionIndex = sessions.findIndex(
        (s: Session | EmptySlot) => s.Time === time
      );
      if (sessionIndex === -1 || !("Teacher" in sessions[sessionIndex]))
        return [];
      return conflicts
        .filter(
          (c) =>
            c.day === day &&
            c.time === time &&
            c.room === room &&
            c.classIndex === sessionIndex
        )
        .map((c) => c.message);
    },
    [data, filteredData, conflicts, selectedTeacher]
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
      const updatedData = produce(data, (draft) => {
        const sourceRoomData = draft[sourceDay]?.find(
          (room: RoomSchedule) => Object.keys(room)[0] === sourceRoom
        );
        const destRoomData = draft[destDay]?.find(
          (room: RoomSchedule) => Object.keys(room)[0] === destRoom
        );
        if (!sourceRoomData || !destRoomData) return;

        const sourceSessions = sourceRoomData[sourceRoom];
        const destSessions = destRoomData[destRoom];
        if (!sourceSessions || !destSessions) return;

        const sourceIndex = sourceSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === sourceTime
        );
        const destIndex = destSessions.findIndex(
          (session: Session | EmptySlot) => session.Time === destTime
        );
        if (sourceIndex === -1 || destIndex === -1) return;

        const sessionToMove = sourceSessions[sourceIndex] as
          | Session
          | EmptySlot;
        if (!("Teacher" in sessionToMove)) return;

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
      debouncedCheckConflicts(updatedData);
    },
    [data, parseCellId, isMobile, debouncedCheckConflicts]
  );

  const handleAddClass = useCallback(
    async (
      day: string,
      room: string,
      time: string,
      classData: { subject: string; teacher: string; section: string }
    ) => {
      setIsAddClassLoading(true);
      setIsOperationLoading(true);
      const updatedData = produce(timetableData, (draft) => {
        const roomData = draft[day]?.find(
          (r: RoomSchedule) => Object.keys(r)[0] === room
        );
        if (!roomData) return;
        const sessions = roomData[room] || [];
        const sessionIndex = sessions.findIndex(
          (s: Session | EmptySlot) => s.Time === time
        );
        if (sessionIndex === -1) return;
        sessions[sessionIndex] = {
          Time: time,
          Room: room,
          Subject: classData.subject,
          Teacher: classData.teacher,
          Section: classData.section,
        };
      });
      try {
        const newVersion = await saveTimetableData(
          updatedData,
          selectedVersion ?? undefined
        );
        await setSelectedVersion(newVersion); // Refetch data
        toast.success(
          `Class added and saved successfully as Version ${newVersion}`
        );
        setIsAddClassDialogOpen(false); // Auto-close
        setAddClassCell(null);
      } catch (error) {
        toast.error("Failed to save class", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error; // Keep dialog open
      } finally {
        setIsAddClassLoading(false);
        setIsOperationLoading(false);
      }
      debouncedCheckConflicts(updatedData);
    },
    [
      timetableData,
      saveTimetableData,
      selectedVersion,
      debouncedCheckConflicts,
      setSelectedVersion,
    ]
  );

  const handleDeleteClass = useCallback(
    async (day: string, room: string, time: string) => {
      setIsDeleteClassLoading(true);
      setIsOperationLoading(true);
      const updatedData = produce(timetableData, (draft) => {
        const roomData = draft[day]?.find(
          (r: RoomSchedule) => Object.keys(r)[0] === room
        );
        if (!roomData) return;
        const sessions = roomData[room] || [];
        const sessionIndex = sessions.findIndex(
          (s: Session | EmptySlot) => s.Time === time
        );
        if (sessionIndex === -1) return;
        sessions[sessionIndex] = { Time: time };
      });
      try {
        const newVersion = await saveTimetableData(
          updatedData,
          selectedVersion ?? undefined
        );
        await setSelectedVersion(newVersion); // Refetch data
        toast.success("Class deleted successfully");
        setIsDeleteClassDialogOpen(false);
        setDeleteClassCell(null);
      } catch (error) {
        toast.error("Failed to delete class", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
        throw error;
      } finally {
        setIsDeleteClassLoading(false);
        setIsOperationLoading(false);
      }
      debouncedCheckConflicts(updatedData);
    },
    [
      timetableData,
      saveTimetableData,
      selectedVersion,
      debouncedCheckConflicts,
      setSelectedVersion,
    ]
  );

  const exportToPDF = useCallback(() => {
    try {
      const doc = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4",
      });

      const days = Days;

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

      for (const day of days) {
        const dayData = (selectedTeacher ? filteredData : data)[day] || [];
        if (!Array.isArray(dayData)) continue;

        const tableData: RowInput[] = [];
        const tableHeaders: CellInput[] = ["Room", ...timeSlots];

        const roomsForDay: string[] = Array.from(
          new Set(
            dayData.flatMap((roomSchedule: RoomSchedule) =>
              Object.keys(roomSchedule)
            )
          )
        );

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

        doc.setFontSize(16);
        doc.text(`${day} Timetable`, 105, 15, { align: "center" });
        doc.setFontSize(10);

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

        if (day !== days[days.length - 1]) {
          doc.addPage();
        }
      }

      const fileName = `timetable${
        selectedVersion ? `-v${selectedVersion}` : ""
      }${selectedTeacher ? `-teacher-${selectedTeacher}` : ""}.pdf`;
      doc.save(fileName);

      toast.success("PDF Exported Successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error("PDF Export Failed", {
        description: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }, [selectedVersion, data, filteredData, selectedTeacher]);

  const exportToXLSX = useCallback(() => {
    try {
      const sheetData: (string | undefined)[][] = [
        ["Day", "Room", ...timeSlots],
      ];

      Days.forEach((day) => {
        const dayData = (selectedTeacher ? filteredData : data)[day] || [];

        allRooms.forEach((roomName) => {
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

      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, worksheet, "Timetable");

      const fileName = `timetable${
        selectedVersion ? `-v${selectedVersion}` : ""
      }${selectedTeacher ? `-teacher-${selectedTeacher}` : ""}.xlsx`;
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
  }, [data, selectedVersion, allRooms, filteredData, selectedTeacher]);

  const toggleRoom = (day: string, room: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [`${day}-${room}`]: !prev[`${day}-${room}`],
    }));
  };

  const handleSaveAction = useCallback(
    async (
      action: "cancel" | "same" | "new",
      e?: React.MouseEvent<HTMLButtonElement>
    ): Promise<void> => {
      if (e) e.preventDefault();
      if (action === "cancel" || !pendingData) {
        setPendingData(null);
        return;
      }

      try {
        setIsSaving(action);

        let newVersion: number;
        if (action === "same" && selectedVersion !== null) {
          newVersion = await saveTimetableData(pendingData, selectedVersion);
        } else if (action === "new") {
          newVersion = await saveTimetableData(pendingData);
        } else {
          throw new Error("Invalid save action");
        }

        setPendingData(null);
        toast.success(`Changes saved successfully as Version ${newVersion}`);
      } catch (error) {
        toast.error("Save failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsSaving("none");
      }
    },
    [pendingData, saveTimetableData, selectedVersion]
  );

  const handleDeleteVersion = useCallback(
    async (version: number): Promise<void> => {
      setIsDeleting(true);
      try {
        await contextDeleteVersion(version);
        toast.success(`Version ${version} deleted successfully`);
      } catch (error) {
        toast.error("Deletion failed", {
          description: error instanceof Error ? error.message : "Unknown error",
        });
      } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
      }
    },
    [contextDeleteVersion]
  );

  if (hookError) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">Error: {hookError}</div>
      </div>
    );
  }

  if (versions.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-xl text-gray-500">
          No timetable versions available. Create a new version to start.
        </div>
      </div>
    );
  }

  return (
    <main className="w-full h-full bg-gray-50 relative flex flex-col lg:px-2 min-w-0">
      <DndContext
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div className="flex flex-col h-full">
          <div className="bg-[#042954] w-full flex flex-col sm:flex-row sm:flex-wrap md:flex-row md:flex-nowrap items-center px-4 py-3 sm:py-4 sticky top-0 justify-between z-40 min-h-[60px]">
            <div className="flex flex-col sm:flex-row sm:flex-wrap md:flex-row md:flex-nowrap items-center w-full md:w-2/3 gap-3 sm:gap-4">
              <div className="w-full sm:w-3/4 md:w-40 lg:w-1/4 flex items-center text-sm shrink-0 min-w-[120px]">
                <label className="text-white mr-2 text-xs sm:text-sm">
                  Select Version:
                </label>
                <Select
                  instanceId={versionId}
                  options={versions.map((version) => ({
                    value: version,
                    label: `Version ${version}`,
                  }))}
                  value={
                    selectedVersion !== null
                      ? {
                          value: selectedVersion,
                          label: `Version ${selectedVersion}`,
                        }
                      : null
                  }
                  onChange={async (selectedOption) => {
                    const newVersion = selectedOption?.value;
                    if (newVersion !== undefined) {
                      await setSelectedVersion(newVersion);
                    }
                  }}
                  placeholder="Select Version"
                  isDisabled={isSaving !== "none" || isDeleting}
                  components={{
                    Option: ({ innerRef, innerProps, data, isSelected }) => (
                      <div
                        ref={innerRef}
                        {...innerProps}
                        className={`flex justify-between items-center p-2 text-xs sm:text-sm hover:bg-blue-300 hover:text-white ${
                          isSelected ? "bg-blue-900 text-white" : ""
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
                          <FaRegTrashAlt className="text-sm sm:text-base" />
                        </button>
                      </div>
                    ),
                  }}
                  className="text-black w-full"
                  styles={{
                    control: (provided, state) => ({
                      ...provided,
                      border: state.isFocused ? "0px" : provided.border,
                      outline: state.isFocused ? "none" : provided.outline,
                      boxShadow: state.isFocused ? "none" : provided.boxShadow,
                      fontSize: "0.875rem",
                      minHeight: "32px",
                      width: "100%",
                      maxWidth: "100%",
                    }),
                    menu: (provided) => ({
                      ...provided,
                      zIndex: 50,
                      maxWidth: "100%",
                    }),
                    option: (provided) => ({
                      ...provided,
                      padding: "8px",
                    }),
                  }}
                />
              </div>
              <TeacherFilter onFilterChange={setSelectedTeacher} />
            </div>

            <div className="flex items-center gap-2 mt-3 sm:mt-0">
              {pendingData && (
                <div className="hidden lg:flex items-center gap-2">
                  <button
                    onClick={() => handleSaveAction("cancel")}
                    className="bg-red-800 hover:bg-red-900 text-white px-3 py-1.5 rounded disabled:opacity-50 text-xs sm:text-sm"
                    disabled={isSaving !== "none"}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={(e) => handleSaveAction("same", e)}
                    className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
                    disabled={isSaving !== "none" || selectedVersion === null}
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
                    className="bg-blue-900 hover:bg-blue-800 text-[#9EA8F5] px-3 py-1.5 rounded flex items-center gap-2 disabled:opacity-50 text-xs sm:text-sm"
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
                </div>
              )}
              <div className="relative" ref={exportDropdownRef}>
                <button
                  onClick={() => setShowExportDropdown(true)}
                  className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded flex items-center gap-2 text-xs sm:text-sm"
                  disabled={isVersionLoading}
                >
                  <FaDownload className="text-base sm:text-lg" />
                  Download
                </button>
                {showExportDropdown && (
                  <div className="absolute right-0 mt-2 w-40 sm:w-36 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowExportDropdown(false);
                        exportToPDF();
                      }}
                      className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100"
                      disabled={isVersionLoading}
                    >
                      Download as PDF
                    </button>
                    <button
                      onClick={() => {
                        setShowExportDropdown(false);
                        exportToXLSX();
                      }}
                      className="w-full text-left px-4 py-2 text-xs sm:text-sm text-gray-700 hover:bg-gray-100 border-t"
                      disabled={isVersionLoading}
                    >
                      Download as Excel
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 w-full">
            {Object.keys(selectedTeacher ? filteredData : data).length === 0 ? (
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
              >
                <div className="block md:hidden space-y-4 p-4">
                  {Days.map((day) => {
                    const rooms =
                      (selectedTeacher ? filteredData : data)[day] || [];
                    return (
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
                                      session.Subject ===
                                        activeSession.Subject &&
                                      session.Time === activeSession.Time;
                                    const cellConflicts = getCellConflicts(
                                      day,
                                      roomName,
                                      timeSlot
                                    );

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
                                            conflicts={cellConflicts}
                                            isLoading={
                                              isOperationLoading ||
                                              isVersionLoading
                                            }
                                            onAddClass={() => {
                                              setAddClassCell({
                                                day,
                                                room: roomName,
                                                time: timeSlot,
                                              });
                                              setIsAddClassDialogOpen(true);
                                            }}
                                            onDeleteClass={() => {
                                              setDeleteClassCell({
                                                day,
                                                room: roomName,
                                                time: timeSlot,
                                              });
                                              setIsDeleteClassDialogOpen(true);
                                            }}
                                          >
                                            {!isVersionLoading &&
                                              !isEmpty &&
                                              !isDraggingThisSession &&
                                              session &&
                                              "Teacher" in session && (
                                                <DraggableSession
                                                  id={`${cellId}-${(
                                                    session.Subject || "session"
                                                  ).replace(
                                                    /[^a-zA-Z0-9]/g,
                                                    "_"
                                                  )}`}
                                                  session={session as Session}
                                                  isDisabled={
                                                    isSaving !== "none" ||
                                                    isMobile
                                                  }
                                                />
                                              )}
                                            {!isVersionLoading &&
                                              isDraggingThisSession &&
                                              session &&
                                              "Teacher" in session && (
                                                <SessionDetails
                                                  session={session as Session}
                                                  isPlaceholder
                                                />
                                              )}
                                            {!isVersionLoading && isEmpty && (
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
                    );
                  })}
                </div>

                <div className="hidden md:block">
                  <table
                    id="timetable-table"
                    className="border-collapse border bg-gray-50 w-full"
                  >
                    <thead>
                      <tr className="bg-gray-100">
                        <th className="border p-3 text-sm md:text-base max-w-[60px]">
                          Day
                        </th>
                        <th className="border p-3 text-sm md:text-base max-w-[80px]">
                          Room
                        </th>
                        {timeSlots.map((time) => (
                          <th
                            key={time}
                            className="border p-3 text-center text-xs md:text-sm whitespace-normal"
                          >
                            {time}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {Days.map((day) => {
                        const rooms =
                          (selectedTeacher ? filteredData : data)[day] || [];
                        return (
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
                                    const cellConflicts = getCellConflicts(
                                      day,
                                      roomName,
                                      timeSlot
                                    );
                                    return (
                                      <DroppableCell
                                        key={cellId}
                                        id={cellId}
                                        isEmpty={isEmpty}
                                        isDraggingOver={!!isDraggingThisSession}
                                        isMobile={isMobile}
                                        conflicts={cellConflicts}
                                        isLoading={
                                          isOperationLoading || isVersionLoading
                                        }
                                        onAddClass={() => {
                                          setAddClassCell({
                                            day,
                                            room: roomName,
                                            time: timeSlot,
                                          });
                                          setIsAddClassDialogOpen(true);
                                        }}
                                        onDeleteClass={() => {
                                          setDeleteClassCell({
                                            day,
                                            room: roomName,
                                            time: timeSlot,
                                          });
                                          setIsDeleteClassDialogOpen(true);
                                        }}
                                      >
                                        {!isVersionLoading &&
                                          !isEmpty &&
                                          !isDraggingThisSession &&
                                          session &&
                                          "Teacher" in session && (
                                            <DraggableSession
                                              id={`${cellId}-${(
                                                session.Subject || "session"
                                              ).replace(/[^a-zA-Z0-9]/g, "_")}`}
                                              session={session as Session}
                                              isDisabled={
                                                isSaving !== "none" || isMobile
                                              }
                                            />
                                          )}
                                        {!isVersionLoading &&
                                          isDraggingThisSession &&
                                          session &&
                                          "Teacher" in session && (
                                            <SessionDetails
                                              session={session as Session}
                                              isPlaceholder
                                            />
                                          )}
                                      </DroppableCell>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
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
                      handleDeleteVersion(versionToDelete);
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
        <AddClassDialog
          isOpen={isAddClassDialogOpen}
          onClose={() => {
            setAddClassCell(null);
            setIsAddClassDialogOpen(false);
          }}
          onSubmit={(classData) => {
            if (addClassCell) {
              handleAddClass(
                addClassCell.day,
                addClassCell.room,
                addClassCell.time,
                classData
              );
            }
          }}
          isAddClassLoading={isAddClassLoading}
        />
        <AlertDialog open={isDeleteClassDialogOpen}>
          <AlertDialogPortal>
            <AlertDialogOverlay
              className="bg-[#042957]"
              style={{ backdropFilter: "blur(2px)" }}
            />
            <AlertDialogContent className="bg-[#042957] text-[#9ea8b5]">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-[#9EA8F5]">
                  Delete Class
                </AlertDialogTitle>
                <AlertDialogDescription className="text-[#9ea8b5] text-sm">
                  Are you sure you want to delete this class? This action cannot
                  be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel
                  onClick={() => {
                    if (!isDeleteClassLoading) {
                      setIsDeleteClassDialogOpen(false);
                    }
                  }}
                  className="bg-red-800 hover:bg-red-900 text-white text-sm"
                  disabled={isDeleteClassLoading}
                >
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (deleteClassCell) {
                      handleDeleteClass(
                        deleteClassCell.day,
                        deleteClassCell.room,
                        deleteClassCell.time
                      );
                    }
                  }}
                  className="bg-blue-900 hover:bg-blue-800 text-white text-sm flex items-center gap-2"
                  disabled={isDeleteClassLoading}
                >
                  Delete
                  {isDeleteClassLoading && (
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
    </main>
  );
}
