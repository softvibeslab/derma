import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  throw new Error('Missing Supabase environment variables. Please check your .env file.')
}

// Solo mostrar en desarrollo
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl)
  console.log('Supabase Key:', supabaseAnonKey ? 'Present' : 'Missing')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
})

export type Database = {
  public: {
    Tables: {
      roles: {
        Row: {
          id: string
          name: string
          description: string | null
          permissions: any | null
          created_at: string
        }
        Insert: {
          name: string
          description?: string | null
          permissions?: any | null
        }
        Update: {
          name?: string
          description?: string | null
          permissions?: any | null
        }
      }
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          role_id: string | null
          sucursal: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          email: string
          full_name: string
          role?: string
          role_id?: string | null
          sucursal?: string | null
          is_active?: boolean
        }
        Update: {
          email?: string
          full_name?: string
          role?: string
          role_id?: string | null
          sucursal?: string | null
          is_active?: boolean
        }
      }
      patients: {
        Row: {
          id: string
          numero_cliente: string | null
          nombre_completo: string
          telefono: string | null
          cumpleanos: string | null
          sexo: string | null
          localidad: string | null
          zonas_tratamiento: string[] | null
          precio_total: number | null
          metodo_pago_preferido: string | null
          observaciones: string | null
          consentimiento_firmado: boolean
          fecha_consentimiento: string | null
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          numero_cliente?: string | null
          nombre_completo: string
          telefono?: string | null
          cumpleanos?: string | null
          sexo?: string | null
          localidad?: string | null
          zonas_tratamiento?: string[] | null
          precio_total?: number | null
          metodo_pago_preferido?: string | null
          observaciones?: string | null
          consentimiento_firmado?: boolean
          fecha_consentimiento?: string | null
          is_active?: boolean
        }
        Update: {
          numero_cliente?: string | null
          nombre_completo?: string
          telefono?: string | null
          cumpleanos?: string | null
          sexo?: string | null
          localidad?: string | null
          zonas_tratamiento?: string[] | null
          precio_total?: number | null
          metodo_pago_preferido?: string | null
          observaciones?: string | null
          consentimiento_firmado?: boolean
          fecha_consentimiento?: string | null
          is_active?: boolean
        }
      }
      services: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          zona: string
          precio_base: number
          duracion_minutos: number | null
          sesiones_recomendadas: number | null
          tecnologia: string
          is_active: boolean
          created_at: string
        }
        Insert: {
          nombre: string
          descripcion?: string | null
          zona: string
          precio_base: number
          duracion_minutos?: number | null
          sesiones_recomendadas?: number | null
          tecnologia?: string
          is_active?: boolean
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          zona?: string
          precio_base?: number
          duracion_minutos?: number | null
          sesiones_recomendadas?: number | null
          tecnologia?: string
          is_active?: boolean
        }
      }
      appointments: {
        Row: {
          id: string
          patient_id: string
          service_id: string
          operadora_id: string | null
          cajera_id: string | null
          fecha_hora: string
          duracion_minutos: number | null
          numero_sesion: number | null
          status: string
          precio_sesion: number | null
          metodo_pago: string | null
          observaciones_caja: string | null
          observaciones_operadora: string | null
          proxima_cita: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          patient_id: string
          service_id: string
          operadora_id?: string | null
          cajera_id?: string | null
          fecha_hora: string
          duracion_minutos?: number | null
          numero_sesion?: number | null
          status?: string
          precio_sesion?: number | null
          metodo_pago?: string | null
          observaciones_caja?: string | null
          observaciones_operadora?: string | null
          proxima_cita?: string | null
        }
        Update: {
          patient_id?: string
          service_id?: string
          operadora_id?: string | null
          cajera_id?: string | null
          fecha_hora?: string
          duracion_minutos?: number | null
          numero_sesion?: number | null
          status?: string
          precio_sesion?: number | null
          metodo_pago?: string | null
          observaciones_caja?: string | null
          observaciones_operadora?: string | null
          proxima_cita?: string | null
        }
      }
      payments: {
        Row: {
          id: string
          patient_id: string
          appointment_id: string | null
          monto: number
          metodo_pago: string
          fecha_pago: string
          cajera_id: string | null
          banco: string | null
          referencia: string | null
          observaciones: string | null
          tipo_pago: string
          created_at: string
        }
        Insert: {
          patient_id: string
          appointment_id?: string | null
          monto: number
          metodo_pago: string
          fecha_pago?: string
          cajera_id?: string | null
          banco?: string | null
          referencia?: string | null
          observaciones?: string | null
          tipo_pago?: string
        }
        Update: {
          patient_id?: string
          appointment_id?: string | null
          monto?: number
          metodo_pago?: string
          fecha_pago?: string
          cajera_id?: string | null
          banco?: string | null
          referencia?: string | null
          observaciones?: string | null
          tipo_pago?: string
        }
      }
      patient_treatments: {
        Row: {
          id: string
          patient_id: string
          service_id: string
          sesiones_contratadas: number | null
          sesiones_completadas: number
          precio_total: number | null
          fecha_inicio: string | null
          fecha_fin: string | null
          status: string
          observaciones: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          patient_id: string
          service_id: string
          sesiones_contratadas?: number | null
          sesiones_completadas?: number
          precio_total?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          status?: string
          observaciones?: string | null
        }
        Update: {
          patient_id?: string
          service_id?: string
          sesiones_contratadas?: number | null
          sesiones_completadas?: number
          precio_total?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          status?: string
          observaciones?: string | null
        }
      }
      monthly_status: {
        Row: {
          id: string
          patient_id: string
          year: number
          month: number
          status: string | null
          comentarios: string | null
          created_at: string
        }
        Insert: {
          patient_id: string
          year: number
          month: number
          status?: string | null
          comentarios?: string | null
        }
        Update: {
          patient_id?: string
          year?: number
          month?: number
          status?: string | null
          comentarios?: string | null
        }
      }
      sucursales: {
        Row: {
          id: string
          nombre: string
          direccion: string | null
          telefono: string | null
          ciudad: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          nombre: string
          direccion?: string | null
          telefono?: string | null
          ciudad?: string | null
          is_active?: boolean
        }
        Update: {
          nombre?: string
          direccion?: string | null
          telefono?: string | null
          ciudad?: string | null
          is_active?: boolean
        }
      }
      promotions: {
        Row: {
          id: string
          nombre: string
          descripcion: string | null
          descuento_porcentaje: number | null
          descuento_fijo: number | null
          fecha_inicio: string | null
          fecha_fin: string | null
          servicios_aplicables: string[] | null
          condiciones: string | null
          is_active: boolean
          created_at: string
        }
        Insert: {
          nombre: string
          descripcion?: string | null
          descuento_porcentaje?: number | null
          descuento_fijo?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          servicios_aplicables?: string[] | null
          condiciones?: string | null
          is_active?: boolean
        }
        Update: {
          nombre?: string
          descripcion?: string | null
          descuento_porcentaje?: number | null
          descuento_fijo?: number | null
          fecha_inicio?: string | null
          fecha_fin?: string | null
          servicios_aplicables?: string[] | null
          condiciones?: string | null
          is_active?: boolean
        }
      }
    }
    Views: {
      user_profiles: {
        Row: {
          id: string
          email: string
          full_name: string
          role: string
          role_id: string | null
          sucursal: string | null
          is_active: boolean
          created_at: string
          updated_at: string
          role_name: string | null
          role_description: string | null
          role_permissions: any | null
        }
      }
    }
    Functions: {
      has_permission: {
        Args: {
          user_id: string
          module_name: string
          action_name: string
        }
        Returns: boolean
      }
      get_user_role: {
        Args: {}
        Returns: string
      }
      get_user_permissions: {
        Args: {
          user_id: string
        }
        Returns: any
      }
    }
  }
}