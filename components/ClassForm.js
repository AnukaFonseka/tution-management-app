// src/components/ClassForm.js
'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { classSchema } from '@/lib/validations'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { DAYS_OF_WEEK } from '@/lib/utils'

export default function ClassForm({ initialData = null, isEditing = false }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(classSchema),
    defaultValues: initialData || {
      name: '',
      grade: '',
      day_of_week: 1,
      start_time: '',
      duration: 60,
      fee: 0
    }
  })

  const onSubmit = async (data) => {
    setLoading(true)
    setError('')

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('classes')
          .update(data)
          .eq('id', initialData.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('classes')
          .insert([data])

        if (error) throw error
      }

      router.push('/classes')
      router.refresh()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="max-w-2xl mx-auto">
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Class Name *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="e.g., Mathematics Advanced"
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
              <Label htmlFor="day_of_week">Day of Week *</Label>
              <Select
                onValueChange={(value) => setValue('day_of_week', parseInt(value))}
                defaultValue={watch('day_of_week')?.toString()}
              >
                <SelectTrigger>
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
              {errors.day_of_week && (
                <p className="text-sm text-red-600 mt-1">{errors.day_of_week.message}</p>
              )}
            </div>

            <div>
              <Label htmlFor="start_time">Start Time *</Label>
              <Input
                id="start_time"
                type="time"
                {...register('start_time')}
              />
              {errors.start_time && (
                <p className="text-sm text-red-600 mt-1">{errors.start_time.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min="15"
                max="480"
                {...register('duration', { valueAsNumber: true })}
                placeholder="60"
              />
              {errors.duration && (
                <p className="text-sm text-red-600 mt-1">{errors.duration.message}</p>
              )}
            </div>

            <div>
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
          </div>

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