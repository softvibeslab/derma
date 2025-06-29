import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RolePermissions {
  [module: string]: string[]
}

export function usePermissions() {
  const { userProfile } = useAuth()
  const [permissions, setPermissions] = useState<RolePermissions>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (userProfile) {
      setPermissions(getPermissionsForRole(userProfile.role))
      setLoading(false)
    } else {
      setLoading(false)
    }
  }, [userProfile])

  const getPermissionsForRole = (role: string): RolePermissions => {
    const rolePermissions: Record<string, RolePermissions> = {
      administrador: {
        dashboard: ['read', 'create', 'update', 'delete'],
        patients: ['read', 'create', 'update', 'delete'],
        appointments: ['read', 'create', 'update', 'delete'],
        services: ['read', 'create', 'update', 'delete'],
        payments: ['read', 'create', 'update', 'delete'],
        reports: ['read', 'create', 'update', 'delete'],
        import: ['read', 'create', 'update', 'delete'],
        roles: ['read', 'create', 'update', 'delete'],
        users: ['read', 'create', 'update', 'delete'],
        testing: ['read', 'create', 'update', 'delete'],
        connection: ['read']
      },
      cajero: {
        dashboard: ['read'],
        patients: ['read', 'create', 'update'],
        appointments: ['read', 'create', 'update'],
        services: ['read'],
        payments: ['read', 'create'],
        reports: ['read'],
        import: ['read', 'create'],
        users: ['read']
      },
      cosmetologa: {
        dashboard: ['read'],
        patients: ['read', 'update'],
        appointments: ['read', 'update'],
        services: ['read'],
        payments: ['read'],
        reports: ['read'],
        users: ['read']
      }
    }

    return rolePermissions[role] || { dashboard: ['read'] }
  }

  const hasPermission = (module: string, action: string): boolean => {
    if (!userProfile || loading) {
      return false
    }

    // Admin siempre tiene todos los permisos
    if (userProfile.role === 'administrador') {
      return true
    }

    // Verificar permisos específicos
    const modulePermissions = permissions[module]
    return modulePermissions?.includes(action) || false
  }

  const canAccessModule = (module: string): boolean => {
    return hasPermission(module, 'read')
  }

  const getAccessibleModules = (): string[] => {
    const allModules = [
      'dashboard',
      'patients', 
      'appointments',
      'services',
      'payments',
      'reports',
      'import',
      'roles',
      'users',
      'testing',
      'connection'
    ]

    return allModules.filter(module => canAccessModule(module))
  }

  const canCreate = (module: string): boolean => {
    return hasPermission(module, 'create')
  }

  const canUpdate = (module: string): boolean => {
    return hasPermission(module, 'update')
  }

  const canDelete = (module: string): boolean => {
    return hasPermission(module, 'delete')
  }

  const isAdmin = (): boolean => {
    return userProfile?.role === 'administrador'
  }

  const getModulePermissions = (module: string): string[] => {
    return permissions[module] || []
  }

  return {
    permissions,
    loading,
    hasPermission,
    canAccessModule,
    getAccessibleModules,
    canCreate,
    canUpdate,
    canDelete,
    isAdmin,
    getModulePermissions,
    userRole: userProfile?.role || null,
    refreshPermissions: () => {
      if (userProfile) {
        setPermissions(getPermissionsForRole(userProfile.role))
      }
    }
  }
}