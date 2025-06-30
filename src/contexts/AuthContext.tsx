import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: string
  role_id?: string
  sucursal: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

interface AuthContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  signUp: (email: string, password: string, fullName: string, role: string) => Promise<{ error: any }>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const createTempProfile = useCallback((userId: string, email: string): UserProfile => {
    let defaultRole = 'cajero'
    
    if (email.includes('admin')) {
      defaultRole = 'administrador'
    } else if (email.includes('cosmetologa')) {
      defaultRole = 'cosmetologa'
    }

    return {
      id: userId,
      email: email,
      full_name: email.split('@')[0] || 'Usuario',
      role: defaultRole,
      role_id: null,
      sucursal: null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  }, [])

  const fetchUserProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Usuario no existe, obtener datos de auth
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          const tempProfile = createTempProfile(userId, authUser.user.email || '')
          setUserProfile(tempProfile)
          return
        }
      }

      if (data) {
        // Asegurar que tiene rol
        if (!data.role) {
          const email = data.email || ''
          if (email.includes('admin')) {
            data.role = 'administrador'
          } else if (email.includes('cosmetologa')) {
            data.role = 'cosmetologa'
          } else {
            data.role = 'cajero'
          }
        }
        setUserProfile(data as UserProfile)
      }
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      // Como último recurso, crear perfil temporal
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser.user) {
        const tempProfile = createTempProfile(userId, authUser.user.email || '')
        setUserProfile(tempProfile)
      }
    }
  }, [createTempProfile])

  const refreshProfile = useCallback(async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }, [user, fetchUserProfile])

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      return { error }
    } catch (error) {
      return { error }
    }
  }, [])

  const signUp = useCallback(async (email: string, password: string, fullName: string, role: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName
          }
        }
      })

      return { error }
    } catch (error) {
      return { error }
    }
  }, [])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserProfile(null)
  }, [])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            await fetchUserProfile(session.user.id)
          }
          setLoading(false)
        }
      } catch (error) {
        console.error('Auth initialization error:', error)
        if (mounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (mounted) {
        setUser(session?.user ?? null)
        if (session?.user) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [fetchUserProfile]) // Solo fetchUserProfile como dependencia

  const value = React.useMemo(() => ({
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    signUp,
    refreshProfile,
  }), [user, userProfile, loading, signIn, signOut, signUp, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}