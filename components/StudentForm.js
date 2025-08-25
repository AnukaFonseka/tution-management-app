// src/components/StudentForm.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentSchema } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { generateMonthlyPayments, getDayName, formatTime, formatDuration } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

export default function StudentForm({ initialData = null, isEditing = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableClasses, setAvailableClasses] = useState([])
  const [selectedClasses, setSelectedClasses] = useState(new Set())
  const router = useRouter()

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData || {
      name: '',
      grade: '',
      phone: '',
      parent_name: ''
    }
  })

  useEffect(() => {
    fetchClasses()
    if (isEditing && initialData?.id) {
      fetchStudentClasses(initialData.id)
    }
  }, [isEditing, initialData])

  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('name')

      if (error) throw error
      setAvailableClasses(data || [])
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchStudentClasses = async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('student_classes')
        .select('class_id')
        .eq('student_id', studentId)

      if (error) throw error
      
      const classIds = new Set(data.map(item => item.class_id))
      setSelectedClasses(classIds)
    } catch (err) {
      console.error('Error fetching student classes:', err)
    }
  }

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')

    try {
      let studentId

      if (isEditing) {
        const { error } = await supabase
          .from('students')
          .update(data)
          .eq('id', initialData.id)

        if (error) throw error
        studentId = initialData.id
      } else {
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert([data])
          .select()
          .single()

        if (error) throw error
        studentId = newStudent.id
      }

      // Handle class assignments
      if (isEditing) {
        // Remove existing class assignments
        await supabase
          .from('student_classes')
          .delete()
          .eq('student_id', studentId)

        // Remove existing payment records
        await supabase
          .from('payments')
          .delete()
          .eq('student_id', studentId)
      }

      // Add new class assignments and generate payment records
      if (selectedClasses.size > 0) {
        const classAssignments = Array.from(selectedClasses).map(classId => ({
          student_id: studentId,
          class_id: classId
        }))

        const { error: assignmentError } = await supabase
          .from('student_classes')
          .insert(classAssignments)

        if (assignmentError) throw assignmentError

        // Generate payment records for each class
        for (const classId of selectedClasses) {
          const classData = availableClasses.find(cls => cls.id === classId)
          if (classData) {
            const payments = await generateMonthlyPayments(studentId, classId, classData.fee, supabase)
            
            const { error: paymentError } = await supabase
              .from('payments')
              .insert(payments)

            if (paymentError) throw paymentError
          }
        }
      }

      router.push('/students')
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleClass = (classId) => {
    const newSelected = new Set(selectedClasses)
    if (newSelected.has(classId)) {
      newSelected.delete(classId)
    } else {
      newSelected.add(classId)
    }
    setSelectedClasses(newSelected)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>
            {isEditing ? 'Edit Student' : 'Add New Student'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Student Name *</Label>
                <Input
                  id="name"
                  {...register('name')}
                  placeholder="Enter student name"
                />
                {errors.name && (
                  <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="grade">Grade *</Label>
                <Input
                  id="grade"
                  {...register('grade')}
                  placeholder="e.g., 10, 11, A/L"
                />
                {errors.grade && (
                  <p className="text-sm text-red-600 mt-1">{errors.grade.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  {...register('phone')}
                  placeholder="e.g., 0771234567"
                />
                {errors.phone && (
                  <p className="text-sm text-red-600 mt-1">{errors.phone.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="parent_name">Parent Name</Label>
                <Input
                  id="parent_name"
                  {...register('parent_name')}
                  placeholder="Enter parent/guardian name"
                />
                {errors.parent_name && (
                  <p className="text-sm text-red-600 mt-1">{errors.parent_name.message}</p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button
                type="submit"
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Saving...' : (isEditing ? 'Update Student' : 'Add Student')}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Class Assignment */}
      <Card>
        <CardHeader>
          <CardTitle>Class Assignment</CardTitle>
          <p className="text-sm text-gray-600">
            Select which classes this student should be enrolled in
          </p>
        </CardHeader>
        <CardContent>
          {availableClasses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No classes available. Create some classes first.
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableClasses.map((classItem) => (
                <div key={classItem.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    checked={selectedClasses.has(classItem.id)}
                    onCheckedChange={() => toggleClass(classItem.id)}
                  />
                  <div className="flex-1">
                    <h4 className="font-medium">{classItem.name}</h4>
                    <p className="text-sm text-gray-600">
                      Grade {classItem.grade} • Rs. {classItem.fee}/month
                    </p>
                    <p className="text-sm text-gray-500">
                      {getDayName(classItem.day_of_week)}, {formatTime(classItem.start_time)} ({formatDuration(classItem.duration)})
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}