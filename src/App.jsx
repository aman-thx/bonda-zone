import React, { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LanguageProvider } from './context/LanguageContext'
import Login from './pages/Login'
import CashierDashboard from './pages/CashierDashboard'
import OwnerDashboard from './pages/OwnerDashboard'
import { supabase } from './lib/supabase'

function AppRoutes() {
  const { user, loading } = useAuth()
  const [userRole, setUserRole] = useState(null)
  const [roleLoading, setRoleLoading] = useState(true)

  useEffect(() => {
    async function fetchUserRole() {
      if (!user) {
        setRoleLoading(false)
        return
      }

      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single()

        if (!error && data) {
          setUserRole(data.role)
        } else {
          setUserRole('cashier')
        }
      } catch (error) {
        console.error('Error fetching user role:', error)
        setUserRole('cashier')
      } finally {
        setRoleLoading(false)
      }
    }

    fetchUserRole()
  }, [user])

  if (loading || roleLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/dashboard" />} />
      <Route 
        path="/dashboard" 
        element={
          user ? (
            userRole === 'owner' ? <OwnerDashboard /> : <CashierDashboard />
          ) : (
            <Navigate to="/login" />
          )
        } 
      />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <LanguageProvider>
        <Router>
          <AppRoutes />
        </Router>
      </LanguageProvider>
    </AuthProvider>
  )
}

export default App