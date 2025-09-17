// src/components/ClassForm.js
'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classSchema } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Toggle } from '@/components/ui/toggle'
import { Trash2, Plus, CheckIcon } from 'lucide-react'
import { DAYS_OF_WEEK, GRADES, CLASS_TYPES, getDayName } from '@/lib/utils'

export default function ClassForm({ initialData = null, isEditing = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [subjects, setSubjects] = useState([])
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    control,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(classSchema),
    defaultValues: initialData || {
      name: '',
      grades: [],
      subject_ids: [],
      class_type: 'Group',
      fee: 0,
      schedules: [{ day_of_week: 1, start_time: '', duration: 120 }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'schedules'
  })

  const watchedGrades = watch('grades')
  const watchedSubjects = watch('subject_ids')

  // Fetch subjects on component mount
  useEffect(() => {
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

    fetchSubjects()
  }, [])

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')

    try {
      if (isEditing) {
        // Update class
        const { error: classError } = await supabase
          .from('classes')
          .update({
            name: data.name,
            grades: data.grades,
            subject_ids: data.subject_ids,
            class_type: data.class_type,
            fee: data.fee
          })
          .eq('id', initialData.id)

        if (classError) throw classError

        // Delete existing schedules
        const { error: deleteError } = await supabase
          .from('class_schedules')
          .delete()
          .eq('class_id', initialData.id)

        if (deleteError) throw deleteError

        // Insert new schedules
        const schedules = data.schedules.map(schedule => ({
          class_id: initialData.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          duration: schedule.duration
        }))

        const { error: scheduleError } = await supabase
          .from('class_schedules')
          .insert(schedules)

        if (scheduleError) throw scheduleError
      } else {
        // Create new class
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .insert([{
            name: data.name,
            grades: data.grades,
            subject_ids: data.subject_ids,
            class_type: data.class_type,
            fee: data.fee
          }])
          .select()
          .single()

        if (classError) throw classError

        // Insert schedules
        const schedules = data.schedules.map(schedule => ({
          class_id: classData.id,
          day_of_week: schedule.day_of_week,
          start_time: schedule.start_time,
          duration: schedule.duration
        }))

        const { error: scheduleError } = await supabase
          .from('class_schedules')
          .insert(schedules)

        if (scheduleError) throw scheduleError
      }

      router.push('/classes')
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGradeToggle = (gradeValue) => {
    const currentGrades = watchedGrades || []
    if (currentGrades.includes(gradeValue)) {
      setValue('grades', currentGrades.filter(g => g !== gradeValue))
    } else {
      setValue('grades', [...currentGrades, gradeValue])
    }
  }

  const handleSubjectToggle = (subjectId) => {
    const currentSubjects = watchedSubjects || []
    if (currentSubjects.includes(subjectId)) {
      setValue('subject_ids', currentSubjects.filter(s => s !== subjectId))
    } else {
      setValue('subject_ids', [...currentSubjects, subjectId])
    }
  }

  const handleSubjectChange = (subjectId, checked) => {
    const currentSubjects = watchedSubjects || []
    if (checked) {
      setValue('subject_ids', [...currentSubjects, subjectId])
    } else {
      setValue('subject_ids', currentSubjects.filter(s => s !== subjectId))
    }
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle>
          {isEditing ? 'Edit Class' : 'Create New Class'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className='space-y-1'>
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Advanced Mathematics"
              />
              {errors.name && (
                <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
              )}
            </div>

            <div className='space-y-1'>
              <Label htmlFor="class_type">Class Type *</Label>
              <Select
                onValueChange={(value) => setValue('class_type', value)}
                defaultValue={watch('class_type')}
                className="w-full"
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select class type" />
                </SelectTrigger>
                <SelectContent>
                  {CLASS_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.class_type && (
                <p className="text-sm text-red-600 mt-1">{errors.class_type.message}</p>
              )}
            </div>
          </div>

          {/* Grades Selection */}
          <div>
            <Label>Grades *</Label>
            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2 mt-2">
              {GRADES.map((grade) => (
                <Toggle
                  key={grade.value}
                  pressed={watchedGrades?.includes(grade.value) || false}
                  onPressedChange={() => handleGradeToggle(grade.value)}
                  variant="outline"
                  size="sm"
                  className="md:h-9 md:px-3 data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
                >
                  {grade.value}
                </Toggle>
              ))}
            </div>
            {watchedGrades?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {watchedGrades.map((grade) => (
                  <Badge key={grade} variant="secondary" className="text-xs">
                    Grade {grade}
                  </Badge>
                ))}
              </div>
            )}
            {errors.grades && (
              <p className="text-sm text-red-600 mt-1">{errors.grades.message}</p>
            )}
          </div>

          {/* Subjects Selection with Toggle Buttons */}
          <div>
            <Label>Subjects *</Label>
            <div className="space-x-1 space-y-2 gap-2 mt-2">
              {subjects.map((subject) => (
                <Toggle
                  key={subject.id}
                  pressed={watchedSubjects?.includes(subject.id) || false}
                  onPressedChange={() => handleSubjectToggle(subject.id)}
                  variant="outline"
                  size="sm"
                  className="md:h-10 px-4 justify-start text-left font-normal data-[state=on]:bg-blue-100 data-[state=on]:text-blue-900 data-[state=on]:border-blue-300 hover:bg-gray-50 rounded-full w-fit"
                >
                  {
                    watchedSubjects?.includes(subject.id) && (<CheckIcon className="size-3" />)
                  }
                  {subject.name}
                </Toggle>
              ))}
            </div>
            {/* {watchedSubjects?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {watchedSubjects.map((subjectId) => {
                  const subject = subjects.find(s => s.id === subjectId)
                  return subject ? (
                    <Badge key={subjectId} variant="secondary" className="text-xs">
                      {subject.name}
                    </Badge>
                  ) : null
                })}
              </div>
            )} */}
            {errors.subject_ids && (
              <p className="text-sm text-red-600 mt-1">{errors.subject_ids.message}</p>
            )}
          </div>

          {/* Fee */}
          <div  className='space-y-1'>
            <Label htmlFor="fee">Monthly Fee (Rs.) *</Label>
            <Input
              id="fee"
              type="number"
              min="0"
              step="0.01"
              {...register('fee', { valueAsNumber: true })}
              placeholder="5000.00"
            />
            {errors.fee && (
              <p className="text-sm text-red-600 mt-1">{errors.fee.message}</p>
            )}
          </div>

          {/* Schedules */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label>Class Schedules *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ day_of_week: 1, start_time: '', duration: 60 })}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Schedule
              </Button>
            </div>

            {fields.map((field, index) => (
              <Card key={field.id} className="mb-4 shadow-non">
                <CardContent className="pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div  className='space-y-1'>
                      <Label htmlFor={`schedules.${index}.day_of_week`}>Day</Label>
                      <Select
                        onValueChange={(value) => setValue(`schedules.${index}.day_of_week`, parseInt(value))}
                        defaultValue={watch(`schedules.${index}.day_of_week`)?.toString()}
                        className="w-full"
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select day" />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS_OF_WEEK.map((day) => (
                            <SelectItem key={day.value} value={day.value.toString()}>
                              {day.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className='space-y-1'>
                      <Label htmlFor={`schedules.${index}.start_time`}>Start Time</Label>
                      <Input
                        id={`schedules.${index}.start_time`}
                        type="time"
                        {...register(`schedules.${index}.start_time`)}
                      />
                    </div>

                    <div className='space-y-1'>
                      <Label htmlFor={`schedules.${index}.duration`}>Duration (min)</Label>
                      <Input
                        id={`schedules.${index}.duration`}
                        type="number"
                        min="15"
                        max="480"
                        {...register(`schedules.${index}.duration`, { valueAsNumber: true })}
                        placeholder="120"
                      />
                    </div>

                    <div className="flex items-end pb-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => remove(index)}
                        disabled={fields.length === 1}
                        className="w-full md:w-auto"  
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {errors.schedules?.[index] && (
                    <div className="mt-2 text-sm text-red-600">
                      {Object.values(errors.schedules[index]).map((error, i) => (
                        <p key={i}>{error.message}</p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

            {errors.schedules && (
              <p className="text-sm text-red-600 mt-1">{errors.schedules.message}</p>
            )}
          </div>

          {/* Submit Buttons */}
          <div className="flex gap-4 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Saving...' : (isEditing ? 'Update Class' : 'Create Class')}
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
  )
}