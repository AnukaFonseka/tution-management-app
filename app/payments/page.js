// src/app/payments/page.js
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Check,
  X,
  DollarSign,
  Calendar,
  Filter,
  CircleCheck,
  Info,
} from "lucide-react";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [statusFilter, setStatusFilter] = useState("all");

  const months = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];

  const years = Array.from(
    { length: 5 },
    (_, i) => new Date().getFullYear() - 2 + i
  );

  useEffect(() => {
    fetchPayments();
  }, [selectedMonth, selectedYear, statusFilter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("payments")
        .select(
          `
          *,
          students(name, phone),
          classes(name, fee)
        `
        )
        .eq("month", selectedMonth)
        .eq("year", selectedYear);

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      const { data, error } = await query.order("students(name)");

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      setPayments(
        payments.map((payment) =>
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
        return (
          <Badge className="bg-green-100 text-green-800 text-sm rounded-full flex items-center gap-1">
            <CircleCheck className="w-4 h-4" /> Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge className="bg-yellow-50 text-yellow-600 text-sm rounded-full flex items-center gap-1">
            <Info className="w-4 h-4" /> Pending
          </Badge>
        );
      case "overdue":
        return (
          <Badge className="bg-red-100 text-red-800 text-sm rounded-full">
            Overdue
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const stats = {
    total: payments.length,
    paid: payments.filter((p) => p.status === "paid").length,
    pending: payments.filter((p) => p.status === "pending").length,
    overdue: payments.filter((p) => p.status === "overdue").length,
    totalAmount: payments.reduce((sum, p) => sum + parseFloat(p.amount), 0),
    paidAmount: payments
      .filter((p) => p.status === "paid")
      .reduce((sum, p) => sum + parseFloat(p.amount), 0),
  };

  // Mobile Payment Card Component
  const PaymentCard = ({ payment }) => (
    <Card className="mb-4 pb-2 pt-4">
      <CardContent className="">
        <div className="flex justify-between mt-0">
          <p className="font-semibold text-lg">{payment.students?.name}</p>
          {getStatusBadge(payment.status)}
        </div>
        <div className="grid grid-cols-2 gap-4">
          {/* Left Column - Student & Payment Details */}

          <div className="space-y-2">
            <div className="justify-between">
              <p className="text-sm text-gray-600">{payment.classes?.name}</p>
              <p className="text-sm text-gray-500">
                Grade {payment.students?.grade}
              </p>
            </div>
          </div>

          {/* Right Column - Action Buttons */}
          <div className="flex flex-col justify-center items-end space-y-2">
            <div>
              <p className="font-bold text-lg ">Rs. {payment.amount}</p>
            </div>
            {payment.status !== "paid" ? (
              <Button
                size="sm"
                onClick={() => updatePaymentStatus(payment.id, "paid")}
                className="bg-green-600 hover:bg-green-700 text-white w-full"
              >
                <Check className="w-4 h-4 mr-1" />
                Paid
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                onClick={() => updatePaymentStatus(payment.id, "pending")}
                className="text-gray-600 w-full"
              >
                <X className="w-4 h-4 mr-1" />
                Undo
              </Button>
            )}
          </div>
        </div>
        <div className="mt-2 w-full">
          {payment.paid_at && (
            <p className="text-xs text-gray-500 text-center">
              Paid: {new Date(payment.paid_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payment Tracking</h1>
          <p className="text-gray-600">
            Monitor student payments and payment status
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Month</label>
              <Select
                value={selectedMonth.toString()}
                onValueChange={(value) => setSelectedMonth(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((month) => (
                    <SelectItem
                      key={month.value}
                      value={month.value.toString()}
                    >
                      {month.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Year</label>
              <Select
                value={selectedYear.toString()}
                onValueChange={(value) => setSelectedYear(parseInt(value))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="p-1">
            <div className="flex items-center">
              {/* <DollarSign className="h-6 w-6 md:h-8 md:w-8 text-blue-600" /> */}
              <div className="text-center w-full">
                <p className="text-lg md:text-2xl font-bold">{stats.total}</p>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Payments
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-1">
            <div className="flex items-center">
              {/* <Check className="h-6 w-6 md:h-8 md:w-8 text-green-600" /> */}
              <div className="text-center w-full">
                <p className="text-lg md:text-2xl font-bold">{stats.paid}</p>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Paid
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-1">
            <div className="flex items-center">
              {/* <Calendar className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" /> */}
              <div className="text-center w-full">
                <p className="text-lg md:text-2xl font-bold">{stats.pending}</p>
                <p className="text-xs md:text-sm font-medium text-gray-600">
                  Pending
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="w-full text-center mb-6">
        <p className="text-xs md:text-sm font-medium text-gray-600">Revenue</p>
        <p className="text-lg md:text-2xl font-bold">
          Rs. {stats.paidAmount.toFixed(2)}
        </p>
      </div>

      {/* Payments */}
      <Card>
        <CardHeader>
          <CardTitle>
            Payments for {months.find((m) => m.value === selectedMonth)?.label}{" "}
            {selectedYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No payments found
              </h3>
              <p className="text-gray-600">
                No payment records for the selected month and filters.
              </p>
            </div>
          ) : (
            <>
              {/* Mobile View - Cards */}
              <div className="block md:hidden">
                {payments.map((payment) => (
                  <PaymentCard key={payment.id} payment={payment} />
                ))}
              </div>

              {/* Desktop View - Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Paid Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {payment.students?.name}
                            </p>
                            <p className="text-sm text-gray-600">
                              Grade {payment.students?.grade}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-medium">{payment.classes?.name}</p>
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
                                variant="outline"
                                onClick={() =>
                                  updatePaymentStatus(payment.id, "paid")
                                }
                                className="text-green-800 border-green-800 hover:bg-green-100 cursor-pointer"
                              >
                                Mark as paid
                              </Button>
                            )}
                            {payment.status === "paid" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  updatePaymentStatus(payment.id, "pending")
                                }
                                className="underline text-xs cursor-pointer text-gray-500"
                              >
                                Undo
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
