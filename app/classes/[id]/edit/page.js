// src/app/classes/[id]/edit/page.js
"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ClassForm from "@/components/ClassForm";

export default function EditClassPage() {
  const params = useParams();
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchClassData();
    }
  }, [params.id]);

  const fetchClassData = async () => {
    try {
      // Fetch class data
      const { data: classInfo, error: classError } = await supabase
        .from("classes")
        .select("*")
        .eq("id", params.id)
        .single();

      if (classError) throw classError;

      // Fetch class schedules
      const { data: schedules, error: schedulesError } = await supabase
        .from("class_schedules")
        .select("*")
        .eq("class_id", params.id)
        .order("day_of_week");

      if (schedulesError) throw schedulesError;

      // Combine class data with schedules
      const combinedData = {
        ...classInfo,
        schedules:
          schedules && schedules.length > 0
            ? schedules
            : [{ day_of_week: 1, start_time: "", duration: 60 }],
      };

      setClassData(combinedData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Class Not Found</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Edit Class</h1>
        <p className="text-gray-600">Update class information and settings</p>
      </div>

      <ClassForm initialData={classData} isEditing={true} />
    </div>
  );
}
