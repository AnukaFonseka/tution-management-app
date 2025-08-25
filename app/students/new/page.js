// src/app/students/new/page.js
import StudentForm from '@/components/StudentForm'

export default function NewStudentPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Add New Student</h1>
        <p className="text-gray-600">Add a new student and assign them to classes</p>
      </div>
      
      <StudentForm />
    </div>
  )
}