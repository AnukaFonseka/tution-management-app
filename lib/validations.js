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
  phone: z.string().optional(),
  parent_name: z.string().optional(),
})

// Schema for student-class enrollment with custom fee
export const studentClassSchema = z.object({
  student_id: z.string().uuid('Invalid student ID'),
  class_id: z.string().uuid('Invalid class ID'),
  custom_fee: z.number().min(0, 'Custom fee must be positive').optional().nullable(),
})

// Assignment schema
export const assignmentSchema = z.object({
  name: z.string().min(1, 'Assignment name is required').max(200, 'Assignment name too long'),
  assignment_type: z.enum(['Paper', 'Homework', 'Assignment'], {
    required_error: 'Please select an assignment type'
  }),
  given_date: z.string().min(1, 'Given date is required'),
  deadline: z.string().min(1, 'Deadline is required'),
  document_url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
  description: z.string().optional(),
  total_marks: z.number().min(1, 'Total marks must be at least 1').max(1000, 'Total marks too high').default(100)
}).refine((data) => {
  const givenDate = new Date(data.given_date)
  const deadline = new Date(data.deadline)
  return deadline >= givenDate
}, {
  message: 'Deadline must be on or after the given date',
  path: ['deadline']
})

// Assignment submission/marking schema
export const assignmentSubmissionSchema = z.object({
  marks_obtained: z.number().min(0, 'Marks cannot be negative').optional().nullable(),
  remarks: z.string().optional(),
  submitted_at: z.string().optional().nullable()
})