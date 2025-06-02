export interface Session {
  Room: string;
  Time: string;
  Teacher: string;
  Subject: string;
  Section?: string;
  Day?: string;
}

export interface EmptySlot {
  Time: string;
}

export interface RoomSchedule {
  [roomName: string]: (Session | EmptySlot)[] | undefined;
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
  Room: string;
  Time: string;
  Teacher: string;
  Subject: string;
  Section?: string;
  Day: string;
}

export interface TeacherRoomObject {
  [roomName: string]: ClassItem[];
}

export type TeacherDaySchedule = TeacherRoomObject[];

export interface TeacherTimetableData {
  [day: string]: TeacherDaySchedule;
}
