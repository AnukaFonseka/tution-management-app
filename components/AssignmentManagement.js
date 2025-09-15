// src/components/AssignmentManagement.js
'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Calendar, 
  Clock, 
  FileText, 
  ExternalLink, 
  Users, 
  CheckCircle, 
  XCircle,
  Eye,
  Edit3,
  Trash2
} from 'lucide-react'
import AssignmentForm from './AssignmentForm'

export default function AssignmentManagement({ 
  classId, 
  classData, 
  assignments = [], 
  onAssignmentsChange 
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedAssignment, setSelectedAssignment] = useState(null)
  const [markingData, setMarkingData] = useState({})
  const [savingMarks, setSavingMarks] = useState(false)

  const handleAssignmentCreated = (newAssignment) => {
    // Refresh the assignments list from parent
    onAssignmentsChange()
  }

  const deleteAssignment = async (assignmentId) => {
    if (!confirm('Are you sure you want to delete this assignment? All marks and submissions will be lost.')) {
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('assignments')
        .delete()
        .eq('id', assignmentId)

      if (error) throw error
      
      // Refresh assignments from parent
      onAssignmentsChange()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const openMarkingDialog = (assignment) => {
    setSelectedAssignment(assignment)
    // Initialize marking data with current marks
    const initialData = {}
    assignment.assignment_submissions.forEach(submission => {
      initialData[submission.student_id] = {
        marks_obtained: submission.marks_obtained || '',
        remarks: submission.remarks || '',
        submitted_at: submission.submitted_at || ''
      }
    })
    setMarkingData(initialData)
  }

  const updateMarkingData = (studentId, field, value) => {
    setMarkingData(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [field]: value
      }
    }))
  }

  const saveMarks = async () => {
    if (!selectedAssignment) return

    setSavingMarks(true)
    try {
      const updates = []
      
      Object.entries(markingData).forEach(([studentId, data]) => {
        const submission = selectedAssignment.assignment_submissions.find(
          s => s.student_id === studentId
        )
        
        if (submission) {
          updates.push({
            id: submission.id,
            marks_obtained: data.marks_obtained ? parseFloat(data.marks_obtained) : null,
            remarks: data.remarks || null,
            submitted_at: data.submitted_at || null
          })
        }
      })

      for (const update of updates) {
        const { error } = await supabase
          .from('assignment_submissions')
          .update({
            marks_obtained: update.marks_obtained,
            remarks: update.remarks,
            submitted_at: update.submitted_at
          })
          .eq('id', update.id)

        if (error) throw error
      }

      // Refresh assignments to show updated marks
      onAssignmentsChange()
      
    } catch (err) {
      setError(err.message)
    } finally {
      setSavingMarks(false)
    }
  }

  const getAssignmentStats = (assignment) => {
    const submissions = assignment.assignment_submissions || []
    const total = submissions.length
    const submitted = submissions.filter(s => s.marks_obtained !== null).length
    const pending = total - submitted
    
    return { total, submitted, pending }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getAssignmentIcon = (type) => {
    switch (type) {
      case 'Paper': return FileText
      case 'Homework': return Calendar
      case 'Assignment': return FileText
      default: return FileText
    }
  }

  const isOverdue = (deadline) => {
    return new Date(deadline) < new Date()
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Assignments</h3>
          <p className="text-sm text-gray-600">
            Manage assignments and track student progress
          </p>
        </div>
        <AssignmentForm 
          classId={classId} 
          onAssignmentCreated={handleAssignmentCreated}
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No assignments yet</h3>
            <p className="text-gray-600 text-center mb-4">
              Create your first assignment to get started with tracking student progress
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {assignments.map((assignment) => {
            const Icon = getAssignmentIcon(assignment.assignment_type)
            const stats = getAssignmentStats(assignment)
            const overdue = isOverdue(assignment.deadline)
            
            return (
              <Card key={assignment.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-lg ${
                        assignment.assignment_type === 'Paper' ? 'bg-blue-100 text-blue-600' :
                        assignment.assignment_type === 'Homework' ? 'bg-green-100 text-green-600' :
                        'bg-purple-100 text-purple-600'
                      }`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{assignment.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">
                            {assignment.assignment_type}
                          </Badge>
                          <Badge variant="secondary">
                            {assignment.total_marks} marks
                          </Badge>
                          {overdue && (
                            <Badge variant="destructive" className="text-xs">
                              Overdue
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openMarkingDialog(assignment)}
                          >
                            <Edit3 className="w-4 h-4 mr-1" />
                            Mark
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              Mark Assignment: {selectedAssignment?.name}
                            </DialogTitle>
                          </DialogHeader>
                          
                          {selectedAssignment && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                  <span className="text-sm font-medium">Total Marks:</span>
                                  <span className="ml-2">{selectedAssignment.total_marks}</span>
                                </div>
                                <div>
                                  <span className="text-sm font-medium">Deadline:</span>
                                  <span className="ml-2">{formatDate(selectedAssignment.deadline)}</span>
                                </div>
                              </div>
                              
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Student</TableHead>
                                    <TableHead>Marks Obtained</TableHead>
                                    <TableHead>Remarks</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {selectedAssignment.assignment_submissions.map((submission) => (
                                    <TableRow key={submission.id}>
                                      <TableCell className="font-medium">
                                        {submission.students?.name}
                                      </TableCell>
                                      <TableCell>
                                        <Input
                                          type="number"
                                          min="0"
                                          max={selectedAssignment.total_marks}
                                          value={markingData[submission.student_id]?.marks_obtained || ''}
                                          onChange={(e) => updateMarkingData(
                                            submission.student_id, 
                                            'marks_obtained', 
                                            e.target.value
                                          )}
                                          className="w-20"
                                          placeholder="0"
                                        />
                                      </TableCell>
                                      <TableCell>
                                        <Textarea
                                          value={markingData[submission.student_id]?.remarks || ''}
                                          onChange={(e) => updateMarkingData(
                                            submission.student_id, 
                                            'remarks', 
                                            e.target.value
                                          )}
                                          className="min-h-[60px]"
                                          placeholder="Optional remarks..."
                                        />
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                              
                              <div className="flex gap-3 pt-4">
                                <Button 
                                  onClick={saveMarks}
                                  disabled={savingMarks}
                                  className="flex-1"
                                >
                                  {savingMarks ? 'Saving...' : 'Save All Marks'}
                                </Button>
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteAssignment(assignment.id)}
                        disabled={loading}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="w-4 h-4 mr-2" />
                      Given: {formatDate(assignment.given_date)}
                    </div>
                    <div className={`flex items-center text-sm ${overdue ? 'text-red-600' : 'text-gray-600'}`}>
                      <Clock className="w-4 h-4 mr-2" />
                      Due: {formatDate(assignment.deadline)}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Users className="w-4 h-4 mr-2" />
                      {stats.submitted}/{stats.total} submitted
                    </div>
                  </div>
                  
                  {assignment.document_url && (
                    <div className="mb-4">
                      <a 
                        href={assignment.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center text-blue-600 hover:text-blue-800 text-sm"
                      >
                        <ExternalLink className="w-4 h-4 mr-1" />
                        View Document
                      </a>
                    </div>
                  )}
                  
                  {assignment.description && (
                    <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                      {assignment.description}
                    </div>
                  )}
                  
                  {/* Progress bar */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span>Progress</span>
                      <span>{stats.submitted}/{stats.total}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${stats.total > 0 ? (stats.submitted / stats.total) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}