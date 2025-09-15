// src/lib/utils.js
import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Day of week helpers
export const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
]

export const GRADES = [
  { value: 1, label: 'Grade 1' },
  { value: 2, label: 'Grade 2' },
  { value: 3, label: 'Grade 3' },
  { value: 4, label: 'Grade 4' },
  { value: 5, label: 'Grade 5' },
  { value: 6, label: 'Grade 6' },
  { value: 7, label: 'Grade 7' },
  { value: 8, label: 'Grade 8' },
  { value: 9, label: 'Grade 9' },
  { value: 10, label: 'Grade 10' },
  { value: 11, label: 'Grade 11' },
  { value: 12, label: 'Grade 12' },
  { value: 13, label: 'Grade 13' }
]

export const CLASS_TYPES = [
  { value: 'Individual', label: 'Individual' },
  { value: 'Group', label: 'Group' },
  { value: 'Extra', label: 'Extra' },
  { value: 'Paper', label: 'Paper' },
  { value: 'Revision', label: 'Revision' },
  { value: 'Theory', label: 'Theory' }
]


export const getDayName = (dayNumber) => {
  return DAYS_OF_WEEK.find(day => day.value === dayNumber)?.label || 'Unknown'
}

// Time formatting
export const formatTime = (timeString) => {
  if (!timeString) return ''
  return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}

// Duration formatting
export const formatDuration = (minutes) => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  if (hours > 0) {
    return `${hours}h ${mins}m`
  }
  return `${mins}m`
}

// Generate payment records for a student-class enrollment
export const generateMonthlyPayments = async (studentId, classId, fee, supabase) => {
  const currentYear = new Date().getFullYear()
  const payments = []
  
  // Generate payments for remaining months of current year
  for (let month = new Date().getMonth() + 1; month <= 12; month++) {
    payments.push({
      student_id: studentId,
      class_id: classId,
      month,
      year: currentYear,
      amount: fee,
      status: 'pending'
    })
  }
  
  return payments
}

// Utility function to get grade labels
export function getGradeLabels(gradeNumbers) {
  return gradeNumbers.map(num => 
    GRADES.find(grade => grade.value === num)?.label || `Grade ${num}`
  )
}

// Utility function to render class schedules
export function renderClassSchedules(schedules) {
  if (!schedules || schedules.length === 0) return 'No schedule set'
  
  return schedules.map((schedule, index) => (
    <span key={schedule.id || index} className="text-sm text-gray-500">
      {/* {index < schedules.length && ' • '} */}
      {getDayName(schedule.day_of_week)}, {formatTime(schedule.start_time)} ({formatDuration(schedule.duration)})
      {/* {index < schedules.length - 1 && ' • '} */}
    </span>
  ))
}

// Assignment helper functions
export const getAssignmentStatusColor = (assignment) => {
  const deadline = new Date(assignment.deadline)
  const today = new Date()
  const daysUntilDeadline = Math.ceil((deadline - today) / (1000 * 60 * 60 * 24))
  
  if (daysUntilDeadline < 0) return 'text-red-600' // Overdue
  if (daysUntilDeadline <= 3) return 'text-yellow-600' // Due soon
  return 'text-green-600' // On time
}

export const calculateAssignmentProgress = (submissions) => {
  const total = submissions.length
  const submitted = submissions.filter(s => s.marks_obtained !== null).length
  const percentage = total > 0 ? Math.round((submitted / total) * 100) : 0
  
  return {
    total,
    submitted,
    pending: total - submitted,
    percentage
  }
}

// Format assignment deadline with relative time
export const formatAssignmentDeadline = (deadline) => {
  const deadlineDate = new Date(deadline)
  const today = new Date()
  const daysUntilDeadline = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24))
  
  const formattedDate = deadlineDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: deadlineDate.getFullYear() !== today.getFullYear() ? 'numeric' : undefined
  })
  
  if (daysUntilDeadline < 0) {
    return `${formattedDate} (${Math.abs(daysUntilDeadline)} day${Math.abs(daysUntilDeadline) !== 1 ? 's' : ''} overdue)`
  } else if (daysUntilDeadline === 0) {
    return `${formattedDate} (Today)`
  } else if (daysUntilDeadline === 1) {
    return `${formattedDate} (Tomorrow)`
  } else if (daysUntilDeadline <= 7) {
    return `${formattedDate} (${daysUntilDeadline} days)`
  }
  
  return formattedDate
}
