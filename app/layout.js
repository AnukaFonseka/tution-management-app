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
        <div className=" bg-gray-50 overflow-y-auto min-h-[105vh]">
          <Navigation />
          <main className="md:py-15 md:px-20">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}