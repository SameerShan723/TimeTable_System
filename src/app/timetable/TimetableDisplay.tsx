"use client";

import React from "react";
import { IoIosArrowDown, IoIosArrowUp } from "react-icons/io";
import { Session, EmptySlot, RoomSchedule, TimetableData } from "./types";
import { timeSlots, Days } from "@/helpers/page";
import {
  DraggableSession,
  DroppableCell,
  DroppableDiv,
  SessionDetails,
} from "./DragAndDrop";
import { useAuth } from "@/context/AuthContext";

interface TimetableDisplayProps {
  data: TimetableData;
  filteredData: TimetableData;
  selectedTeachers: string[] | null;
  isVersionLoading: boolean;
  isOperationLoading: boolean;
  isMobile: boolean;
  allRooms: string[];
  expandedRooms: { [key: string]: boolean };
  toggleRoom: (day: string, room: string) => void;
  activeSession: Session | null;
  getCellConflicts: (day: string, room: string, time: string) => string[];
  setAddClassCell: (
    cell: { day: string; room: string; time: string } | null
  ) => void;
  setIsAddClassDialogOpen: (open: boolean) => void;
  setDeleteClassCell: (
    cell: { day: string; room: string; time: string } | null
  ) => void;
  setIsDeleteClassDialogOpen: (open: boolean) => void;
  timetableRef: React.RefObject<HTMLDivElement | null>;
  isSaving: "none" | "same" | "new";
}

const TimetableDisplay: React.FC<TimetableDisplayProps> = ({
  data,
  filteredData,
  selectedTeachers,
  isVersionLoading,
  isOperationLoading,
  isMobile,
  allRooms,
  expandedRooms,
  toggleRoom,
  activeSession,
  getCellConflicts,
  setAddClassCell,
  setIsAddClassDialogOpen,
  setDeleteClassCell,
  setIsDeleteClassDialogOpen,
  timetableRef,
  isSaving,
}) => {
  const { isSuperadmin, openAuthModal } = useAuth();

  return (
    <div className="flex-1 w-full max-w-full">
      {Object.keys(
        selectedTeachers && selectedTeachers.length > 0 ? filteredData : data
      ).length === 0 ? (
        <div className="flex justify-center items-center h-full flex-1">
          <div className="text-xl text-gray-500">
            No timetable data available
          </div>
        </div>
      ) : (
        <div
          ref={timetableRef}
          id="timetable-container"
          className="relative w-full max-w-full overflow-x-auto"
        >
          {/* Mobile View */}
          <div className="block md:hidden space-y-2 p-2">
            {Days.map((day) => {
              const rooms =
                (selectedTeachers && selectedTeachers.length > 0
                  ? filteredData
                  : data)[day] || [];
              return (
                <div key={day} className="mb-2">
                  <h2 className="text-lg font-semibold text-black mb-2">
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
                        className="border rounded-lg shadow-sm bg-white mb-2 box-border"
                      >
                        <div
                          className="flex justify-between items-center p-3 cursor-pointer bg-gray-100"
                          onClick={() => toggleRoom(day, roomName)}
                        >
                          <h3 className="text-sm font-medium">{roomName}</h3>
                          {isExpanded ? (
                            <IoIosArrowUp size={16} />
                          ) : (
                            <IoIosArrowDown size={16} />
                          )}
                        </div>
                        {isExpanded && (
                          <div className="p-3 space-y-1">
                            {timeSlots.map((timeSlot) => {
                              const session = sessions.find(
                                (s: Session | EmptySlot) => s.Time === timeSlot
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
                              const cellConflicts = getCellConflicts(
                                day,
                                roomName,
                                timeSlot
                              );

                              return (
                                <div
                                  key={cellId}
                                  className="flex items-center border-b py-1 box-border"
                                >
                                  <div className="w-1/3 text-sm font-medium">
                                    {timeSlot}
                                  </div>
                                  <div className="w-2/3">
                                    <DroppableDiv
                                      id={cellId}
                                      isEmpty={isEmpty}
                                      isDraggingOver={!!isDraggingThisSession}
                                      isMobile={isMobile}
                                      conflicts={cellConflicts}
                                      isLoading={
                                        isOperationLoading || isVersionLoading
                                      }
                                      onAddClass={() => {
                                        if (!isSuperadmin) {
                                          openAuthModal();
                                          return;
                                        }
                                        setAddClassCell({
                                          day,
                                          room: roomName,
                                          time: timeSlot,
                                        });
                                        setIsAddClassDialogOpen(true);
                                      }}
                                      onDeleteClass={() => {
                                        if (!isSuperadmin) {
                                          openAuthModal();
                                          return;
                                        }
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
                                              isSaving !== "none" ||
                                              isMobile ||
                                              !isSuperadmin
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
                                        <div className="text-center text-gray-600 text-sm h-full flex items-center justify-center">
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

          {/* Desktop View (Unchanged) */}
          <div className="hidden md:block max-h-[calc(100vh-137px)] overflow-y-auto overflow-x-auto w-full">
            <table
              id="timetable-table"
              className="border-collapse bg-gray-50 w-full"
            >
              <thead className="sticky top-0 z-10">
                <tr>
                  <th className="border p-2 text-sm md:text-base bg-gray-200 w-[60px]">
                    Day
                  </th>
                  <th className="border p-2 text-sm md:text-base bg-gray-200 w-[80px]">
                    Room
                  </th>
                  {timeSlots.map((time) => (
                    <th
                      key={time}
                      className="border p-2 text-center text-xs md:text-sm bg-gray-200 min-w-[100px]"
                    >
                      {time}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Days.map((day) => {
                  const rooms =
                    (selectedTeachers && selectedTeachers.length > 0
                      ? filteredData
                      : data)[day] || [];
                  return (
                    <React.Fragment key={day}>
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
                        const isLastRow = roomIndex === roomArray.length - 1;

                        return (
                          <tr
                            key={`${day}-${roomName}`}
                            className={isLastRow ? "border-b-2" : "border-b"}
                          >
                            {roomIndex === 0 && (
                              <td
                                rowSpan={allRooms.length}
                                className="border align-middle bg-gray-50 p-2 w-[60px] text-sm md:text-base"
                              >
                                <div className="-rotate-90 font-medium whitespace-nowrap">
                                  {day}
                                </div>
                              </td>
                            )}
                            <td className="border p-2 text-black text-sm md:text-base w-[80px] bg-gray-50">
                              {roomName}
                            </td>
                            {timeSlots.map((timeSlot) => {
                              const session = sessions.find(
                                (s: Session | EmptySlot) => s.Time === timeSlot
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
                                    if (!isSuperadmin) {
                                      openAuthModal();
                                      return;
                                    }
                                    setAddClassCell({
                                      day,
                                      room: roomName,
                                      time: timeSlot,
                                    });
                                    setIsAddClassDialogOpen(true);
                                  }}
                                  onDeleteClass={() => {
                                    if (!isSuperadmin) {
                                      openAuthModal();
                                      return;
                                    }
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
                                          isSaving !== "none" ||
                                          isMobile ||
                                          !isSuperadmin
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
                                    <div className="text-center text-gray-600 text-sm h-full flex items-center justify-center">
                                    </div>
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
  );
};

export default TimetableDisplay;