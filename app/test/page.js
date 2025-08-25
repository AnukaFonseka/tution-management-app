'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function TestPage() {
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase.from('classes').select('count')
        if (error) throw error
        setConnected(true)
      } catch (err) {
        setError(err.message)
      }
    }
    testConnection()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Connection Test</h1>
      {connected ? (
        <p className="text-green-600">✅ Supabase connected successfully!</p>
      ) : error ? (
        <p className="text-red-600">❌ Connection failed: {error}</p>
      ) : (
        <p className="text-yellow-600">⏳ Testing connection...</p>
      )}
    </div>
  )
}