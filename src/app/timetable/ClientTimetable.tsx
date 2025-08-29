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
import { toast, ToastContainer, Bounce } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { Session, EmptySlot, RoomSchedule, TimetableData } from "./types";
import { timeSlots, Days } from "@/helpers/page";
import { useTimetableVersion } from "@/context/TimetableContext";
import { useAuth } from "@/context/AuthContext";
import debounce from "just-debounce-it";
import { DraggableSession } from "./DragAndDrop";
import AddClassDialog from "./AddClassDialog";
import Navbar from "./Navbar";
import TimetableDisplay from "./TimetableDisplay";
import DeleteClassDialog from "./DeleteClassDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import jsPDF from "jspdf";
import autoTable, { CellInput, RowInput, Styles } from "jspdf-autotable";
import * as XLSX from "xlsx";
import { restrictToWindowEdges } from "@dnd-kit/modifiers";

export default function ClientTimetable() {
  const {
    versions = [],
    selectedVersion,
    timetableData,
    conflicts,
    loading: isVersionLoading,
    error: hookError,
    setSelectedVersion,
    saveTimetableData,
    deleteVersion: contextDeleteVersion,
    checkConflicts,
    setTimetableData: contextSetTimetableData,
  } = useTimetableVersion();
  const { isSuperadmin, openAuthModal, } =
    useAuth();

  const [versionPendingData, setVersionPendingData] = useState<{
    [version: number]: TimetableData | null;
  }>({});
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
  const [selectedTeachers, setSelectedTeachers] = useState<string[] | null>(
    null
  );
  const [selectedSubjects, setSelectedSubjects] = useState<string[] | null>(
    null
  );
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
  const timetableRef = useRef<HTMLDivElement | null>(null);
  const exportDropdownRef = useRef<HTMLDivElement | null>(null);
  const versionId = useId();
  const [isOperationLoading, setIsOperationLoading] = useState(false);

  const debouncedCheckConflicts = useMemo(
    () => debounce(checkConflicts, 300),
    [checkConflicts]
  );

  const data =
    selectedVersion !== null && versionPendingData[selectedVersion]
      ? versionPendingData[selectedVersion]!
      : timetableData;

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (selectedVersion !== null && versionPendingData[selectedVersion]) {
        event.preventDefault();
        event.returnValue =
          "You have unsaved changes. Are you sure you want to leave?";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [selectedVersion, versionPendingData]);

  const filteredData = useMemo(() => {
    if ((!selectedTeachers || selectedTeachers.length === 0) && 
        (!selectedSubjects || selectedSubjects.length === 0)) return data;
    
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
          if (!roomName) return null;
          const sessions = roomSchedule[roomName] || [];
          const filteredSessions = sessions.filter(
            (session: Session | EmptySlot): session is Session => {
              if (!("Teacher" in session)) return false;
              
              const teacherMatch = !selectedTeachers || selectedTeachers.length === 0 || 
                (typeof session.Teacher === "string" && selectedTeachers.includes(session.Teacher));
              
              const subjectMatch = !selectedSubjects || selectedSubjects.length === 0 || 
                (typeof session.Subject === "string" && selectedSubjects.includes(session.Subject));
              
              return teacherMatch && subjectMatch;
            }
          );
          return { [roomName]: filteredSessions } as RoomSchedule;
        })
        .filter(
          (roomSchedule): roomSchedule is RoomSchedule =>
            !!roomSchedule && Object.values(roomSchedule)[0].length > 0
        );
      if (filteredRooms.length > 0) filtered[day] = filteredRooms;
    });
    return filtered;
  }, [data, selectedTeachers, selectedSubjects]);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
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
      if (isVersionLoading) timetableRef.current.scrollTop = 0;
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
    return Array.from(
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
  }, [data]);

  const parseCellId = useCallback(
    (id: string): { day: string; room: string; time: string } => {
      const regex = /^([^-]+)-(.+)-(\d{1,2}:\d{2}-\d{1,2}:\d{2})(?:-(.+))?$/;
      const match = id.match(regex);
      if (!match) return { day: "", room: "", time: "" };
      const [, day, room, time] = match;
      return { day, room, time };
    },
    []
  );

  const getCellConflicts = useCallback(
    (day: string, room: string, time: string): string[] => {
      const roomData = (
        (selectedTeachers && selectedTeachers.length > 0) || (selectedSubjects && selectedSubjects.length > 0) ? filteredData : data
      )[day]?.find((r: RoomSchedule) => Object.keys(r)[0] === room);
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
    [data, filteredData, conflicts, selectedTeachers, selectedSubjects]
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent): void => {
      if (!isSuperadmin) {
        openAuthModal();
        return;
      }
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
    [data, parseCellId, isMobile, isSuperadmin, openAuthModal]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent): void => {
      if (!isSuperadmin) {
        openAuthModal();
        return;
      }
      if (isMobile || selectedVersion === null) return;
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
      setVersionPendingData((prev) => ({
        ...prev,
        [selectedVersion]: updatedData,
      }));
      debouncedCheckConflicts(updatedData);
    },
    [
      data,
      parseCellId,
      isMobile,
      debouncedCheckConflicts,
      selectedVersion,
      isSuperadmin,
      openAuthModal,
    ]
  );

  const handleAddClass = useCallback(
    async (
      day: string,
      room: string,
      time: string,
      classData: { subject: string; teacher: string; section: string }
    ) => {
      if (!isSuperadmin) {
        openAuthModal();
        return;
      }
      if (selectedVersion === null) return;
      setIsAddClassLoading(true);

      try {
        const response = await fetch(`/api/timetable?operation=add_class&version=${selectedVersion}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day, room, time, classData }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to add class");
        }

        const result = await response.json();
        
        // Update local state directly with the response data
        contextSetTimetableData(result.data);
        setVersionPendingData((prev) => ({
          ...prev,
          [selectedVersion]: null,
        }));

        toast.success("Class added successfully!");
        setIsAddClassDialogOpen(false);
        setAddClassCell(null);
        
        // Check conflicts with updated data
        debouncedCheckConflicts(result.data);
      } catch (error) {
        toast.error(
          `Failed to add class: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error;
      } finally {
        setIsAddClassLoading(false);
        setIsOperationLoading(false);
      }
    },
    [
      selectedVersion,
      debouncedCheckConflicts,
      isSuperadmin,
      openAuthModal,
      contextSetTimetableData,
    ]
  );

  const handleDeleteClass = useCallback(
    async (day: string, room: string, time: string) => {
      if (!isSuperadmin) {
        openAuthModal();
        return;
      }
      if (selectedVersion === null) return;
      setIsDeleteClassLoading(true);

      try {
        const response = await fetch(`/api/timetable?operation=delete_class&version=${selectedVersion}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ day, room, time }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to delete class");
        }

        const result = await response.json();
        
        // Update local state directly with the response data
        contextSetTimetableData(result.data);
        setVersionPendingData((prev) => ({
          ...prev,
          [selectedVersion]: null,
        }));

        toast.success("Class deleted successfully!");
        setIsDeleteClassDialogOpen(false);
        setDeleteClassCell(null);
        
        // Check conflicts with updated data
        debouncedCheckConflicts(result.data);
      } catch (error) {
        toast.error(
          `Failed to delete class: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
        throw error;
      } finally {
        setIsDeleteClassLoading(false);
        setIsOperationLoading(false);
      }
    },
    [
      selectedVersion,
      debouncedCheckConflicts,
      isSuperadmin,
      openAuthModal,
      contextSetTimetableData,
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
      if (selectedTeachers && selectedTeachers.length > 0) {
        doc.text(`Teachers: ${selectedTeachers.join(", ")}`, 105, 40, {
          align: "center",
        });
      }
      if (selectedSubjects && selectedSubjects.length > 0) {
        doc.text(`Subjects: ${selectedSubjects.join(", ")}`, 105, 45, {
          align: "center",
        });
      }
      doc.addPage();

      for (const day of days) {
        const dayData =
          (selectedTeachers && selectedTeachers.length > 0
            ? filteredData
            : data)[day] || [];
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
      }${
        selectedTeachers && selectedTeachers.length > 0
          ? `-teachers-${selectedTeachers.join("_")}`
          : ""
      }${
        selectedSubjects && selectedSubjects.length > 0
          ? `-subjects-${selectedSubjects.join("_")}`
          : ""
      }.pdf`;
      doc.save(fileName);

      toast.success("PDF Exported Successfully");
    } catch (error) {
      console.error("PDF Export Error:", error);
      toast.error(
        `PDF Export Failed ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [selectedVersion, selectedTeachers, selectedSubjects, filteredData, data]);

  const exportToXLSX = useCallback(() => {
    try {
      const sheetData: (string | undefined)[][] = [
        ["Day", "Room", ...timeSlots],
      ];

      Days.forEach((day) => {
        const dayData =
          (selectedTeachers && selectedTeachers.length > 0
            ? filteredData
            : data)[day] || [];

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
                : ""
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
      }${
        selectedTeachers && selectedTeachers.length > 0
          ? `-teachers-${selectedTeachers.join("_")}`
          : ""
      }${
        selectedSubjects && selectedSubjects.length > 0
          ? `-subjects-${selectedSubjects.join("_")}`
          : ""
      }.xlsx`;
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
      toast.error(
        `Excel Export Failed ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [selectedVersion, selectedTeachers, selectedSubjects, filteredData, data, allRooms]);

  const handleSaveAction = useCallback(
    async (
      action: "cancel" | "same" | "new",
      e?: React.MouseEvent<HTMLButtonElement>
    ): Promise<void> => {
      if (e) e.preventDefault();
      if (!isSuperadmin) {
        openAuthModal();
        return;
      }
      if (selectedVersion === null) return;

      if (action === "cancel") {
        setVersionPendingData((prev) => ({
          ...prev,
          [selectedVersion]: null,
        }));
        toast.success("Changes discarded");
        return;
      }

      const pendingData = versionPendingData[selectedVersion];
      if (!pendingData) return;

      try {
        setIsSaving(action);

        let newVersion: number;
        if (action === "same") {
          newVersion = await saveTimetableData(pendingData, selectedVersion);
        } else if (action === "new") {
          newVersion = await saveTimetableData(pendingData);
        } else {
          throw new Error("Invalid save action");
        }

        setVersionPendingData((prev) => ({
          ...prev,
          [selectedVersion]: null,
          [newVersion]: null,
        }));
        toast.success(`Changes saved successfully as Version ${newVersion}`);
      } catch (error) {
        toast.error(
          `Save failed ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsSaving("none");
      }
    },
    [
      versionPendingData,
      saveTimetableData,
      selectedVersion,
      isSuperadmin,
      openAuthModal,
    ]
  );

  const handleDeleteVersion = useCallback(
    async (version: number): Promise<void> => {
      if (!isSuperadmin) {
        openAuthModal();
        return;
      }
      setIsDeleting(true);
      try {
        await contextDeleteVersion(version);
        setVersionPendingData((prev) => {
          const newPendingData = { ...prev };
          delete newPendingData[version];
          return newPendingData;
        });
        toast.success(`Version ${version} deleted successfully`);
      } catch (error) {
        toast.error(
          `Deletion failed ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        setIsDeleting(false);
        setIsDeleteDialogOpen(false);
      }
    },
    [contextDeleteVersion, isSuperadmin, openAuthModal]
  );

  const toggleRoom = (day: string, room: string) => {
    setExpandedRooms((prev) => ({
      ...prev,
      [`${day}-${room}`]: !prev[`${day}-${room}`],
    }));
  };

  if (hookError) {
    const handleTryAgain = () => {
      window.location.reload();
    };
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-xl text-red-500">
          {hookError}
          <span>
            <button onClick={() => handleTryAgain()}>Try Again</button>
          </span>
        </div>
      </div>
    );
  }

  if (versions.length === 0) {
    const handleTryAgain = () => {
      
      window.location.reload();
    };
    return (
      <div className="flex justify-center items-center h-full">
        <div className="text-xl text-gray-500 mt-3">
          Something went wrong{" "}
          <span>
            <button onClick={() => handleTryAgain()} className="border-2 p-1">
              Try Again
            </button>
          </span>
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
          <Navbar
            versionId={versionId}
            versions={versions}
            selectedVersion={selectedVersion}
            setSelectedVersion={setSelectedVersion}
            isSaving={isSaving}
            isDeleting={isDeleting}
            setVersionToDelete={setVersionToDelete}
            setIsDeleteDialogOpen={setIsDeleteDialogOpen}
            isVersionLoading={isVersionLoading}
            setShowExportDropdown={setShowExportDropdown}
            showExportDropdown={showExportDropdown}
            exportDropdownRef={exportDropdownRef}
            exportToPDF={exportToPDF}
            exportToXLSX={exportToXLSX}
            setSelectedTeacher={setSelectedTeachers}
            setSelectedSubject={setSelectedSubjects}
            versionPendingData={versionPendingData}
            handleSaveAction={handleSaveAction}
          />

          <TimetableDisplay
            data={data}
            filteredData={filteredData}
            selectedTeachers={selectedTeachers}
            selectedSubjects={selectedSubjects}
            isVersionLoading={isVersionLoading}
            isOperationLoading={isOperationLoading}
            isMobile={isMobile}
            allRooms={allRooms}
            expandedRooms={expandedRooms}
            toggleRoom={toggleRoom}
            activeSession={activeSession}
            getCellConflicts={getCellConflicts}
            setAddClassCell={setAddClassCell}
            setIsAddClassDialogOpen={setIsAddClassDialogOpen}
            setDeleteClassCell={setDeleteClassCell}
            setIsDeleteClassDialogOpen={setIsDeleteClassDialogOpen}
            timetableRef={timetableRef}
            isSaving={isSaving}
          />

          <DragOverlay style={{ zIndex: 60, pointerEvents: "none" }}>
            {!isMobile && activeSession && isSuperadmin ? (
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
              <AlertDialogOverlay className="bg-black bg-opacity-50" />
              <AlertDialogContent className="bg-white text-gray-800 border border-gray-200 shadow-lg rounded-2xl max-w-3xl mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-2xl font-bold text-blue-900">
                    Delete Version
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-600 text-sm">
                    Are you sure you want to delete Version {versionToDelete}? This action cannot be
                    undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                                     <AlertDialogCancel
                     onClick={() => setIsDeleteDialogOpen(false)}
                     className="px-4 py-2 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none"
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
                     className="px-4 py-2 bg-[#042954] hover:brightness-110 text-white rounded-lg transition-all duration-200 hover:scale-105 text-sm font-medium uppercase border-none flex items-center gap-2"
                     disabled={isDeleting}
                   >
                    Delete
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

          <DeleteClassDialog
            isOpen={isDeleteClassDialogOpen}
            isLoading={isDeleteClassLoading}
            onClose={() => setIsDeleteClassDialogOpen(false)}
            onConfirm={() => {
              if (deleteClassCell) {
                handleDeleteClass(
                  deleteClassCell.day,
                  deleteClassCell.room,
                  deleteClassCell.time
                );
              }
            }}
          />

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

        </div>
      </DndContext>
      
      {/* Toast Container for this page only */}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick={false}
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="colored"
        transition={Bounce}
      />
    </main>
  );
}
