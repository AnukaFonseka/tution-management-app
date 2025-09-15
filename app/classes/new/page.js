// src/app/classes/new/page.js
import ClassForm from "@/components/ClassForm";

export default function NewClassPage() {
  return (
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create New Class</h1>
        <p className="text-gray-600">
          Add a new tuition class to your schedule
        </p>
      </div>

      <ClassForm />
    </div>
  );
}
