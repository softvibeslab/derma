import React, { createContext, useContext, useEffect, useState } from 'react'
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
  }, [])

  const fetchUserProfile = async (userId: string) => {
    try {
      // Intentar obtener el perfil existente
      let { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role_id, sucursal, is_active, created_at, updated_at')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        // Si no existe, crear un perfil básico
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          let defaultRole = 'cajero'
          const email = authUser.user.email || ''
          
          if (email.includes('admin')) {
            defaultRole = 'administrador'
          } else if (email.includes('cosmetologa')) {
            defaultRole = 'cosmetologa'
          }

          // Intentar crear el perfil
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: authUser.user.id,
                email: authUser.user.email || '',
                full_name: authUser.user.user_metadata?.full_name || authUser.user.email || 'Usuario',
                password_hash: 'managed_by_supabase_auth'
              }
            ])
            .select('id, email, full_name, role_id, sucursal, is_active, created_at, updated_at')
            .single()

          if (!insertError && newProfile) {
            data = { ...newProfile, role: defaultRole }
            error = null
          } else {
            // Si falla, crear un perfil temporal
            data = {
              id: authUser.user.id,
              email: authUser.user.email || '',
              full_name: authUser.user.user_metadata?.full_name || 'Usuario',
              role: defaultRole,
              role_id: null,
              sucursal: null,
              is_active: true,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }
            error = null
          }
        }
      }

      if (!error && data) {
        // Asegurar que tenemos el campo role
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
      
      // Como último recurso, crear un perfil temporal básico
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser.user) {
        const tempProfile = {
          id: authUser.user.id,
          email: authUser.user.email || '',
          full_name: authUser.user.user_metadata?.full_name || 'Usuario',
          role: 'cajero',
          role_id: null,
          sucursal: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        setUserProfile(tempProfile)
      }
    }
  }

  const refreshProfile = async () => {
    if (user) {
      await fetchUserProfile(user.id)
    }
  }

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signUp = async (email: string, password: string, fullName: string, role: string) => {
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

      if (!error && data.user) {
        // Intentar crear el perfil
        await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              full_name: fullName,
              password_hash: 'managed_by_supabase_auth'
            }
          ])
      }

      return { error }
    } catch (error) {
      return { error }
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signOut,
    signUp,
    refreshProfile,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}