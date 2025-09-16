// src/app/page.js
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, BookOpen, CreditCard, Calendar, TrendingUp,  } from 'lucide-react'
import Link from "next/link";
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
    const { data, error } = await supabase.rpc('get_dashboard_data')
    
    if (error) throw error
    
    setStats(data.stats)
    setTodaysClasses(data.todaysClasses)
    setRecentPayments(data.recentPayments)
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
    <div className="mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome back! Here&apos;s your tuition center overview.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 md:grid-cols-3 lg:grid-cols-3 gap-6 mb-8">
        <Card className="justify-center md:justify-start">
          <CardHeader className="hidden md:flex flex-row items-center justify-between space-y-0 md:pb-2">
            <CardTitle className="text-sm font-medium">Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center md:text-start" >
            <div className="text-xl md:text-2xl font-bold">{stats.totalClasses}</div>
            <p className="text-xs md:text-sm font-medium text-gray-600 md:hidden">Classes</p>
          </CardContent>
        </Card>

        <Card className="justify-center md:justify-start">
          <CardHeader className="hidden md:flex flex-row items-center justify-between space-y-0 md:pb-2">
            <CardTitle className="text-sm font-medium">Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center md:text-start">
            <div className="text-xl md:text-2xl font-bold">{stats.totalStudents}</div>
            <p className="text-xs md:text-sm font-medium text-gray-600 md:hidden">Students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="hidden md:flex flex-row items-center justify-between space-y-0 md:pb-2">
            <CardTitle className="md:flex text-sm font-medium">Pending<span className='hidden md:block'>&nbsp;Payments</span></CardTitle>
            <CreditCard className="hidden md:block h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent className="text-center md:text-start">
            <div className="text-xl md:text-2xl font-bold">{stats.pendingPayments}</div>
            <p className="text-xs md:text-sm font-medium text-gray-600 md:hidden">Students</p>
          </CardContent>
        </Card>

        {/* <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 md:pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <TrendingUp className="hidden md:block h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">Rs. {stats.totalRevenue}</div>
          </CardContent>
        </Card> */}
      </div>
      <div className="w-full text-center mb-6">
        <p className="text-xs md:text-sm font-medium text-gray-600">Revenue</p>
        <p className="text-lg md:text-2xl font-bold">
          Rs. {stats.totalRevenue.toFixed(2)}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Today&apos;s Schedule ({getDayName(new Date().getDay())})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {todaysClasses.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No classes scheduled for today</p>
            ) : (
              <div className="space-y-3">
                {todaysClasses.map((classItem) => (
                  <Link href={`/classes/${classItem.classes.id}`} key={classItem.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium">{classItem.classes.name}</h4>
                      <p className="text-sm text-gray-600">Grade {classItem.classes.grades}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatTime(classItem.start_time)}</p>
                      {/* <Badge variant="outline">Rs. {classItem.classes.fee}</Badge> */}
                      <div className="flex items-center text-sm text-gray-600">
                        <Users className="w-4 h-4 mr-2" />
                        {classItem.classes.student_classes?.[0]?.count || 0}
                      </div>
                    </div>
                  </Link>
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
                  <Link href={`/students/${payment.students.id}`} key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
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
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}