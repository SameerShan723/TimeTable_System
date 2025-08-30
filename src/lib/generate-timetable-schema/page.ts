// src/lib/timetableSchema.ts
import { z } from "zod";

export interface Room {
  id: string;
  name: string;
  type: "Regular" | "Lab";
  capacity?: number;
  isNew?: boolean;
}

export interface FormValues {
  selectedCustomRules?: string[];
  customPrompt?: string;
  useCustomPrompt: boolean;
  maxClassesPerTeacherPerDay: number;
  maxClassesPerSectionPerDay: number;
  rooms: Room[];
}

export const timetableSchema = z.object({
  customPrompt: z.string().optional(),
  useCustomPrompt: z.boolean(),
  maxClassesPerTeacherPerDay: z.number().min(1).max(7),
  maxClassesPerSectionPerDay: z.number().min(1).max(7),
  rooms: z.array(z.object({
    id: z.string(),
    name: z.string().min(1, "Room name is required"),
    type: z.enum(["Regular", "Lab"]),
    capacity: z.number().optional(),
    isNew: z.boolean().optional(),
  })),
});
