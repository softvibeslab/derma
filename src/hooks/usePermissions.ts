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
      console.log('Setting permissions for user:', userProfile)
      setPermissions(getPermissionsForRole(userProfile.role))
      setLoading(false)
    } else {
      console.log('No user profile, setting loading to false')
      setLoading(false)
    }
  }, [userProfile])

  const getPermissionsForRole = (role: string): RolePermissions => {
    console.log('Getting permissions for role:', role)
    
    // Definir permisos estáticos por rol
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
        users: ['read', 'create', 'update', 'delete']
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

    // Si el rol no existe, dar permisos básicos
    const permissions = rolePermissions[role] || {
      dashboard: ['read']
    }
    
    console.log('Permissions for role', role, ':', permissions)
    return permissions
  }

  const hasPermission = (module: string, action: string): boolean => {
    if (!userProfile) {
      console.log('No user profile, denying permission')
      return false
    }

    if (loading) {
      console.log('Still loading permissions, denying permission temporarily')
      return false
    }

    // Admin siempre tiene todos los permisos
    if (userProfile.role === 'administrador') {
      console.log('Admin user, granting permission for', module, action)
      return true
    }

    // Verificar permisos específicos
    const modulePermissions = permissions[module]
    const hasAccess = modulePermissions?.includes(action) || false
    
    console.log('Permission check:', {
      user: userProfile.email,
      role: userProfile.role,
      module,
      action,
      modulePermissions,
      hasAccess
    })
    
    return hasAccess
  }

  const canAccessModule = (module: string): boolean => {
    const canAccess = hasPermission(module, 'read')
    console.log('Module access check for', module, ':', canAccess)
    return canAccess
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
      'users'
    ]

    const accessible = allModules.filter(module => canAccessModule(module))
    console.log('Accessible modules:', accessible)
    return accessible
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