// src/components/StudentForm.js
'use client'
import { useState, useEffect, useMemo } from 'react'
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
import { ChevronDown, ChevronUp, Search } from 'lucide-react'

export default function StudentForm({ initialData = null, isEditing = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [availableClasses, setAvailableClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [selectedClasses, setSelectedClasses] = useState(new Set())
  const [selectedGrades, setSelectedGrades] = useState([])
  const [customFees, setCustomFees] = useState(new Map()) // Store custom fees per class
  const [classSearchTerm, setClassSearchTerm] = useState('')
  const [isClassSectionCollapsed, setIsClassSectionCollapsed] = useState(false)
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

  // Filter classes based on selected grades and search term
  const filteredClasses = useMemo(() => {
    let filtered = availableClasses

    // Filter by grades if any grades are selected
    if (selectedGrades.length > 0) {
      filtered = filtered.filter(classItem => {
        // Check if any of the class grades match any of the selected student grades
        return classItem.grades && classItem.grades.some(classGrade => 
          selectedGrades.includes(classGrade)
        )
      })
    }

    // Filter by search term
    if (classSearchTerm.trim()) {
      const searchLower = classSearchTerm.toLowerCase().trim()
      filtered = filtered.filter(classItem => {
        // Search in class name, subjects, and class type
        const nameMatch = classItem.name.toLowerCase().includes(searchLower)
        const subjectMatch = classItem.subjects && classItem.subjects.some(subject => 
          subject.name.toLowerCase().includes(searchLower)
        )
        const typeMatch = classItem.class_type.toLowerCase().includes(searchLower)
        
        return nameMatch || subjectMatch || typeMatch
      })
    }

    return filtered
  }, [availableClasses, selectedGrades, classSearchTerm])

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

  // Helper function to manage payments without deleting history
  const updateStudentPayments = async (studentId, newClassIds, customFeesMap) => {
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()

    // Get current enrollments
    const { data: currentEnrollments, error: enrollmentError } = await supabase
      .from('student_classes')
      .select('class_id')
      .eq('student_id', studentId)

    if (enrollmentError) throw enrollmentError

    const currentClassIds = new Set(currentEnrollments.map(e => e.class_id))
    const newClassIdsSet = new Set(newClassIds)

    // Find classes to add and remove
    const classesToAdd = [...newClassIdsSet].filter(id => !currentClassIds.has(id))
    const classesToRemove = [...currentClassIds].filter(id => !newClassIdsSet.has(id))

    // Remove enrollments for classes no longer selected
    if (classesToRemove.length > 0) {
      const { error: removeEnrollmentError } = await supabase
        .from('student_classes')
        .delete()
        .eq('student_id', studentId)
        .in('class_id', classesToRemove)

      if (removeEnrollmentError) throw removeEnrollmentError

      // Only remove FUTURE payments (current month and later) for removed classes
      const { error: removeFuturePaymentsError } = await supabase
        .from('payments')
        .delete()
        .eq('student_id', studentId)
        .in('class_id', classesToRemove)
        .or(`year.gt.${currentYear},and(year.eq.${currentYear},month.gte.${currentMonth})`)

      if (removeFuturePaymentsError) throw removeFuturePaymentsError
    }

    // Add new enrollments
    if (classesToAdd.length > 0) {
      const newEnrollments = classesToAdd.map(classId => ({
        student_id: studentId,
        class_id: classId,
        custom_fee: customFeesMap.get(classId) || null
      }))

      const { error: addEnrollmentError } = await supabase
        .from('student_classes')
        .insert(newEnrollments)

      if (addEnrollmentError) throw addEnrollmentError

      // Generate future payments for new classes
      for (const classId of classesToAdd) {
        const classData = availableClasses.find(cls => cls.id === classId)
        if (classData) {
          const feeToUse = customFeesMap.get(classId) || classData.fee
          const payments = await generateMonthlyPayments(studentId, classId, feeToUse, supabase)
          
          const { error: paymentError } = await supabase
            .from('payments')
            .insert(payments)

          if (paymentError) throw paymentError
        }
      }
    }

    // Update custom fees for existing enrollments
    for (const [classId, customFee] of customFeesMap) {
      if (currentClassIds.has(classId)) {
        // Update enrollment with new custom fee
        const { error: updateEnrollmentError } = await supabase
          .from('student_classes')
          .update({ custom_fee: customFee })
          .eq('student_id', studentId)
          .eq('class_id', classId)

        if (updateEnrollmentError) throw updateEnrollmentError

        // Update future payment amounts (current month and later)
        const { error: updatePaymentsError } = await supabase
          .from('payments')
          .update({ amount: customFee })
          .eq('student_id', studentId)
          .eq('class_id', classId)
          .eq('status', 'pending') // Only update unpaid payments
          .or(`year.gt.${currentYear},and(year.eq.${currentYear},month.gte.${currentMonth})`)

        if (updatePaymentsError) throw updatePaymentsError
      }
    }
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

        // Update payments without deleting history
        await updateStudentPayments(studentId, Array.from(selectedClasses), customFees)
      } else {
        const { data: newStudent, error } = await supabase
          .from('students')
          .insert([data])
          .select()
          .single()

        if (error) throw error
        studentId = newStudent.id

        // Add new class assignments and generate payment records for new student
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
        <CardHeader 
          className="cursor-pointer"
          onClick={() => setIsClassSectionCollapsed(!isClassSectionCollapsed)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                Class Assignment
                {selectedClasses.size > 0 && (
                  <Badge variant="secondary">
                    {selectedClasses.size} selected
                  </Badge>
                )}
              </CardTitle>
              <p className="text-sm text-gray-600">
                Select which classes this student should be enrolled in. You can set custom fees per class if needed.
              </p>
              {isEditing && (
                <p className="text-sm text-blue-600 mt-1">
                  ℹ️ Changes will only affect future payments. Past payment history will be preserved.
                </p>
              )}
            </div>
            {isClassSectionCollapsed ? (
              <ChevronDown className="h-5 w-5" />
            ) : (
              <ChevronUp className="h-5 w-5" />
            )}
          </div>
        </CardHeader>
        
        {!isClassSectionCollapsed && (
          <CardContent>
            {/* Search and Filter Info */}
            <div className="mb-4 space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search classes by name, subject, or type..."
                  value={classSearchTerm}
                  onChange={(e) => setClassSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              {/* Filter Status */}
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>
                  Showing {filteredClasses.length} of {availableClasses.length} classes
                </span>
                {selectedGrades.length > 0 && (
                  <span className="flex items-center gap-1">
                    • Filtered by grades: 
                    <div className="flex gap-1 ml-1">
                      {selectedGrades.map((grade) => (
                        <Badge key={grade} variant="outline" className="text-xs">
                          {grade}
                        </Badge>
                      ))}
                    </div>
                  </span>
                )}
                {classSearchTerm && (
                  <span>
                    • Search: &quot;{classSearchTerm}&quot;
                  </span>
                )}
              </div>

              {/* Clear Filters */}
              {(classSearchTerm || selectedGrades.length > 0) && (
                <div className="flex gap-2">
                  {classSearchTerm && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setClassSearchTerm('')}
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              )}
            </div>

            {availableClasses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">
                No classes available. Create some classes first.
              </p>
            ) : filteredClasses.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-2">No classes match your criteria</p>
                <p className="text-sm text-gray-400">
                  Try adjusting your search term or selected grades
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 overflow-y-auto max-h-[50vh]">
                {filteredClasses.map((classItem) => (
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
                              <Badge 
                                key={grade} 
                                variant={selectedGrades.includes(grade) ? "default" : "secondary"} 
                                className="text-xs"
                              >
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
                          <div className="flex flex-col md:flex-row md:items-center gap-1 md:gap-2 mt-3 p-3 bg-blue-50 rounded-md">
                            <Label htmlFor={`custom-fee-${classItem.id}`} className="text-xs md:text-sm font-medium whitespace-nowrap">
                              Custom Fee (Rs.):
                            </Label>
                            <div className="md:flex items-center gap-2">
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
        )}
      </Card>
    </div>
  )
}