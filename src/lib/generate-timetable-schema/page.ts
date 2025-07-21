// src/lib/timetableSchema.ts
import { z } from "zod";

export interface FormValues {
  preferMorningClass: boolean;
  teacherData: [Record<string, string>, ...Record<string, string>[]];
  rulesData: [Record<string, string>, ...Record<string, string>[]];
}

export const timetableSchema = z.object({
  teacherData: z
    .array(z.record(z.string()))
    .min(1, "Teacher data is required")
    .nonempty("Teacher data is required"),
  rulesData: z
    .array(z.record(z.string()))
    .min(1, "Rules data is required")
    .nonempty("Rules data is required"),
  preferMorningClass: z.boolean(),
});
