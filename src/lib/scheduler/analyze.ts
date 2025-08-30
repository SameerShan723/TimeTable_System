/* eslint-disable @typescript-eslint/no-explicit-any */
import type { TimetableData, RoomSchedule, Session, EmptySlot } from "@/app/timetable/types";
import { Days, timeSlots } from "@/helpers/page";

export interface ConflictItem {
  day: keyof TimetableData | string;
  time: string;
  room?: string;
  message: string;
}

export interface TimetableStats {
  totalSlots: number; // days * rooms * timeSlots
  scheduled: number; // sessions with Teacher
  free: number; // empty slots
  roomsPerDay: Record<string, number>;
}

export function computeConflicts(data: TimetableData): ConflictItem[] {
  const conflicts: ConflictItem[] = [];
  for (const day of Days) {
    const dayData = (data as any)[day] as RoomSchedule[] | undefined;
    if (!Array.isArray(dayData)) continue;

    // teacher and subject-section at same time across rooms
    for (const time of timeSlots) {
      const teacherToRooms: Record<string, string[]> = {};
      const subjSecToRooms: Record<string, string[]> = {};

      for (const roomSchedule of dayData) {
        const roomName = Object.keys(roomSchedule)[0];
        const sessions = roomSchedule[roomName] || [];
        const session = sessions.find((s) => s.Time === time) as Session | EmptySlot | undefined;
        if (session && (session as Session).Teacher) {
          const s = session as Session;
          const teacherKey = s.Teacher || "No Faculty";
          const subjKey = `${s.Subject || "Unknown"}__${s.Section || ""}`;
          teacherToRooms[teacherKey] = teacherToRooms[teacherKey] || [];
          teacherToRooms[teacherKey].push(roomName);
          subjSecToRooms[subjKey] = subjSecToRooms[subjKey] || [];
          subjSecToRooms[subjKey].push(roomName);
        }
      }

      for (const [teacher, rooms] of Object.entries(teacherToRooms)) {
        if (rooms.length > 1) {
          conflicts.push({
            day,
            time,
            message: `Teacher ${teacher} appears in multiple rooms at ${time} (${rooms.join(", ")})`,
          });
        }
      }
      for (const [key, rooms] of Object.entries(subjSecToRooms)) {
        if (rooms.length > 1) {
          const [subject, section] = key.split("__");
          conflicts.push({
            day,
            time,
            message: `Subject ${subject} (${section || "No Section"}) appears in multiple rooms at ${time} (${rooms.join(", ")})`,
          });
        }
      }
    }
  }
  return conflicts;
}

export function computeStats(data: TimetableData): TimetableStats {
  let totalSlots = 0;
  let scheduled = 0;
  const roomsPerDay: Record<string, number> = {};

  for (const day of Days) {
    const dayData = (data as any)[day] as RoomSchedule[] | undefined;
    if (!Array.isArray(dayData)) continue;
    roomsPerDay[day] = dayData.length;
    for (const roomSchedule of dayData) {
      const roomName = Object.keys(roomSchedule)[0];
      const sessions = roomSchedule[roomName] || [];
      for (const session of sessions) {
        totalSlots += 1;
        if ((session as Session).Teacher) scheduled += 1;
      }
    }
  }

  return {
    totalSlots,
    scheduled,
    free: Math.max(totalSlots - scheduled, 0),
    roomsPerDay,
  };
}


