// src/app/students/page.js
"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users, Phone, User } from "lucide-react";

export default function StudentsPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(
          `
          *,
          student_classes(
            classes(name, fee)
          )
        `
        )
        .order("name");

      if (error) throw error;
      setStudents(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async (id) => {
    if (
      !confirm(
        "Are you sure you want to delete this student? This will also remove all class enrollments and payment records."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) throw error;

      setStudents(students.filter((student) => student.id !== id));
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
      <div className="flex justify-between items-center mb-4 md:mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-gray-600 hidden md:block">
            Manage student information and class enrollments
          </p>
        </div>
        <Link href="/students/new">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add New Student
          </Button>
        </Link>
      </div>
      <p className="text-gray-600 md:hidden mb-6 ">
        Manage student information and class enrollments
      </p>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {students.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No students yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first student
            </p>
            <Link href="/students/new">
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add First Student
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {students.map((student) => (
            <Card
              key={student.id}
              className="hover:shadow-md transition-shadow"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{student.name}</CardTitle>
                    <p className="text-sm text-gray-600">
                      Grade {student.grade}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {student.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="w-4 h-4 mr-2" />
                      {student.phone}
                    </div>
                  )}
                  {student.parent_name && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="w-4 h-4 mr-2" />
                      {student.parent_name}
                    </div>
                  )}
                  <div className="flex items-center text-sm text-gray-600">
                    <Users className="w-4 h-4 mr-2" />
                    {student.student_classes?.length || 0} classes enrolled
                  </div>
                </div>

                {/* Enrolled Classes */}
                {student.student_classes &&
                  student.student_classes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">
                        Enrolled Classes:
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {student.student_classes.map((enrollment, index) => (
                          <Badge
                            key={index}
                            variant="outline"
                            className="text-xs"
                          >
                            {enrollment.classes?.name}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                <div className="flex gap-2">
                  <Link href={`/students/${student.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      View Details
                    </Button>
                  </Link>
                  <Link href={`/students/${student.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteStudent(student.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
