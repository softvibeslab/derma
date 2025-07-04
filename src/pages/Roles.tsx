import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Shield, 
  Plus, 
  Edit, 
  Trash2,
  Users,
  Settings,
  Eye,
  X,
  Check,
  AlertCircle
} from 'lucide-react'

interface Role {
  id: string
  name: string
  description: string | null
  permissions: any
  created_at: string
}

interface Permission {
  module: string
  actions: string[]
}

const AVAILABLE_MODULES = [
  { key: 'dashboard', name: 'Dashboard', description: 'Acceso al panel principal' },
  { key: 'patients', name: 'Pacientes', description: 'Gestión de pacientes' },
  { key: 'appointments', name: 'Citas', description: 'Programación de citas' },
  { key: 'services', name: 'Servicios', description: 'Catálogo de servicios' },
  { key: 'payments', name: 'Pagos', description: 'Gestión de pagos y POS' },
  { key: 'reports', name: 'Reportes', description: 'Reportes y estadísticas' },
  { key: 'import', name: 'Importar', description: 'Importación de datos' },
  { key: 'roles', name: 'Roles', description: 'Gestión de roles y permisos' },
  { key: 'users', name: 'Usuarios', description: 'Gestión de usuarios' }
]

const AVAILABLE_ACTIONS = ['read', 'create', 'update', 'delete']

export default function Roles() {
  const { userProfile } = useAuth()
  const [roles, setRoles] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, string[]>
  })

  // Check if user has admin access
  const hasAdminAccess = userProfile?.role === 'administrador'

  useEffect(() => {
    if (hasAdminAccess) {
      fetchRoles()
    }
  }, [hasAdminAccess])

  const fetchRoles = async () => {
    try {
      const { data, error } = await supabase
        .from('roles')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setRoles(data || [])
    } catch (error) {
      console.error('Error fetching roles:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Validaciones
    if (!formData.name.trim()) {
      alert('El nombre del rol es requerido')
      setLoading(false)
      return
    }
    
    // Verificar que tenga al menos un permiso
    const hasPermissions = Object.keys(formData.permissions).length > 0
    if (!hasPermissions) {
      alert('Debe asignar al menos un permiso al rol')
      setLoading(false)
      return
    }

    try {
      const roleData = {
        name: formData.name,
        description: formData.description || null,
        permissions: formData.permissions
      }

      if (isEditing && selectedRole) {
        const { error } = await supabase
          .from('roles')
          .update(roleData)
          .eq('id', selectedRole.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('roles')
          .insert([roleData])

        if (error) throw error
      }

      await fetchRoles()
      setShowModal(false)
      resetForm()
      alert(isEditing ? 'Rol actualizado exitosamente' : 'Rol creado exitosamente')
    } catch (error) {
      console.error('Error saving role:', error)
      if (error instanceof Error && error.message.includes('duplicate')) {
        alert('Error: Ya existe un rol con ese nombre.')
      } else {
        alert('Error al guardar el rol. Por favor intenta de nuevo.')
      }
    } finally {
      setLoading(false)
    }
  }

  const deleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el rol "${roleName}"?`)) {
      return
    }

    try {
      setLoading(true)
      
      // Check if role is being used by any users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id')
        .eq('role', roleName)
        .limit(1)

      if (usersError) throw usersError

      if (users && users.length > 0) {
        alert('No se puede eliminar este rol porque está siendo usado por usuarios.')
        return
      }

      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', roleId)

      if (error) throw error

      await fetchRoles()
    } catch (error) {
      console.error('Error deleting role:', error)
      alert('Error al eliminar el rol. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      permissions: {}
    })
    setSelectedRole(null)
    setIsEditing(false)
  }

  const openModal = (role?: Role) => {
    if (role) {
      setSelectedRole(role)
      setIsEditing(true)
      setFormData({
        name: role.name,
        description: role.description || '',
        permissions: role.permissions || {}
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const handlePermissionChange = (module: string, action: string, checked: boolean) => {
    setFormData(prev => {
      const newPermissions = { ...prev.permissions }
      
      if (!newPermissions[module]) {
        newPermissions[module] = []
      }

      if (checked) {
        if (!newPermissions[module].includes(action)) {
          newPermissions[module] = [...newPermissions[module], action]
        }
      } else {
        newPermissions[module] = newPermissions[module].filter(a => a !== action)
        if (newPermissions[module].length === 0) {
          delete newPermissions[module]
        }
      }

      return {
        ...prev,
        permissions: newPermissions
      }
    })
  }

  const hasPermission = (module: string, action: string) => {
    return formData.permissions[module]?.includes(action) || false
  }

  // If user doesn't have admin access, show access denied
  if (!hasAdminAccess) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
          <h3 className="mt-2 text-lg font-medium text-gray-900">Acceso Denegado</h3>
          <p className="mt-1 text-sm text-gray-500">
            Solo los administradores pueden gestionar roles y permisos.
          </p>
        </div>
      </div>
    )
  }

  if (loading && roles.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
            <Shield className="w-7 h-7 mr-3 text-pink-600" />
            Gestión de Roles
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra los roles del sistema y sus permisos de acceso
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Rol
        </button>
      </div>

      {/* Roles List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {roles.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {roles.map((role) => (
              <div key={role.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                        <Shield className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 capitalize">
                          {role.name}
                        </h3>
                        {role.description && (
                          <p className="text-sm text-gray-600 mt-1">
                            {role.description}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {Object.keys(role.permissions || {}).map((module) => (
                            <span
                              key={module}
                              className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full"
                            >
                              {AVAILABLE_MODULES.find(m => m.key === module)?.name || module}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => openModal(role)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar rol"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    {!['administrador', 'cajero', 'cosmetologa'].includes(role.name) && (
                      <button
                        onClick={() => deleteRole(role.id, role.name)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar rol"
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
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay roles</h3>
            <p className="mt-1 text-sm text-gray-500">
              Comienza creando tu primer rol personalizado.
            </p>
            <div className="mt-6">
              <button
                onClick={() => openModal()}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Rol
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
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isEditing ? 'Editar Rol' : 'Nuevo Rol'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Basic Information */}
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre del Rol *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Ej: supervisor, recepcionista"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Descripción
                        </label>
                        <textarea
                          rows={3}
                          value={formData.description}
                          onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="Descripción del rol y sus responsabilidades..."
                        />
                      </div>
                    </div>

                    {/* Permissions */}
                    <div>
                      <h4 className="text-md font-medium text-gray-900 mb-4">Permisos por Módulo</h4>
                      <div className="space-y-4 max-h-96 overflow-y-auto">
                        {AVAILABLE_MODULES.map((module) => (
                          <div key={module.key} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div>
                                <h5 className="font-medium text-gray-900">{module.name}</h5>
                                <p className="text-xs text-gray-500">{module.description}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {AVAILABLE_ACTIONS.map((action) => (
                                <label key={action} className="flex items-center">
                                  <input
                                    type="checkbox"
                                    checked={hasPermission(module.key, action)}
                                    onChange={(e) => handlePermissionChange(module.key, action, e.target.checked)}
                                    className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                                  />
                                  <span className="ml-2 text-sm text-gray-700 capitalize">
                                    {action === 'read' ? 'Ver' : 
                                     action === 'create' ? 'Crear' :
                                     action === 'update' ? 'Editar' : 'Eliminar'}
                                  </span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-base font-medium text-white hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Rol')}
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