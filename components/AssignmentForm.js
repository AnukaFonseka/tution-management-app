// src/components/AssignmentForm.js
'use client'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { assignmentSchema } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { Plus, Calendar, FileText, Link as LinkIcon } from 'lucide-react'

const ASSIGNMENT_TYPES = [
  { value: 'Paper', label: 'Paper', icon: FileText },
  { value: 'Homework', label: 'Homework', icon: Calendar },
  { value: 'Assignment', label: 'Assignment', icon: FileText }
]

export default function AssignmentForm({ classId, onAssignmentCreated }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(assignmentSchema),
    defaultValues: {
      name: '',
      assignment_type: '',
      given_date: new Date().toISOString().split('T')[0], // Today's date
      deadline: '',
      document_url: '',
      description: '',
      total_marks: 100
    }
  })

  const watchedType = watch('assignment_type')

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')

    try {
      // Create the assignment
      const { data: newAssignment, error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          class_id: classId,
          name: data.name,
          assignment_type: data.assignment_type,
          given_date: data.given_date,
          deadline: data.deadline,
          document_url: data.document_url || null,
          description: data.description || null,
          total_marks: data.total_marks
        }])
        .select()
        .single()

      if (assignmentError) throw assignmentError

      // Get all students enrolled in this class
      const { data: enrolledStudents, error: studentsError } = await supabase
        .from('student_classes')
        .select('student_id')
        .eq('class_id', classId)

      if (studentsError) throw studentsError

      // Create assignment submission records for each student (without marks initially)
      if (enrolledStudents.length > 0) {
        const submissions = enrolledStudents.map(enrollment => ({
          assignment_id: newAssignment.id,
          student_id: enrollment.student_id,
          marks_obtained: null,
          submitted_at: null,
          remarks: null
        }))

        const { error: submissionsError } = await supabase
          .from('assignment_submissions')
          .insert(submissions)

        if (submissionsError) throw submissionsError
      }

      // Close dialog and reset form
      setOpen(false)
      reset()
      
      // Notify parent component
      if (onAssignmentCreated) {
        onAssignmentCreated(newAssignment)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setOpen(false)
    reset()
    setError('')
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Assignment
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Assignment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
              {error}
            </div>
          )}

          {/* Assignment Name */}
          <div className='space-y-1'>
            <Label htmlFor="name">Assignment Name *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="e.g., Chapter 5 Exercises"
            />
            {errors.name && (
              <p className="text-sm text-red-600 mt-1">{errors.name.message}</p>
            )}
          </div>

          {/* Assignment Type */}
          <div className='space-y-1'>
            <Label htmlFor="assignment_type">Assignment Type *</Label>
            <Select
              onValueChange={(value) => setValue('assignment_type', value)}
              defaultValue={watchedType}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select assignment type" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNMENT_TYPES.map((type) => {
                  const Icon = type.icon
                  return (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex items-center">
                        <Icon className="w-4 h-4 mr-2" />
                        {type.label}
                      </div>
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
            {errors.assignment_type && (
              <p className="text-sm text-red-600 mt-1">{errors.assignment_type.message}</p>
            )}
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className='space-y-1'>
              <Label htmlFor="given_date">Given Date *</Label>
              <Input
                id="given_date"
                type="date"
                {...register('given_date')}
              />
              {errors.given_date && (
                <p className="text-sm text-red-600 mt-1">{errors.given_date.message}</p>
              )}
            </div>

            <div className='space-y-1'>
              <Label htmlFor="deadline">Deadline *</Label>
              <Input
                id="deadline"
                type="date"
                {...register('deadline')}
              />
              {errors.deadline && (
                <p className="text-sm text-red-600 mt-1">{errors.deadline.message}</p>
              )}
            </div>
          </div>

          {/* Total Marks */}
          <div className='space-y-1'>
            <Label htmlFor="total_marks">Total Marks *</Label>
            <Input
              id="total_marks"
              type="number"
              min="1"
              max="1000"
              {...register('total_marks', { valueAsNumber: true })}
              placeholder="100"
            />
            {errors.total_marks && (
              <p className="text-sm text-red-600 mt-1">{errors.total_marks.message}</p>
            )}
          </div>

          {/* Document URL */}
          <div className='space-y-1'>
            <Label htmlFor="document_url">Document URL (Optional)</Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                id="document_url"
                type="url"
                {...register('document_url')}
                placeholder="https://drive.google.com/..."
                className="pl-10"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Add a Google Drive link or any other document URL
            </p>
            {errors.document_url && (
              <p className="text-sm text-red-600 mt-1">{errors.document_url.message}</p>
            )}
          </div>

          {/* Description */}
          <div className='space-y-1'>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Additional instructions or notes for students..."
              rows={3}
            />
            {errors.description && (
              <p className="text-sm text-red-600 mt-1">{errors.description.message}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creating...' : 'Create Assignment'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}