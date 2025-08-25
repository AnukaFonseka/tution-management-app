// src/app/layout.js
import { Inter } from 'next/font/google'
import './globals.css'
import Navigation from '@/components/Navigation'

const inter = Inter({ subsets: ['latin'] })

export const metadata = {
  title: 'Tuition Management System',
  description: 'Manage classes, students, and payments for tuition center',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gray-50">
          <Navigation />
          <main className="pb-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}