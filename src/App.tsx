import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Patients from './pages/Patients'
import Appointments from './pages/Appointments'
import Services from './pages/Services'
import Payments from './pages/Payments'
import Reports from './pages/Reports'
import Import from './pages/Import'
import Roles from './pages/Roles'
import Users from './pages/Users'
import ConnectionTest from './pages/ConnectionTest'
import Workflow from './pages/Workflow'
import DatabaseTest from './pages/DatabaseTest'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route 
                      path="/" 
                      element={
                        <ProtectedRoute requiredModule="dashboard">
                          <Dashboard />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/patients" 
                      element={
                        <ProtectedRoute requiredModule="patients">
                          <Patients />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/appointments" 
                      element={
                        <ProtectedRoute requiredModule="appointments">
                          <Appointments />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/services" 
                      element={
                        <ProtectedRoute requiredModule="services">
                          <Services />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/payments" 
                      element={
                        <ProtectedRoute requiredModule="payments">
                          <Payments />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/reports" 
                      element={
                        <ProtectedRoute requiredModule="reports">
                          <Reports />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/import" 
                      element={
                        <ProtectedRoute requiredModule="import">
                          <Import />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/roles" 
                      element={
                        <ProtectedRoute requiredModule="roles">
                          <Roles />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/users" 
                      element={
                        <ProtectedRoute requiredModule="users">
                          <Users />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/workflow" 
                      element={
                        <ProtectedRoute requiredModule="dashboard">
                          <Workflow />
                        </ProtectedRoute>
                      } 
                    />
                    <Route 
                      path="/connection-test" 
                      element={<ConnectionTest />} 
                    />
                    <Route 
                      path="/database-test" 
                      element={
                        <ProtectedRoute requiredModule="testing">
                          <DatabaseTest />
                        </ProtectedRoute>
                      } 
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App