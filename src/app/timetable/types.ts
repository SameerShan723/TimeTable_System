export interface Session {
  Room: string;
  Time: string;
  "Faculty Assigned": string;
  "Course Details": string;
  "Subject Type"?: string;
  Domain?: string;
  "Pre-Req"?: string;
  Section?: string;
  "Semester Details"?: string;
  "Subject Code"?: string;
  Sem?: string;
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
  "Faculty Assigned": string;
  Time: string;
  Section: string;
  "Course Details": string;
  Day: string;
  Domain: string;
  "Pre-Req": string;
  Room: string;
  Sem: string;
  "Subject Code": string;
  "Subject Type": string;
}

export interface TeacherRoomObject {
  [roomName: string]: ClassItem[];
}

export type TeacherDaySchedule = TeacherRoomObject[];

export interface TeacherTimetableData {
  [day: string]: TeacherDaySchedule;
}
