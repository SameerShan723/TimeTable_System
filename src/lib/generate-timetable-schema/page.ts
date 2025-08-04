// src/lib/timetableSchema.ts
import { z } from "zod";

export interface FormValues {
  preferMorningClass: boolean;
  selectedCustomRules?: string[];
}

export const timetableSchema = z.object({
  preferMorningClass: z.boolean(),
});
