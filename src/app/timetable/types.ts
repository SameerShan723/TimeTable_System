export interface Session {
  Room: string;
  Time: string;
  Teacher: string;
  Subject: string;
  Section?: string;
  Day?: string;
  Type?: "Theory" | "Lab";
}

export interface EmptySlot {
  Time: string;
}

export interface RoomSchedule {
  [roomName: string]: (Session | EmptySlot)[];
}

export type DaySchedule = RoomSchedule[];

export interface TimetableData {
  [day: string]: DaySchedule;
}

export interface VersionOption {
  value: number;
  label: string;
}

// Teacher/Student-specific types
export interface ClassItem {
  Subject: string;
  Teacher: string;
  Section?: string;
  Time: string;
  Room?: string;
  Day?: string;
  [key: string]: string | undefined;
}

export interface TeacherRoomObject {
  [roomName: string]: ClassItem[];
}

export type TeacherDaySchedule = TeacherRoomObject[];

export interface TeacherTimetableData {
  [day: string]: TeacherDaySchedule;
}
export interface TimetableData {
  Monday: RoomSchedule[];
  Tuesday: RoomSchedule[];
  Wednesday: RoomSchedule[];
  Thursday: RoomSchedule[];
  Friday: RoomSchedule[];
}
