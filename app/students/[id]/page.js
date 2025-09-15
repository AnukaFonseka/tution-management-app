// src/app/students/[id]/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Phone, User, ArrowLeft, Check, X } from "lucide-react";
import { getDayName, formatTime } from "@/lib/utils";

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const [student, setStudent] = useState(null);
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchStudentDetails();
    }
  }, [params.id]);

  const fetchStudentDetails = async () => {
    try {
      // Get student details
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*")
        .eq("id", params.id)
        .single();

      if (studentError) throw studentError;

      // Get enrolled classes
      const { data: classesData, error: classesError } = await supabase
        .from("student_classes")
        .select(
          `
          classes(*)
        `
        )
        .eq("student_id", params.id);

      if (classesError) throw classesError;

      // Get payment history (last 12 months)
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select(
          `
          *,
          classes(name)
        `
        )
        .eq("student_id", params.id)
        .order("year", { ascending: false })
        .order("month", { ascending: false })
        .limit(12);

      if (paymentsError) throw paymentsError;

      setStudent(studentData);
      setEnrolledClasses(classesData.map((item) => item.classes));
      setPaymentHistory(paymentsData || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteStudent = async () => {
    if (
      !confirm(
        "Are you sure you want to delete this student? This will also remove all class enrollments and payment records."
      )
    ) {
      return;
    }

    try {
      const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", params.id);

      if (error) throw error;

      router.push("/students");
    } catch (err) {
      setError(err.message);
    }
  };

  const updatePaymentStatus = async (paymentId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        ...(newStatus === "paid"
          ? { paid_at: new Date().toISOString() }
          : { paid_at: null }),
      };

      const { error } = await supabase
        .from("payments")
        .update(updateData)
        .eq("id", paymentId);

      if (error) throw error;

      // Update local state
      setPaymentHistory(
        paymentHistory.map((payment) =>
          payment.id === paymentId ? { ...payment, ...updateData } : payment
        )
      );
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-green-100 text-green-800">Paid</Badge>;
      case "pending":
        return <Badge variant="outline">Pending</Badge>;
      case "overdue":
        return <Badge className="bg-red-100 text-red-800">Overdue</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getMonthName = (month) => {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    return months[month - 1];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Student Not Found
          </h1>
          <Link href="/students">
            <Button>Back to Students</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center space-x-4">
          <Link href="/students">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Students
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{student.name}</h1>
            <p className="text-gray-600">Grade {student.grade}</p>
          </div>
        </div>

        <div className="flex space-x-2">
          <Link href={`/students/${student.id}/edit`}>
            <Button variant="outline">
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={deleteStudent}
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
        {/* Student Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Student Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">Name</p>
                <p className="text-gray-600">{student.name}</p>
              </div>

              <div>
                <p className="font-medium">Grade</p>
                <p className="text-gray-600">{student.grade}</p>
              </div>

              {student.phone && (
                <div className="flex items-center">
                  <Phone className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium">Phone</p>
                    <p className="text-gray-600">{student.phone}</p>
                  </div>
                </div>
              )}

              {student.parent_name && (
                <div className="flex items-center">
                  <User className="w-4 h-4 text-gray-400 mr-2" />
                  <div>
                    <p className="font-medium">Parent/Guardian</p>
                    <p className="text-gray-600">{student.parent_name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enrolled Classes */}
          <Card>
            <CardHeader>
              <CardTitle>Enrolled Classes ({enrolledClasses.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {enrolledClasses.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No classes enrolled
                </p>
              ) : (
                <div className="space-y-3">
                  {enrolledClasses.map((classItem) => (
                    <div key={classItem.id} className="p-3 border rounded-lg">
                      <h4 className="font-medium">{classItem.name}</h4>
                      <p className="text-sm text-gray-600">
                        Grade {classItem.grade}
                      </p>
                      <p className="text-sm text-gray-600">
                        {getDayName(classItem.day_of_week)} at{" "}
                        {formatTime(classItem.start_time)}
                      </p>
                      <Badge variant="outline" className="mt-2">
                        Rs. {classItem.fee}/month
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Payment History</CardTitle>
            </CardHeader>
            <CardContent>
              {paymentHistory.length === 0 ? (
                <div className="text-center py-8">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No payment records
                  </h3>
                  <p className="text-gray-600">
                    Payment records will appear here once classes are assigned.
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month/Year</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <p className="font-medium">
                            {getMonthName(payment.month)} {payment.year}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p>{payment.classes?.name}</p>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">Rs. {payment.amount}</p>
                        </TableCell>
                        <TableCell>{getStatusBadge(payment.status)}</TableCell>
                        <TableCell>
                          {payment.paid_at ? (
                            <p className="text-sm">
                              {new Date(payment.paid_at).toLocaleDateString()}
                            </p>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {payment.status !== "paid" && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  updatePaymentStatus(payment.id, "paid")
                                }
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="w-3 h-3 mr-1" />
                                Mark Paid
                              </Button>
                            )}
                            {payment.status === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updatePaymentStatus(payment.id, "pending")
                                }
                              >
                                <X className="w-3 h-3 mr-1" />
                                Unpaid
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
