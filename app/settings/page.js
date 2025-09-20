// app/settings/page.js
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Settings, 
  GraduationCap, 
  BookOpen, 
  FileText,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff
} from "lucide-react";

export default function SettingsPage() {
  const [grades, setGrades] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assignmentTypes, setAssignmentTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Dialog states
  const [gradeDialog, setGradeDialog] = useState({ open: false, mode: 'create', data: null });
  const [subjectDialog, setSubjectDialog] = useState({ open: false, mode: 'create', data: null });
  const [assignmentTypeDialog, setAssignmentTypeDialog] = useState({ open: false, mode: 'create', data: null });

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      // Fetch grades
      const { data: gradesData, error: gradesError } = await supabase
        .from('grades')
        .select('*')
        .order('display_order');

      if (gradesError) throw gradesError;

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (subjectsError) throw subjectsError;

      // Fetch assignment types
      const { data: assignmentTypesData, error: assignmentTypesError } = await supabase
        .from('assignment_types')
        .select('*')
        .order('name');

      if (assignmentTypesError) throw assignmentTypesError;

      setGrades(gradesData || []);
      setSubjects(subjectsData || []);
      setAssignmentTypes(assignmentTypesData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Grade management functions
  const handleGradeSubmit = async (formData) => {
    try {
      if (gradeDialog.mode === 'create') {
        const { error } = await supabase
          .from('grades')
          .insert([{
            name: formData.name,
            display_order: formData.display_order || grades.length + 1,
            is_active: true
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('grades')
          .update({
            name: formData.name,
            display_order: formData.display_order
          })
          .eq('id', gradeDialog.data.id);
        if (error) throw error;
      }
      
      setGradeDialog({ open: false, mode: 'create', data: null });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteGrade = async (id) => {
    if (!confirm('Are you sure? This grade might be used by existing classes and students.')) return;
    
    try {
      const { error } = await supabase
        .from('grades')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleGradeActive = async (id, isActive) => {
    try {
      const { error } = await supabase
        .from('grades')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const moveGrade = async (id, direction) => {
    const currentGrade = grades.find(g => g.id === id);
    const currentIndex = grades.findIndex(g => g.id === id);
    
    let newOrder;
    if (direction === 'up' && currentIndex > 0) {
      newOrder = grades[currentIndex - 1].display_order;
    } else if (direction === 'down' && currentIndex < grades.length - 1) {
      newOrder = grades[currentIndex + 1].display_order;
    } else {
      return;
    }

    try {
      const { error } = await supabase
        .from('grades')
        .update({ display_order: newOrder })
        .eq('id', id);
      
      if (error) throw error;
      
      // Update the other grade's order
      const otherGradeId = direction === 'up' ? 
        grades[currentIndex - 1].id : grades[currentIndex + 1].id;
      
      await supabase
        .from('grades')
        .update({ display_order: currentGrade.display_order })
        .eq('id', otherGradeId);
      
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Subject management functions
  const handleSubjectSubmit = async (formData) => {
    try {
      if (subjectDialog.mode === 'create') {
        const { error } = await supabase
          .from('subjects')
          .insert([{
            name: formData.name,
            description: formData.description || null
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subjects')
          .update({
            name: formData.name,
            description: formData.description || null
          })
          .eq('id', subjectDialog.data.id);
        if (error) throw error;
      }
      
      setSubjectDialog({ open: false, mode: 'create', data: null });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteSubject = async (id) => {
    if (!confirm('Are you sure? This subject might be used by existing classes.')) return;
    
    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  // Assignment type management functions
  const handleAssignmentTypeSubmit = async (formData) => {
    try {
      if (assignmentTypeDialog.mode === 'create') {
        const { error } = await supabase
          .from('assignment_types')
          .insert([{
            name: formData.name,
            description: formData.description || null,
            is_active: true
          }]);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('assignment_types')
          .update({
            name: formData.name,
            description: formData.description || null
          })
          .eq('id', assignmentTypeDialog.data.id);
        if (error) throw error;
      }
      
      setAssignmentTypeDialog({ open: false, mode: 'create', data: null });
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const deleteAssignmentType = async (id) => {
    if (!confirm('Are you sure? This assignment type might be used by existing assignments.')) return;
    
    try {
      const { error } = await supabase
        .from('assignment_types')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  const toggleAssignmentTypeActive = async (id, isActive) => {
    try {
      const { error } = await supabase
        .from('assignment_types')
        .update({ is_active: !isActive })
        .eq('id', id);
      
      if (error) throw error;
      fetchAllData();
    } catch (err) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Settings className="w-6 h-6 mr-2" />
          Settings
        </h1>
        <p className="text-gray-600">
          Manage grades, subjects, and assignment types for your tuition center
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      <Tabs defaultValue="grades" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="grades" className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden md:inline">Grades</span> ({grades.length})
          </TabsTrigger>
          <TabsTrigger value="subjects" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden md:inline">Subjects</span> ({subjects.length})
          </TabsTrigger>
          <TabsTrigger value="assignment-types" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden md:inline">Assignment Types</span> ({assignmentTypes.length})
          </TabsTrigger>
        </TabsList>

        {/* Grades Tab */}
        <TabsContent value="grades" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Grades</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure grade levels for your classes and students
                </p>
              </div>
              <Dialog 
                open={gradeDialog.open} 
                onOpenChange={(open) => setGradeDialog({ ...gradeDialog, open })}
              >
                <DialogTrigger asChild>
                  <Button onClick={() => setGradeDialog({ open: true, mode: 'create', data: null })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Grade
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {gradeDialog.mode === 'create' ? 'Add New Grade' : 'Edit Grade'}
                    </DialogTitle>
                  </DialogHeader>
                  <GradeForm 
                    data={gradeDialog.data}
                    onSubmit={handleGradeSubmit}
                    onCancel={() => setGradeDialog({ open: false, mode: 'create', data: null })}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Grade Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grades.map((grade, index) => (
                    <TableRow key={grade.id}>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveGrade(grade.id, 'up')}
                            disabled={index === 0}
                          >
                            <ChevronUp className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => moveGrade(grade.id, 'down')}
                            disabled={index === grades.length - 1}
                          >
                            <ChevronDown className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{grade.name}</TableCell>
                      <TableCell>
                        <Badge 
                          variant={grade.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleGradeActive(grade.id, grade.is_active)}
                        >
                          {grade.is_active ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setGradeDialog({ 
                              open: true, 
                              mode: 'edit', 
                              data: grade 
                            })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteGrade(grade.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Subjects</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure subjects taught in your tuition center
                </p>
              </div>
              <Dialog 
                open={subjectDialog.open} 
                onOpenChange={(open) => setSubjectDialog({ ...subjectDialog, open })}
              >
                <DialogTrigger asChild>
                  <Button onClick={() => setSubjectDialog({ open: true, mode: 'create', data: null })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {subjectDialog.mode === 'create' ? 'Add New Subject' : 'Edit Subject'}
                    </DialogTitle>
                  </DialogHeader>
                  <SubjectForm 
                    data={subjectDialog.data}
                    onSubmit={handleSubjectSubmit}
                    onCancel={() => setSubjectDialog({ open: false, mode: 'create', data: null })}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {subject.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSubjectDialog({ 
                              open: true, 
                              mode: 'edit', 
                              data: subject 
                            })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSubject(subject.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Assignment Types Tab */}
        <TabsContent value="assignment-types" className="mt-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Manage Assignment Types</CardTitle>
                <p className="text-sm text-gray-600">
                  Configure types of assignments you give to students
                </p>
              </div>
              <Dialog 
                open={assignmentTypeDialog.open} 
                onOpenChange={(open) => setAssignmentTypeDialog({ ...assignmentTypeDialog, open })}
              >
                <DialogTrigger asChild>
                  <Button onClick={() => setAssignmentTypeDialog({ open: true, mode: 'create', data: null })}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Assignment Type
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {assignmentTypeDialog.mode === 'create' ? 'Add New Assignment Type' : 'Edit Assignment Type'}
                    </DialogTitle>
                  </DialogHeader>
                  <AssignmentTypeForm 
                    data={assignmentTypeDialog.data}
                    onSubmit={handleAssignmentTypeSubmit}
                    onCancel={() => setAssignmentTypeDialog({ open: false, mode: 'create', data: null })}
                  />
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assignmentTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {type.description || 'No description'}
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={type.is_active ? "default" : "secondary"}
                          className="cursor-pointer"
                          onClick={() => toggleAssignmentTypeActive(type.id, type.is_active)}
                        >
                          {type.is_active ? (
                            <>
                              <Eye className="w-3 h-3 mr-1" />
                              Active
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3 h-3 mr-1" />
                              Inactive
                            </>
                          )}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setAssignmentTypeDialog({ 
                              open: true, 
                              mode: 'edit', 
                              data: type 
                            })}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteAssignmentType(type.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Form Components
function GradeForm({ data, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: data?.name || '',
    display_order: data?.display_order || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Grade Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Grade 1, O/L, A/L"
          required
        />
      </div>
      <div>
        <Label htmlFor="display_order">Display Order</Label>
        <Input
          id="display_order"
          type="number"
          value={formData.display_order}
          onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || '' })}
          placeholder="Order in lists"
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {data ? 'Update Grade' : 'Add Grade'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SubjectForm({ data, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: data?.name || '',
    description: data?.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Subject Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Mathematics, Science, English"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of the subject"
          rows={3}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {data ? 'Update Subject' : 'Add Subject'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}

function AssignmentTypeForm({ data, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: data?.name || '',
    description: data?.description || ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name">Assignment Type Name *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          placeholder="e.g., Quiz, Project, Exam"
          required
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          placeholder="Brief description of this assignment type"
          rows={3}
        />
      </div>
      <div className="flex gap-3 pt-4">
        <Button type="submit" className="flex-1">
          {data ? 'Update Assignment Type' : 'Add Assignment Type'}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </form>
  );
}