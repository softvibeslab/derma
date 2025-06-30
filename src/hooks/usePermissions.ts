import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RolePermissions {
  [module: string]: string[]
}

export function usePermissions() {
  const { userProfile } = useAuth()
  const [loading, setLoading] = useState(true)

  const permissions = useMemo<RolePermissions>(() => {
    if (!userProfile) return {}

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

    return rolePermissions[userProfile.role] || { dashboard: ['read'] }
  }, [userProfile])

  useEffect(() => {
    setLoading(false)
  }, [userProfile])

  const hasPermission = useMemo(() => 
    (module: string, action: string): boolean => {
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
    },
    [userProfile, loading, permissions]
  )

  const canAccessModule = useMemo(() => 
    (module: string): boolean => hasPermission(module, 'read'),
    [hasPermission]
  )

  const getAccessibleModules = useMemo(() => 
    (): string[] => {
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

      return allModules.filter(module => canAccessModule(module))
    },
    [canAccessModule]
  )

  const canCreate = useMemo(() => 
    (module: string): boolean => hasPermission(module, 'create'),
    [hasPermission]
  )

  const canUpdate = useMemo(() => 
    (module: string): boolean => hasPermission(module, 'update'),
    [hasPermission]
  )

  const canDelete = useMemo(() => 
    (module: string): boolean => hasPermission(module, 'delete'),
    [hasPermission]
  )

  const isAdmin = useMemo(() => 
    (): boolean => userProfile?.role === 'administrador',
    [userProfile]
  )

  const getModulePermissions = useMemo(() => 
    (module: string): string[] => permissions[module] || [],
    [permissions]
  )

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
      // No-op since permissions are computed from userProfile
    }
  }
}