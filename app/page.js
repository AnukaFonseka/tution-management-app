// src/app/page.js
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Users, BookOpen, CreditCard, Calendar, TrendingUp } from 'lucide-react'
import { getDayName, formatTime } from '@/lib/utils'

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalStudents: 0,
    pendingPayments: 0,
    totalRevenue: 0
  })
  const [todaysClasses, setTodaysClasses] = useState([])
  const [recentPayments, setRecentPayments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Get total classes
      const { count: classesCount } = await supabase
        .from('classes')
        .select('*', { count: 'exact', head: true })

      // Get total students
      const { count: studentsCount } = await supabase
        .from('students')
        .select('*', { count: 'exact', head: true })

      // Get pending payments for current month
      const currentMonth = new Date().getMonth() + 1
      const currentYear = new Date().getFullYear()
      
      const { count: pendingCount } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('status', 'pending')

      // Get total revenue for current month
      const { data: paidPayments } = await supabase
        .from('payments')
        .select('amount')
        .eq('month', currentMonth)
        .eq('year', currentYear)
        .eq('status', 'paid')

      const totalRevenue = paidPayments?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0

      // Get today's classes
      const today = new Date().getDay()
      const { data: schedulesData, error } = await supabase
        .from("class_schedules")
        .select(`
          id,
          day_of_week,
          start_time,
          duration,
          classes (
            id,
            name,
            grades,
            fee
          )
        `)
        .eq("day_of_week", today)
        .order("start_time");

      if (error) {
        console.error(error);
      } else {
        console.log(schedulesData);
      }

      // Get all subject data
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, name')

      if (subjectsError) throw subjectsError

      // Merge subject data with schedules
      const schedulesWithSubjects = schedulesData.map(schedule => ({
        ...schedule,
        classes: {
          ...schedule.classes,
          subjects: schedule.classes.subject_ids?.map(subjectId => 
            subjectsData.find(subject => subject.id === subjectId)
          ).filter(Boolean) || []
        }
      }))

      // Get recent payments (last 5)
      const { data: paymentsData } = await supabase
        .from('payments')
        .select(`
          *,
          students(name),
          classes(name)
        `)
        .eq('status', 'paid')
        .order('paid_at', { ascending: false })
        .limit(5)

      setStats({
        totalClasses: classesCount || 0,
        totalStudents: studentsCount || 0,
        pendingPayments: pendingCount || 0,
        totalRevenue
      })
      
      setTodaysClasses(schedulesWithSubjects || [])
      setRecentPayments(paymentsData || [])
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s your tuition center overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalClasses}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStudents}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingPayments}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Rs. {stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Today&apos;s Classes ({getDayName(new Date().getDay())})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysClasses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No classes scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map((classItem) => (
                  <div key={classItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{classItem.classes.name}</h4>
                      <p className="text-sm text-gray-600">Grade {classItem.classes.grades}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatTime(classItem.start_time)}</p>
                      <Badge variant="outline">Rs. {classItem.classes.fee}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CreditCard className="w-5 h-5 mr-2" />
              Recent Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{payment.students?.name}</h4>
                      <p className="text-sm text-gray-600">{payment.classes?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">Rs. {payment.amount}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(payment.paid_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}