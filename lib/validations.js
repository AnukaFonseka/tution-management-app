// src/lib/validations.js
import { z } from "zod"

// Updated class schema with new structure
export const classSchema = z.object({
  name: z.string().min(1, 'Class name is required').max(100, 'Class name too long'),
  grades: z.array(z.number().min(1).max(13)).min(1, 'At least one grade is required'),
  subject_ids: z.array(z.string().uuid()).min(1, 'At least one subject is required'),
  class_type: z.enum(['Individual', 'Group', 'Extra', 'Paper', 'Revision', 'Theory']),
  fee: z.number().min(0, 'Fee must be positive'),
  schedules: z.array(
    z.object({
      day_of_week: z.number().min(0).max(6),
      start_time: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, 'Invalid time format'),
      duration: z.number().min(15, 'Duration must be at least 15 minutes').max(480, 'Duration too long')
    })
  ).min(1, 'At least one schedule is required')
})

export const studentSchema = z.object({
  name: z.string().min(1, "Student name is required").max(100),
  grade: z.string().min(1, "Grade is required").max(20),
  phone: z.string().optional(),
  parent_name: z.string().optional(),
})