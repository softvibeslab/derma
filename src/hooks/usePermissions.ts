import { useMemo } from 'react'
import { useAuth } from '../contexts/AuthContext'

interface RolePermissions {
  [module: string]: string[]
}

export function usePermissions() {
  const { userProfile } = useAuth()

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

  const hasPermission = useMemo(() => 
    (module: string, action: string): boolean => {
      if (!userProfile) {
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
    [userProfile, permissions]
  )

  const canAccessModule = useMemo(() => 
    (module: string): boolean => hasPermission(module, 'read'),
    [hasPermission]
  )

  return {
    permissions,
    loading: false,
    hasPermission,
    canAccessModule,
    canCreate: (module: string) => hasPermission(module, 'create'),
    canUpdate: (module: string) => hasPermission(module, 'update'),
    canDelete: (module: string) => hasPermission(module, 'delete'),
    isAdmin: () => userProfile?.role === 'administrador',
    userRole: userProfile?.role || null,
  }
}