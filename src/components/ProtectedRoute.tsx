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
  const { user, userProfile, loading: authLoading } = useAuth()
  const { hasPermission, loading: permissionsLoading } = usePermissions()

  const loading = authLoading || permissionsLoading

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

  // Si no hay perfil de usuario después de cargar, mostrar error
  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-8 h-8 text-red-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error de Perfil</h2>
          <p className="text-gray-600 mb-4">
            No se pudo cargar tu perfil de usuario. Esto puede deberse a un problema de configuración.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-yellow-700">
              Usuario autenticado: <span className="font-mono">{user.email}</span>
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              ID de usuario: <span className="font-mono text-xs">{user.id}</span>
            </p>
          </div>
          <div className="space-y-2">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
            >
              Reintentar
            </button>
            <button
              onClick={() => {
                localStorage.clear()
                window.location.href = '/login'
              }}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Check module-specific permissions
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
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <div className="text-left">
                <p className="text-sm font-medium text-yellow-800">
                  Información de acceso:
                </p>
                <p className="text-sm text-yellow-700">
                  Usuario: <span className="font-mono">{userProfile.email}</span>
                </p>
                <p className="text-sm text-yellow-700">
                  Rol actual: <span className="font-mono capitalize">{userProfile.role}</span>
                </p>
                <p className="text-sm text-yellow-700">
                  Módulo requerido: <span className="font-mono">{requiredModule}</span>
                </p>
                <p className="text-sm text-yellow-700">
                  Acción requerida: <span className="font-mono">{requiredAction}</span>
                </p>
              </div>
            </div>
          </div>
          <p className="text-sm text-gray-500">
            Contacta al administrador si necesitas acceso a este módulo.
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}