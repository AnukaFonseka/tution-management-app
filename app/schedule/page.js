// src/app/schedule/page.js
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Calendar, Clock, Users, BookOpen } from 'lucide-react'
import { DAYS_OF_WEEK, formatTime, formatDuration } from '@/lib/utils'

export default function SchedulePage() {
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchSchedule()
  }, [])

  const fetchSchedule = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select(`
          *,
          student_classes(
            students(name)
          )
        `)
        .order('day_of_week')
        .order('start_time')

      if (error) throw error
      setClasses(data || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const groupClassesByDay = () => {
    const grouped = {}
    DAYS_OF_WEEK.forEach(day => {
      grouped[day.value] = classes.filter(cls => cls.day_of_week === day.value)
    })
    return grouped
  }

  const getStudentCount = (classItem) => {
    return classItem.student_classes?.length || 0
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const classesGroupedByDay = groupClassesByDay()

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Class Schedule</h1>
        <p className="text-gray-600">Weekly schedule overview of all classes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {classes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No classes scheduled</h3>
            <p className="text-gray-600">Create some classes to see them in the schedule</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-7 gap-4">
          {DAYS_OF_WEEK.map((day) => (
            <Card key={day.value} className="h-fit">
              <CardHeader className="pb-3">
                <CardTitle className="text-center text-lg">
                  {day.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {classesGroupedByDay[day.value].length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-4">
                    No classes
                  </p>
                ) : (
                  classesGroupedByDay[day.value].map((classItem) => (
                    <div
                      key={classItem.id}
                      className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                    >
                      <div className="space-y-2">
                        <div>
                          <h4 className="font-medium text-blue-900">
                            {classItem.name}
                          </h4>
                          <p className="text-xs text-blue-700">
                            Grade {classItem.grade}
                          </p>
                        </div>
                        
                        <div className="flex items-center text-xs text-blue-600">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatTime(classItem.start_time)}
                        </div>
                        
                        <div className="flex items-center text-xs text-blue-600">
                          <BookOpen className="w-3 h-3 mr-1" />
                          {formatDuration(classItem.duration)}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-xs text-blue-600">
                            <Users className="w-3 h-3 mr-1" />
                            {getStudentCount(classItem)} students
                          </div>
                          <Badge variant="outline" className="text-xs">
                            Rs. {classItem.fee}
                          </Badge>
                        </div>
                        
                        {/* Student names if any */}
                        {classItem.student_classes && classItem.student_classes.length > 0 && (
                          <div className="border-t border-blue-200 pt-2 mt-2">
                            <p className="text-xs text-blue-600 mb-1">Students:</p>
                            <div className="space-y-1">
                              {classItem.student_classes.slice(0, 3).map((enrollment, index) => (
                                <p key={index} className="text-xs text-blue-700">
                                  {enrollment.students?.name}
                                </p>
                              ))}
                              {classItem.student_classes.length > 3 && (
                                <p className="text-xs text-blue-600 italic">
                                  +{classItem.student_classes.length - 3} more
                                </p>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary Stats */}
      {classes.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-2xl font-bold text-blue-600">
                  {classes.length}
                </h3>
                <p className="text-sm text-blue-600">Total Classes</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-2xl font-bold text-green-600">
                  {classes.reduce((total, cls) => total + getStudentCount(cls), 0)}
                </h3>
                <p className="text-sm text-green-600">Total Enrollments</p>
              </div>
              
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-2xl font-bold text-purple-600">
                  {classes.reduce((total, cls) => total + cls.duration, 0)} min
                </h3>
                <p className="text-sm text-purple-600">Weekly Teaching Time</p>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-2xl font-bold text-yellow-600">
                  Rs. {classes.reduce((total, cls) => total + (cls.fee * getStudentCount(cls)), 0)}
                </h3>
                <p className="text-sm text-yellow-600">Potential Monthly Revenue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}