// src/app/classes/[id]/page.js
'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Edit, Trash2, Users, Calendar, Clock, DollarSign, ArrowLeft } from 'lucide-react'
import { getDayName, formatTime, formatDuration } from '@/lib/utils'

export default function ClassDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const [classData, setClassData] = useState(null)
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (params.id) {
      fetchClassDetails()
    }
  }, [params.id])

  const fetchClassDetails = async () => {
    try {
      // Get class details
      const { data: classInfo, error: classError } = await supabase
        .from('classes')
        .select('*')
        .eq('id', params.id)
        .single()

      if (classError) throw classError

      // Get enrolled students
      const { data: enrolledStudents, error: studentsError } = await supabase
        .from('student_classes')
        .select(`
          students(*)
        `)
        .eq('class_id', params.id)

      if (studentsError) throw studentsError

      setClassData(classInfo)
      setStudents(enrolledStudents.map(item => item.students))
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteClass = async () => {
    if (!confirm('Are you sure you want to delete this class? This will also remove all student enrollments and payment records.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('classes')
        .delete()
        .eq('id', params.id)

      if (error) throw error
      
      router.push('/classes')
    } catch (err) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Class Not Found</h1>
          <Link href="/classes">
            <Button>Back to Classes</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/classes">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classData.name}</h1>
            <p className="text-gray-600">Grade {classData.grade}</p>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <Link href={`/classes/${classData.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={deleteClass}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Class Information */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Class Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center">
                <Calendar className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium">Schedule</p>
                  <p className="text-sm text-gray-600">{getDayName(classData.day_of_week)}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Clock className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium">Time</p>
                  <p className="text-sm text-gray-600">
                    {formatTime(classData.start_time)} ({formatDuration(classData.duration)})
                  </p>
                </div>
              </div>

              <div className="flex items-center">
                <DollarSign className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium">Monthly Fee</p>
                  <p className="text-sm text-gray-600">Rs. {classData.fee}</p>
                </div>
              </div>

              <div className="flex items-center">
                <Users className="w-5 h-5 text-gray-400 mr-3" />
                <div>
                  <p className="font-medium">Enrolled Students</p>
                  <p className="text-sm text-gray-600">{students.length} students</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  Rs. {(classData.fee * students.length).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">Potential Monthly Revenue</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Students */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Enrolled Students ({students.length})</span>
                <Link href="/students/new">
                  <Button size="sm">Add New Student</Button>
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
                  <p className="text-gray-600 mb-4">
                    This class doesn&apos;t have any students yet.
                  </p>
                  <Link href="/students/new">
                    <Button>Add First Student</Button>
                  </Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {students.map((student) => (
                    <div key={student.id} className="p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{student.name}</h4>
                          <p className="text-sm text-gray-600">Grade {student.grade}</p>
                          {student.phone && (
                            <p className="text-sm text-gray-500">{student.phone}</p>
                          )}
                        </div>
                        <div className="flex space-x-2">
                          <Link href={`/students/${student.id}`}>
                            <Button size="sm" variant="outline">View</Button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}