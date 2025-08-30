// src/lib/timetableSchema.ts
import { z } from "zod";

export interface Room {
  id: string;
  name: string;
  type: "Regular" | "Lab";
  capacity?: number;
  isNew?: boolean;
}

export type Weekday = "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday";

export interface TeacherAvailabilityForm {
  teacher: string;
  days: Weekday[];
  earliestTime?: string;
  latestTime?: string;
  timeSlots?: string[];
}

export interface FormValues {
  selectedCustomRules?: string[];
  customPrompt?: string;
  useCustomPrompt: boolean;
  maxClassesPerTeacherPerDay: number;
  maxClassesPerSectionPerDay: number;
  engine?: "algorithmic" | "llm" | "hybrid";
  rooms: Room[];
  visitingEarliestTime?: string;
  teacherAvailabilities?: TeacherAvailabilityForm[];
}

export const timetableSchema = z.object({
  customPrompt: z.string().optional(),
  useCustomPrompt: z.boolean(),
  maxClassesPerTeacherPerDay: z.number().min(1).max(7),
  maxClassesPerSectionPerDay: z.number().min(1).max(7),
  engine: z.enum(["algorithmic", "llm", "hybrid"]).optional(),
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Room name is required"),
    type: z.enum(["Regular", "Lab"]),
    capacity: z.number().optional(),
    isNew: z.boolean().optional(),
  })),
  visitingEarliestTime: z.string().optional(),
  teacherAvailabilities: z.array(z.object({
    teacher: z.string().min(1),
    days: z.array(z.enum(["Monday","Tuesday","Wednesday","Thursday","Friday"])) ,
    earliestTime: z.string().optional(),
    latestTime: z.string().optional(),
    timeSlots: z.array(z.string()).optional(),
  })).optional(),
});
