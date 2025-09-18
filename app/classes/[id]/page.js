// src/app/classes/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Edit,
  Trash2,
  Users,
  Calendar,
  Clock,
  DollarSign,
  ArrowLeft,
  FileText,
  Check,
  X,
  Info,
  InfoIcon,
} from "lucide-react";
import {
  getDayName,
  formatTime,
  formatDuration,
  renderClassSchedules,
} from "@/lib/utils";
import AssignmentManagement from "@/components/AssignmentManagement";

export default function ClassDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [classData, setClassData] = useState(null);
  const [students, setStudents] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    if (params.id) {
      fetchClassDetails();
    }
  }, [params.id, selectedMonth, selectedYear]);

  // Fetch all class-related data in one go
  const fetchClassDetails = async () => {
    try {
      // Get class details with schedules
      const { data: classInfo, error: classError } = await supabase
        .from("classes")
        .select(
          `
          *,
          class_schedules (
            id,
            day_of_week,
            start_time,
            duration
          )
        `
        )
        .eq("id", params.id)
        .single();

      if (classError) throw classError;

      // Get enrolled students
      const { data: enrolledStudents, error: studentsError } = await supabase
        .from("student_classes")
        .select(
          `
          students(*)
        `
        )
        .eq("class_id", params.id);

      if (studentsError) throw studentsError;

      // Get assignments with submissions
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select(
          `
          *,
          assignment_submissions (
            id,
            student_id,
            marks_obtained,
            submitted_at,
            remarks,
            students (
              id,
              name
            )
          )
        `
        )
        .eq("class_id", params.id)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      // Get current month's payments for this class
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("class_id", params.id)
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (paymentsError) throw paymentsError;

      setClassData(classInfo);
      setStudents(enrolledStudents.map((item) => item.students));
      setAssignments(assignmentsData || []);
      setPayments(paymentsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh assignments when needed (e.g., after creating/updating)
  const refreshAssignments = async () => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select(
          `
          *,
          assignment_submissions (
            id,
            student_id,
            marks_obtained,
            submitted_at,
            remarks,
            students (
              id,
              name
            )
          )
        `
        )
        .eq("class_id", params.id)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;
      setAssignments(assignmentsData || []);
    } catch (err) {
      setError(err.message);
    }
  };

  // Get payment status for a student
  const getStudentPaymentStatus = (studentId) => {
    const payment = payments.find((p) => p.student_id === studentId);
    return payment ? payment.status : "pending";
  };

  // Get payment ID for a student
  const getStudentPaymentId = (studentId) => {
    const payment = payments.find((p) => p.student_id === studentId);
    return payment ? payment.id : null;
  };

  // Create or update payment status
  const updatePaymentStatus = async (studentId, newStatus) => {
    try {
      const existingPayment = payments.find((p) => p.student_id === studentId);
      
      if (existingPayment) {
        // Update existing payment
        const updateData = {
          status: newStatus,
          ...(newStatus === "paid"
            ? { paid_at: new Date().toISOString() }
            : { paid_at: null }),
        };

        const { error } = await supabase
          .from("payments")
          .update(updateData)
          .eq("id", existingPayment.id);

        if (error) throw error;

        // Update local state
        setPayments(
          payments.map((payment) =>
            payment.id === existingPayment.id
              ? { ...payment, ...updateData }
              : payment
          )
        );
      } else {
        // Create new payment record
        const newPayment = {
          student_id: studentId,
          class_id: params.id,
          month: selectedMonth,
          year: selectedYear,
          amount: classData.fee,
          status: newStatus,
          ...(newStatus === "paid"
            ? { paid_at: new Date().toISOString() }
            : { paid_at: null }),
        };

        const { data, error } = await supabase
          .from("payments")
          .insert([newPayment])
          .select()
          .single();

        if (error) throw error;

        // Add to local state
        setPayments([...payments, data]);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  // Get payment status badge
  const getPaymentStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return (
          <Badge className="bg-green-100 text-green-800 text-xs">
            <Check className="w-3 h-3 inline-block" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-50 text-yellow-600 text-xs">
            <InfoIcon className="w-3 h-3 inline-block" />
            Pending
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-100 text-red-800 text-xs">
            Overdue
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-50 text-yellow-600 text-xs">
            Pending
          </Badge>
        );
    }
  };

  const deleteClass = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this class? This will also remove all student enrollments and payment records."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", params.id);

      if (error) throw error;

      router.push("/classes");
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

  if (!classData) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Class Not Found
          </h1>
          <Link href="/classes">
            <Button>Back to Classes</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Get current month name
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  const currentMonthName = months[selectedMonth - 1];

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/classes" className="hidden md:inline-block">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Classes
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {classData.name}
            </h1>
            <div className="flex flex-wrap gap-1">
              {(classData.grades || []).map((grade) => (
                <Badge key={grade} variant="outline" className="text-xs">
                  Grade {grade}
                </Badge>
              ))}
            </div>
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
                  <p className="font-medium">Schedules</p>
                  <p className="text-sm text-gray-600 flex flex-col">
                    {renderClassSchedules(classData.class_schedules)}
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
                  <p className="text-sm text-gray-600">
                    {students.length} students
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-center md:text-start">Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  Rs. {(classData.fee * students.length).toFixed(2)}
                </p>
                <p className="text-sm text-gray-600">
                  Potential Monthly Revenue
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Area with Tabs */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="students" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="students" className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                Students ({students.length})
              </TabsTrigger>
              <TabsTrigger
                value="assignments"
                className="flex items-center gap-2"
              >
                <FileText className="w-4 h-4" />
                Assignments ({assignments.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="students" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Enrolled Students ({students.length})</span>
                    <Link href="/students/new">
                      <Button size="sm">
                        <span className="text-xs md:text-sm">Add New Student</span>
                      </Button>
                    </Link>
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-2">
                    Payment status for {currentMonthName} {selectedYear}
                  </p>
                </CardHeader>
                <CardContent>
                  {students.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        No students enrolled
                      </h3>
                      <p className="text-gray-600 mb-4">
                        This class doesn&apos;t have any students yet.
                      </p>
                      <Link href="/students/new">
                        <Button>Add First Student</Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {students.map((student) => {
                        const paymentStatus = getStudentPaymentStatus(student.id);
                        return (
                          <div
                            key={student.id}
                            className="p-4 border rounded-lg hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <h4 className="font-medium">{student.name}</h4>
                                    <p className="text-sm text-gray-600">
                                      Grade {student.grade}
                                    </p>
                                    {student.phone && (
                                      <p className="text-sm text-gray-500">
                                        {student.phone}
                                      </p>
                                    )}
                                  </div>
                                  <div className="ml-4 hidden md:block">
                                    {getPaymentStatusBadge(paymentStatus)}
                                  </div>
                                </div>
                              </div>
                              <div className="flex flex-col md:flex-row items-end md:items-center md:space-x-2 space-y-1 md:space-y-0">
                                <div className="ml-4 md:hidden">
                                  {getPaymentStatusBadge(paymentStatus)}
                                </div>
                                {/* Payment Action Button */}
                                {paymentStatus !== "paid" ? (
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      updatePaymentStatus(student.id, "paid")
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                  >
                                    {/* <Check className="w-4 h-4 mr-1" /> */}
                                    Mark Paid
                                  </Button>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      updatePaymentStatus(student.id, "pending")
                                    }
                                    className="text-gray-600"
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Undo
                                  </Button>
                                )}
                                
                                {/* View Student Button */}
                                <Link href={`/students/${student.id}`} className="hidden md:inline-block">
                                  <Button size="sm" variant="outline">
                                    View
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="assignments" className="mt-6">
              <AssignmentManagement
                classId={classData.id}
                classData={classData}
                assignments={assignments}
                onAssignmentsChange={refreshAssignments}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}