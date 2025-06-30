import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { usePermissions } from '../hooks/usePermissions'
import { AlertCircle, Shield } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredModule?: string
  requiredAction?: string
}

export default function ProtectedRoute({ 
  children, 
  requiredModule,
  requiredAction = 'read'
}: ProtectedRouteProps) {
  const { user, userProfile, loading } = useAuth()
  const { hasPermission } = usePermissions()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error de Usuario</h2>
          <p className="text-gray-600 mb-4">
            No se pudo cargar tu perfil. Intenta recargar la página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
          >
            Recargar
          </button>
        </div>
      </div>
    )
  }

  if (requiredModule && !hasPermission(requiredModule, requiredAction)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
          <p className="text-gray-600 mb-4">
            No tienes permisos para acceder a esta página.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-800">
              Tu rol actual: <span className="font-mono capitalize">{userProfile.role}</span>
            </p>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}