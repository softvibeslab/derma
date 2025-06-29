import React, { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role?: string
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
        console.log('Initializing auth...')
        
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Session error:', error)
          if (mounted) {
            setLoading(false)
          }
          return
        }

        console.log('Session:', session ? 'Found' : 'Not found')
        
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
      console.log('Auth state change:', event, session ? 'Session exists' : 'No session')
      
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
      console.log('Fetching user profile for:', userId)
      
      // Primero intentar obtener el perfil existente
      let { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role_id, sucursal, is_active, created_at, updated_at')
        .eq('id', userId)
        .single()

      if (error && error.code === 'PGRST116') {
        console.log('User profile not found, attempting to create...')
        
        // Si no existe, intentar crear el perfil
        const { data: authUser } = await supabase.auth.getUser()
        if (authUser.user) {
          // Determinar rol por defecto basado en email
          let defaultRole = 'cosmetologa'
          const email = authUser.user.email || ''
          
          if (email.includes('admin')) {
            defaultRole = 'administrador'
          } else if (email.includes('cajero') || email.includes('cajera')) {
            defaultRole = 'cajero'
          } else if (email.includes('cosmetologa') || email.includes('cosmetologo')) {
            defaultRole = 'cosmetologa'
          }
          
          // Obtener role_id
          const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('name', defaultRole)
            .single()
          
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert([
              {
                id: authUser.user.id,
                email: authUser.user.email || '',
                password_hash: 'managed_by_supabase_auth',
                full_name: authUser.user.user_metadata?.full_name || authUser.user.email || 'Usuario',
                role_id: roleData?.id || null
              }
            ])
            .select()
            .single()

          if (!insertError && newProfile) {
            console.log('New profile created:', newProfile)
            data = newProfile
            error = null
          } else {
            console.error('Error creating profile:', insertError)
            // Como último recurso, crear un perfil temporal
            data = {
              id: authUser.user.id,
              email: authUser.user.email || '',
              full_name: authUser.user.user_metadata?.full_name || authUser.user.email || 'Usuario',
              role: defaultRole, // Mantener para compatibilidad
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

      if (error) {
        console.error('Error fetching user profile:', error)
        return
      }
      
      console.log('User profile loaded:', data)
      setUserProfile(data)
    } catch (error) {
      console.error('Error in fetchUserProfile:', error)
      
      // Como último recurso, crear un perfil temporal para evitar errores
      const { data: authUser } = await supabase.auth.getUser()
      if (authUser.user) {
        const tempProfile = {
          id: authUser.user.id,
          email: authUser.user.email || '',
          full_name: authUser.user.user_metadata?.full_name || authUser.user.email || 'Usuario',
          role: 'cajero', // Para compatibilidad
          role_id: null,
          sucursal: null,
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        console.log('Using temporary profile:', tempProfile)
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
      console.log('Attempting sign in for:', email)
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) {
        console.error('Sign in error:', error)
      } else {
        console.log('Sign in successful')
      }
      
      return { error }
    } catch (error) {
      console.error('Sign in exception:', error)
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
        // Obtener role_id
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .eq('name', role)
          .single()
          
        const { error: profileError } = await supabase
          .from('users')
          .insert([
            {
              id: data.user.id,
              email,
              password_hash: 'managed_by_supabase_auth',
              full_name: fullName,
              role_id: roleData?.id || null
            }
          ])

        if (profileError) {
          return { error: profileError }
        }
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