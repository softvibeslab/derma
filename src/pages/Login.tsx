import React, { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Scissors, Eye, EyeOff, AlertCircle, ExternalLink, Users, Settings, Key } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showSetupGuide, setShowSetupGuide] = useState(false)
  const { user, signIn } = useAuth()

  if (user) {
    return <Navigate to="/" replace />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await signIn(email, password)
    
    if (error) {
      if (error.message?.includes('Invalid login credentials')) {
        setError('Credenciales inválidas. Los usuarios de prueba pueden no estar configurados correctamente.')
        setShowSetupGuide(true)
      } else {
        setError(`Error de autenticación: ${error.message}`)
      }
    }
    
    setLoading(false)
  }

  const fillTestCredentials = (role: 'admin' | 'cajero' | 'cosmetologa') => {
    const credentials = {
      admin: { email: 'admin@dermacielo.com', password: 'admin123' },
      cajero: { email: 'cajero@dermacielo.com', password: 'cajero123' },
      cosmetologa: { email: 'cosmetologa@dermacielo.com', password: 'cosmetologa123' }
    }
    
    setEmail(credentials[role].email)
    setPassword(credentials[role].password)
    setError('')
    setShowSetupGuide(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-pink-50 via-purple-50 to-indigo-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Scissors className="w-8 h-8 text-white" />
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">
            Bienvenido a Dermacielo
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sistema de gestión para depilación láser con tecnología Sopranoice
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  <span className="text-sm text-red-700 font-medium">Error de Autenticación</span>
                </div>
                <p className="text-sm text-red-700 mb-3">{error}</p>
                
                {showSetupGuide && (
                  <div className="border-t border-red-200 pt-3 mt-3">
                    <p className="text-sm text-red-700 font-medium mb-2">Pasos para resolver:</p>
                    <ol className="text-xs text-red-600 space-y-1 list-decimal list-inside">
                      <li>Verifica que los usuarios de prueba estén creados en Supabase</li>
                      <li>Desactiva las confirmaciones por email en Supabase</li>
                      <li>Confirma que las variables de entorno sean correctas</li>
                      <li>Reinicia el servidor de desarrollo</li>
                    </ol>
                    <a 
                      href="https://supabase.com/dashboard" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center space-x-1 text-xs text-red-600 hover:text-red-800 mt-2"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Abrir Dashboard de Supabase</span>
                    </a>
                  </div>
                )}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                'Iniciar Sesión'
              )}
            </button>
          </form>

          {/* Test Credentials Section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-3">Credenciales de Prueba:</p>
            <div className="grid grid-cols-1 gap-2">
              <button
                type="button"
                onClick={() => fillTestCredentials('admin')}
                className="flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Settings className="w-4 h-4 text-purple-500" />
                  <span className="text-sm font-medium">Administrador</span>
                </div>
                <span className="text-xs text-gray-500">admin@dermacielo.com</span>
              </button>
              
              <button
                type="button"
                onClick={() => fillTestCredentials('cajero')}
                className="flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium">Cajero</span>
                </div>
                <span className="text-xs text-gray-500">cajero@dermacielo.com</span>
              </button>
              
              <button
                type="button"
                onClick={() => fillTestCredentials('cosmetologa')}
                className="flex items-center justify-between p-3 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4 text-pink-500" />
                  <span className="text-sm font-medium">Cosmetóloga</span>
                </div>
                <span className="text-xs text-gray-500">cosmetologa@dermacielo.com</span>
              </button>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-xs text-gray-500">
              Sistema desarrollado con tecnología Sopranoice
            </p>
          </div>
        </div>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            ¿Necesitas ayuda? Revisa la documentación de configuración
          </p>
        </div>
      </div>
    </div>
  )
}