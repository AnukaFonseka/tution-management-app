// src/lib/validations.js
import { z } from "zod"

export const classSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100),
  grade: z.string().min(1, "Grade is required").max(20),
  day_of_week: z.number().min(0).max(6),
  start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
  duration: z.number().min(15, "Duration must be at least 15 minutes").max(480),
  fee: z.number().min(0, "Fee must be positive"),
})

export const studentSchema = z.object({
  name: z.string().min(1, "Student name is required").max(100),
  grade: z.string().min(1, "Grade is required").max(20),
  phone: z.string().optional(),
  parent_name: z.string().optional(),
})