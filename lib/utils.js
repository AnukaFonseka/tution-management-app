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
