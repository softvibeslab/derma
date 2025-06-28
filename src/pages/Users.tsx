import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Users as UsersIcon, 
  Plus, 
  Edit, 
  Trash2,
  Shield,
  Mail,
  MapPin,
  Calendar,
  Eye,
  EyeOff,
  X,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface User {
  id: string
  email: string
  full_name: string
  role: string
  sucursal: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface Role {
  id: string
  name: string
  description: string | null
}

export default function Users() {
  const { userProfile } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'cajero',
    sucursal: ''
  })

  // Check if user has admin access
  const hasAdminAccess = userProfile?.role === 'administrador'

  useEffect(() => {
    if (hasAdminAccess) {
      fetchUsers()
      fetchRoles()
    }
  }, [hasAdminAccess])

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setUsers(data || [])
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('id, name, description')
        .order('name', { ascending: true })

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Validaciones
    if (!formData.full_name.trim()) {
      alert('El nombre completo es requerido')
      setLoading(false)
      return
    }
    
    if (!formData.email.trim()) {
      alert('El email es requerido')
      setLoading(false)
      return
    }
    
    if (!isEditing && (!formData.password || formData.password.length < 6)) {
      alert('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    try {
      if (isEditing && selectedUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            full_name: formData.full_name,
            role: formData.role,
            sucursal: formData.sucursal || null
          })
          .eq('id', selectedUser.id)

        if (error) throw error
      } else {
        // Create new user through Supabase Auth
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: formData.password,
          options: {
            data: {
              full_name: formData.full_name
            }
          }
        })

        if (authError) throw authError

        if (authData.user) {
          // Create user profile
          const { error: profileError } = await supabase
            .from('users')
            .insert([{
              id: authData.user.id,
              email: formData.email,
              full_name: formData.full_name,
              role: formData.role,
              sucursal: formData.sucursal || null
            }])

          if (profileError) throw profileError
        }
      }

      await fetchUsers()
      setShowModal(false)
      resetForm()
      alert(isEditing ? 'Usuario actualizado exitosamente' : 'Usuario creado exitosamente')
    } catch (error) {
      console.error('Error saving user:', error)
      if (error instanceof Error && error.message.includes('duplicate')) {
        alert('Error: El email ya está en uso por otro usuario.')
      } else {
        alert('Error al guardar el usuario. Por favor intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId)

      if (error) throw error
      await fetchUsers()
    } catch (error) {
      console.error('Error updating user status:', error)
    }
  }

  const deleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar al usuario "${userEmail}"?`)) {
      return
    }

    try {
      setLoading(true)
      
      // First deactivate the user
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId)

      if (updateError) throw updateError

      await fetchUsers()
      alert('Usuario desactivado correctamente. Para eliminarlo completamente, contacta al administrador del sistema.')
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Error al eliminar el usuario.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      password: '',
      full_name: '',
      role: 'cajero',
      sucursal: ''
    })
    setSelectedUser(null)
    setIsEditing(false)
    setShowPassword(false)
  }

  const openModal = (user?: User) => {
    if (user) {
      setSelectedUser(user)
      setIsEditing(true)
      setFormData({
        email: user.email,
        password: '',
        full_name: user.full_name,
        role: user.role,
        sucursal: user.sucursal || ''
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  // If user doesn't have admin access, show access denied
  if (!hasAdminAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Acceso Denegado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Solo los administradores pueden gestionar usuarios del sistema.
          </p>
        </div>
      </div>
    )
  }

  if (loading && users.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="w-7 h-7 mr-3 text-pink-600" />
            Gestión de Usuarios
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra los usuarios del sistema y sus roles de acceso
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Usuario
        </button>
      </div>

      {/* Users List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {users.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {users.map((user) => (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {user.full_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {user.full_name}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          <div className="flex items-center">
                            <Mail className="w-4 h-4 mr-1" />
                            {user.email}
                          </div>
                          <div className="flex items-center">
                            <Shield className="w-4 h-4 mr-1" />
                            <span className="capitalize">{user.role}</span>
                          </div>
                          {user.sucursal && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {user.sucursal}
                            </div>
                          )}
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(new Date(user.created_at), 'dd MMM yyyy', { locale: es })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.is_active 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                      <button
                        onClick={() => toggleUserStatus(user.id, user.is_active)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                          user.is_active ? 'bg-pink-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                            user.is_active ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                    <button
                      onClick={() => openModal(user)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar usuario"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {user.id !== userProfile?.id && (
                      <button
                        onClick={() => deleteUser(user.id, user.email)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <UsersIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay usuarios</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza agregando tu primer usuario al sistema.
            </p>
            <div className="mt-6">
              <button
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Usuario
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isEditing ? 'Editar Usuario' : 'Nuevo Usuario'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre Completo *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.full_name}
                        onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Nombre completo del usuario"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email *
                      </label>
                      <input
                        type="email"
                        required
                        disabled={isEditing}
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                        placeholder="usuario@dermacielo.com"
                      />
                    </div>

                    {!isEditing && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Contraseña *
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={formData.password}
                            onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                            className="w-full px-3 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            placeholder="Contraseña segura"
                            minLength={6}
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
                    )}

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Rol *
                      </label>
                      <select
                        required
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        {roles.map(role => (
                          <option key={role.id} value={role.name}>
                            {role.name.charAt(0).toUpperCase() + role.name.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sucursal
                      </label>
                      <select
                        value={formData.sucursal}
                        onChange={(e) => setFormData(prev => ({ ...prev, sucursal: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Sin asignar</option>
                        <option value="Playa del Carmen">Playa del Carmen</option>
                        <option value="Cancún">Cancún</option>
                        <option value="Tulum">Tulum</option>
                        <option value="Cozumel">Cozumel</option>
                        <option value="Holbox">Holbox</option>
                        <option value="Valladolid">Valladolid</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-base font-medium text-white hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Usuario')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}