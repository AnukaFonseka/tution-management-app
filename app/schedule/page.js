// src/app/schedule/page.js
"use client";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Users,
  BookOpen,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  DAYS_OF_WEEK,
  formatTime,
  formatDuration,
  getGradeLabels,
} from "@/lib/utils";
import Link from "next/link";

export default function SchedulePage() {
  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [potentialRevenue, setPotentialRevenue] = useState(0);
  const [selectedDayIndex, setSelectedDayIndex] = useState(new Date().getDay()); // Start with today

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      // First get class schedules with class data
      const { data: schedulesData, error: schedulesError } = await supabase
        .from("class_schedules")
        .select(
          `
          *,
          classes!inner(
            id,
            name,
            class_grades!inner(
              grades(id, name, display_order)
            ),
            class_subjects!inner(
              subjects(id, name)
            ),
            class_type,
            fee,
            subject_ids,
            student_classes(
              students(name)
            )
          )
        `
        )
        .order("day_of_week")
        .order("start_time");

      if (schedulesError) throw schedulesError;

      // Get potential revenue for current month
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();

      // Alternatively, use a RPC to calculate total revenue
      const { data, error } = await supabase.rpc("total_revenue", {
        month: currentMonth,
        year: currentYear,
      });

      if (error) throw error;
      setPotentialRevenue(data || 0);

      // Merge subject data with schedules
      const schedulesWithSubjects = schedulesData

      setSchedules(schedulesWithSubjects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const groupSchedulesByDay = () => {
    const grouped = {};
    DAYS_OF_WEEK.forEach((day) => {
      grouped[day.value] = schedules.filter(
        (schedule) => schedule.day_of_week === day.value
      );
    });
    return grouped;
  };

  const getStudentCount = (classData) => {
    return classData.student_classes?.length || 0;
  };

  const getTotalStats = () => {
    const totalSchedules = schedules.length;
    const totalStudents = schedules.reduce(
      (total, schedule) => total + getStudentCount(schedule.classes),
      0
    );
    const totalDuration = schedules.reduce(
      (total, schedule) => total + schedule.duration,
      0
    );
    const totalRevenue = potentialRevenue;

    return { totalSchedules, totalStudents, totalDuration, totalRevenue };
  };

  const formatDuration = (minutes) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hrs > 0 && mins > 0) {
      return `${hrs}h ${mins}m`;
    } else if (hrs > 0) {
      return `${hrs}h`;
    } else {
      return `${mins}m`;
    }
  };

  // Mobile navigation functions
  const goToPreviousDay = () => {
    setSelectedDayIndex((prev) => (prev === 0 ? 6 : prev - 1));
  };

  const goToNextDay = () => {
    setSelectedDayIndex((prev) => (prev === 6 ? 0 : prev + 1));
  };

  const getCurrentDay = () => {
    return DAYS_OF_WEEK.find((day) => day.value === selectedDayIndex);
  };

  // Render single class schedule item
  const renderClassScheduleItem = (schedule) => {
    const classData = schedule.classes;
    return (
      <div
        key={schedule.id}
        className="p-3 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
      >
        <Link href={`/classes/${schedule.classes.id}`}>
          <div className="space-y-2">
            <div>
              <h4 className="font-medium text-blue-900">{classData.name}</h4>
              <div className="flex items-center gap-2 text-xs text-blue-700">
                <span>{getGradeLabels(classData.class_grades).join(", ")}</span>
                <Badge variant="secondary" className="text-xs">
                  {classData.class_type}
                </Badge>
              </div>
            </div>

            <div className="flex items-center text-xs text-blue-600">
              <Clock className="w-3 h-3 mr-1" />
              {formatTime(schedule.start_time)}
            </div>

            <div className="flex items-center text-xs text-blue-600">
              <BookOpen className="w-3 h-3 mr-1" />
              {formatDuration(schedule.duration)}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center text-xs text-blue-600">
                <Users className="w-3 h-3 mr-1" />
                {getStudentCount(classData)} students
              </div>
              <Badge variant="outline" className="text-xs">
                Rs. {classData.fee}
              </Badge>
            </div>

            {/* Subject names */}
            {classData.class_subjects && classData.class_subjects.length > 0 && (
              <div className="text-xs text-blue-600">
                <span className="font-medium">Subjects: </span>
                {classData.class_subjects.map((subject) => subject.subjects.name).join(", ")}
              </div>
            )}
          </div>
        </Link>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const schedulesGroupedByDay = groupSchedulesByDay();
  const stats = getTotalStats();
  const currentDay = getCurrentDay();
  const currentDaySchedules = schedulesGroupedByDay[selectedDayIndex] || [];

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Class Schedule</h1>
        <p className="text-gray-600">Weekly schedule overview of all classes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
          {error}
        </div>
      )}

      {schedules.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Calendar className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No classes scheduled
            </h3>
            <p className="text-gray-600">
              Create some classes and schedules to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View - Single Card with Day Navigation */}
          <div className="block lg:hidden mb-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToPreviousDay}
                    className="p-2"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>

                  <CardTitle className="text-center text-xl">
                    {currentDay?.label}
                  </CardTitle>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goToNextDay}
                    className="p-2"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>

                {/* Day indicator dots */}
                <div className="flex justify-center mt-3 gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => setSelectedDayIndex(day.value)}
                      className={`w-2 h-2 rounded-full transition-colors ${
                        selectedDayIndex === day.value
                          ? "bg-blue-600"
                          : "bg-gray-300"
                      }`}
                      aria-label={`Go to ${day.label}`}
                    />
                  ))}
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {currentDaySchedules.length === 0 ? (
                  <p className="text-center text-gray-500 text-sm py-8">
                    No classes scheduled for {currentDay?.label}
                  </p>
                ) : (
                  currentDaySchedules.map((schedule) =>
                    renderClassScheduleItem(schedule)
                  )
                )}
              </CardContent>
            </Card>
          </div>

          {/* Desktop View - Grid Layout */}
          <div className="hidden lg:grid lg:grid-cols-7 gap-4">
            {DAYS_OF_WEEK.map((day) => (
              <Card key={day.value} className="h-fit">
                <CardHeader className="pb-3">
                  <CardTitle className="text-center text-lg">
                    {day.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {schedulesGroupedByDay[day.value].length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-4">
                      No classes
                    </p>
                  ) : (
                    schedulesGroupedByDay[day.value].map((schedule) =>
                      renderClassScheduleItem(schedule)
                    )
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* Summary Stats */}
      {schedules.length > 0 && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Weekly Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="text-2xl font-bold text-blue-600">
                  {stats.totalSchedules}
                </h3>
                <p className="text-sm text-blue-600">Total Class Sessions</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="text-2xl font-bold text-green-600">
                  {stats.totalStudents}
                </h3>
                <p className="text-sm text-green-600">Total Enrollments</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="text-2xl font-bold text-purple-600">
                  {formatDuration(stats.totalDuration)}
                </h3>
                <p className="text-sm text-purple-600">Weekly Teaching Time</p>
              </div>

              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <h3 className="text-2xl font-bold text-yellow-600">
                  Rs. {stats.totalRevenue}
                </h3>
                <p className="text-sm text-yellow-600">
                  Potential Monthly Revenue
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
