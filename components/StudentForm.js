// src/components/StudentForm.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { studentSchema } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { generateMonthlyPayments, getDayName, formatTime, formatDuration, getGradeLabels, GRADES, renderClassSchedules } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'

export default function StudentForm({ initialData = null, isEditing = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableClasses, setAvailableClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClasses, setSelectedClasses] = useState(new Set())
  const [selectedGrades, setSelectedGrades] = useState([])
  const [customFees, setCustomFees] = useState(new Map()) // Store custom fees per class
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(studentSchema),
    defaultValues: initialData || {
      name: '',
      grades: [],
      phone: '',
      parent_name: ''
    }
  })

  const watchedGrades = watch('grades')

  useEffect(() => {
    fetchSubjects()
    fetchClasses()
    if (isEditing && initialData?.id) {
      fetchStudentClasses(initialData.id)
      setSelectedGrades(initialData.grades || [])
    }
  }, [isEditing, initialData])

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (err) {
      console.error('Error fetching subjects:', err)
    }
  }

  const fetchClasses = async () => {
    try {
      // Fetch classes with their schedules and subjects
      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select(`
          *,
          class_schedules (
            id,
            day_of_week,
            start_time,
            duration
          )
        `)
        .order('name')

      if (classesError) throw classesError

      // Fetch subjects separately to avoid complex joins
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')

      if (subjectsError) throw subjectsError

      // Merge subject data with classes
      const classesWithDetails = (classesData || []).map(classItem => ({
        ...classItem,
        subjects: (classItem.subject_ids || []).map(subjectId => 
          subjectsData.find(s => s.id === subjectId)
        ).filter(Boolean)
      }))

      setAvailableClasses(classesWithDetails)
    } catch (err) {
      console.error('Error fetching classes:', err)
    }
  }

  const fetchStudentClasses = async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('student_classes')
        .select('class_id, custom_fee')
        .eq('student_id', studentId)

      if (error) throw error
      
      const classIds = new Set(data.map(item => item.class_id))
      const fees = new Map()
      
      // Store custom fees for existing enrollments
      data.forEach(item => {
        if (item.custom_fee !== null) {
          fees.set(item.class_id, item.custom_fee)
        }
      })
      
      setSelectedClasses(classIds)
      setCustomFees(fees)
    } catch (err) {
      console.error('Error fetching student classes:', err)
    }
  }

  const handleGradeChange = (gradeValue, checked) => {
    const currentGrades = selectedGrades || []
    let newGrades
    if (checked) {
      newGrades = [...currentGrades, gradeValue]
    } else {
      newGrades = currentGrades.filter(g => g !== gradeValue)
    }
    setSelectedGrades(newGrades)
    setValue('grades', newGrades)
  }

  const handleCustomFeeChange = (classId, value) => {
    const newCustomFees = new Map(customFees)
    if (value === '' || value === null) {
      newCustomFees.delete(classId)
    } else {
      const numericValue = parseFloat(value)
      if (!isNaN(numericValue) && numericValue >= 0) {
        newCustomFees.set(classId, numericValue)
      }
    }
    setCustomFees(newCustomFees)
  }

  const onSubmit = async (data) => {
    console.log('Form Data:', data)
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
          class_id: classId,
          custom_fee: customFees.get(classId) || null
        }))

        const { error: assignmentError } = await supabase
          .from('student_classes')
          .insert(classAssignments)

        if (assignmentError) throw assignmentError

        // Generate payment records for each class
        for (const classId of selectedClasses) {
          const classData = availableClasses.find(cls => cls.id === classId)
          if (classData) {
            // Use custom fee if set, otherwise use class default fee
            const feeToUse = customFees.get(classId) || classData.fee
            const payments = await generateMonthlyPayments(studentId, classId, feeToUse, supabase)
            
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
      // Remove custom fee when deselecting class
      const newCustomFees = new Map(customFees)
      newCustomFees.delete(classId)
      setCustomFees(newCustomFees)
    } else {
      newSelected.add(classId)
    }
    setSelectedClasses(newSelected)
  }

  const renderClassSubjects = (subjects) => {
    if (!subjects || subjects.length === 0) return 'No subjects'
    
    return subjects.map((subject, index) => (
      <span key={subject.id} className="text-sm">
        {subject.name}
        {index < subjects.length - 1 && ', '}
      </span>
    ))
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
            </div>

            {/* Grades Selection */}
            <div>
              <Label>Student Grades *</Label>
              <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3 mt-2">
                {GRADES.map((grade) => (
                  <div key={grade.value} className="flex items-center space-x-2">
                    <Checkbox
                      id={`student-grade-${grade.value}`}
                      checked={selectedGrades.includes(grade.value)}
                      onCheckedChange={(checked) => handleGradeChange(grade.value, checked)}
                    />
                    <Label 
                      htmlFor={`student-grade-${grade.value}`}
                      className="text-sm font-normal cursor-pointer"
                    >
                      {grade.value}
                    </Label>
                  </div>
                ))}
              </div>
              {selectedGrades.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedGrades.map((grade) => (
                    <Badge key={grade} variant="secondary">
                      Grade {grade}
                    </Badge>
                  ))}
                </div>
              )}
              {errors.grades && (
                <p className="text-sm text-red-600 mt-1">{errors.grades.message}</p>
              )}
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
            Select which classes this student should be enrolled in. You can set custom fees per class if needed.
          </p>
        </CardHeader>
        <CardContent>
          {availableClasses.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              No classes available. Create some classes first.
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {availableClasses.map((classItem) => (
                <div key={classItem.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-gray-50">
                  <Checkbox
                    checked={selectedClasses.has(classItem.id)}
                    onCheckedChange={() => toggleClass(classItem.id)}
                  />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-lg">{classItem.name}</h4>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{classItem.class_type}</Badge>
                        <span className="font-semibold text-green-600">
                          Rs. {customFees.get(classItem.id) || classItem.fee}/month
                          {customFees.has(classItem.id) && (
                            <span className="text-xs text-gray-500 ml-1">(custom)</span>
                          )}
                        </span>
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Grades:</span>
                        <div className="flex flex-wrap gap-1">
                          {(classItem.grades || []).map((grade) => (
                            <Badge key={grade} variant="secondary" className="text-xs">
                              Grade {grade}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Subjects:</span>
                        <span className="text-sm text-gray-600">
                          {renderClassSubjects(classItem.subjects)}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">Schedule:</span>
                        <div className="text-sm text-gray-600">
                          {renderClassSchedules(classItem.class_schedules)}
                        </div>
                      </div>

                      {/* Custom Fee Input - Only show if class is selected */}
                      {selectedClasses.has(classItem.id) && (
                        <div className="flex items-center gap-2 mt-3 p-3 bg-blue-50 rounded-md">
                          <Label htmlFor={`custom-fee-${classItem.id}`} className="text-sm font-medium whitespace-nowrap">
                            Custom Fee (Rs.):
                          </Label>
                          <div className="flex items-center gap-2">
                            <Input
                              id={`custom-fee-${classItem.id}`}
                              type="number"
                              min="0"
                              step="0.01"
                              placeholder={`Default: ${classItem.fee}`}
                              value={customFees.get(classItem.id) || ''}
                              onChange={(e) => handleCustomFeeChange(classItem.id, e.target.value)}
                              className="w-32"
                            />
                            {customFees.has(classItem.id) && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCustomFeeChange(classItem.id, null)}
                                className="text-xs"
                              >
                                Reset to default
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-gray-500">
                            Leave empty to use default fee (Rs. {classItem.fee})
                          </p>
                        </div>
                      )}
                    </div>
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