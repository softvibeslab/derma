import { supabase } from '../lib/supabase'

// Validation result interface
interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Patient data validation
export function validatePatientData(patientData: any): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Required field validation
  if (!patientData.nombre_completo || !patientData.nombre_completo.trim()) {
    errors.push('El nombre completo es requerido')
  }

  // Name length validation
  if (patientData.nombre_completo && patientData.nombre_completo.length < 2) {
    errors.push('El nombre debe tener al menos 2 caracteres')
  }

  // Phone validation (if provided)
  if (patientData.telefono && patientData.telefono.trim()) {
    const phoneRegex = /^\d{10}$/
    const cleanPhone = patientData.telefono.replace(/\D/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      warnings.push('El teléfono debe tener 10 dígitos')
    }
  }

  // Birthday validation (if provided)
  if (patientData.cumpleanos) {
    const birthDate = new Date(patientData.cumpleanos)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    if (age < 0 || age > 120) {
      errors.push('Fecha de nacimiento inválida')
    }
    
    if (age < 18) {
      warnings.push('Paciente menor de edad - verificar consentimiento de padres')
    }
  }

  // Gender validation (if provided)
  if (patientData.sexo && !['M', 'F'].includes(patientData.sexo)) {
    errors.push('El sexo debe ser M o F')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Appointment data validation
export async function validateAppointmentData(appointmentData: any): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!appointmentData.patient_id) {
    errors.push('ID del paciente es requerido')
  }

  if (!appointmentData.service_id) {
    errors.push('ID del servicio es requerido')
  }

  if (!appointmentData.fecha_hora) {
    errors.push('Fecha y hora son requeridas')
  }

  // Date validation
  if (appointmentData.fecha_hora) {
    const appointmentDate = new Date(appointmentData.fecha_hora)
    const now = new Date()
    
    if (appointmentDate < now) {
      errors.push('La fecha de la cita no puede ser en el pasado')
    }
    
    // Check if it's too far in the future (more than 1 year)
    const oneYearFromNow = new Date()
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1)
    
    if (appointmentDate > oneYearFromNow) {
      warnings.push('La cita está programada para más de un año en el futuro')
    }
    
    // Check if it's during business hours (8 AM to 8 PM)
    const hour = appointmentDate.getHours()
    if (hour < 8 || hour > 20) {
      warnings.push('La cita está fuera del horario comercial (8:00 AM - 8:00 PM)')
    }
  }

  // Session number validation
  if (appointmentData.numero_sesion && appointmentData.numero_sesion < 1) {
    errors.push('El número de sesión debe ser mayor a 0')
  }

  // Check for conflicting appointments (if patient_id and fecha_hora are provided)
  if (appointmentData.patient_id && appointmentData.fecha_hora) {
    try {
      const appointmentDate = new Date(appointmentData.fecha_hora)
      const startTime = new Date(appointmentDate.getTime() - 30 * 60000) // 30 minutes before
      const endTime = new Date(appointmentDate.getTime() + 30 * 60000) // 30 minutes after

      const { data: conflictingAppointments } = await supabase
        .from('appointments')
        .select('id')
        .eq('patient_id', appointmentData.patient_id)
        .gte('fecha_hora', startTime.toISOString())
        .lte('fecha_hora', endTime.toISOString())
        .neq('status', 'cancelada')

      if (conflictingAppointments && conflictingAppointments.length > 0) {
        warnings.push('El paciente tiene otra cita cerca de esta hora')
      }
    } catch (error) {
      console.warn('Could not check for conflicting appointments:', error)
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Payment data validation
export async function validatePaymentData(paymentData: any): Promise<ValidationResult> {
  const errors: string[] = []
  const warnings: string[] = []

  // Required fields
  if (!paymentData.patient_id) {
    errors.push('ID del paciente es requerido')
  }

  if (!paymentData.monto || paymentData.monto <= 0) {
    errors.push('El monto debe ser mayor a 0')
  }

  if (!paymentData.metodo_pago) {
    errors.push('Método de pago es requerido')
  }

  // Payment method validation
  const validPaymentMethods = ['efectivo', 'transferencia', 'bbva', 'clip']
  if (paymentData.metodo_pago && !validPaymentMethods.includes(paymentData.metodo_pago)) {
    errors.push('Método de pago inválido')
  }

  // Cash payment validation
  if (paymentData.metodo_pago === 'efectivo' && paymentData.monto_recibido) {
    const montoRecibido = parseFloat(paymentData.monto_recibido)
    const monto = parseFloat(paymentData.monto)
    
    if (montoRecibido < monto) {
      errors.push('El monto recibido no puede ser menor al total')
    }
    
    if (montoRecibido > monto * 2) {
      warnings.push('El monto recibido es muy alto comparado con el total')
    }
  }

  // Amount validation
  if (paymentData.monto > 50000) {
    warnings.push('Monto muy alto - verificar que sea correcto')
  }

  // Cashier validation
  if (!paymentData.cajera_id) {
    warnings.push('No se especificó cajera - se asignará automáticamente')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Sanitize appointment data before database insertion
export async function sanitizeAppointmentData(appointmentData: any): Promise<any> {
  const sanitized = { ...appointmentData }

  // Ensure required fields have proper defaults
  sanitized.status = sanitized.status || 'agendada'
  sanitized.numero_sesion = sanitized.numero_sesion || 1

  // Clean text fields
  if (sanitized.observaciones_caja) {
    sanitized.observaciones_caja = sanitized.observaciones_caja.trim()
  }

  if (sanitized.observaciones_operadora) {
    sanitized.observaciones_operadora = sanitized.observaciones_operadora.trim()
  }

  // Ensure fecha_hora is properly formatted
  if (sanitized.fecha_hora) {
    sanitized.fecha_hora = new Date(sanitized.fecha_hora).toISOString()
  }

  // Remove any undefined or null values that shouldn't be in the database
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key]
    }
  })

  return sanitized
}

// Sanitize payment data before database insertion
export async function sanitizePaymentData(paymentData: any): Promise<any> {
  const sanitized = { ...paymentData }

  // Ensure required fields have proper defaults
  sanitized.tipo_pago = sanitized.tipo_pago || 'pago_sesion'
  sanitized.fecha_pago = sanitized.fecha_pago || new Date().toISOString()

  // Clean text fields
  if (sanitized.observaciones) {
    sanitized.observaciones = sanitized.observaciones.trim()
  }

  if (sanitized.referencia) {
    sanitized.referencia = sanitized.referencia.trim()
  }

  // Ensure monto is a number
  if (sanitized.monto) {
    sanitized.monto = parseFloat(sanitized.monto)
  }

  // Set bank based on payment method if not provided
  if (!sanitized.banco) {
    if (sanitized.metodo_pago === 'bbva') {
      sanitized.banco = 'BBVA'
    } else if (sanitized.metodo_pago === 'clip') {
      sanitized.banco = 'Clip'
    }
  }

  // Generate reference if needed and not provided
  if (!sanitized.referencia && sanitized.metodo_pago !== 'efectivo') {
    sanitized.referencia = `REF-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Remove any undefined or null values that shouldn't be in the database
  Object.keys(sanitized).forEach(key => {
    if (sanitized[key] === undefined) {
      delete sanitized[key]
    }
  })

  return sanitized
}

// Get a valid user ID for database operations
export async function getValidUserId(userId?: string): Promise<string | null> {
  // If a user ID is provided, validate it exists and is active
  if (userId) {
    try {
      const { data: user } = await supabase
        .from('users')
        .select('id')
        .eq('id', userId)
        .eq('is_active', true)
        .single()

      if (user) {
        return userId
      }
    } catch (error) {
      console.warn('Provided user ID is not valid:', error)
    }
  }

  // Try to get the current authenticated user
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      // Verify the user exists in our users table
      const { data: userProfile } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .eq('is_active', true)
        .single()

      if (userProfile) {
        return user.id
      }
    }
  } catch (error) {
    console.warn('Could not get current user:', error)
  }

  // As a last resort, try to get any active admin user
  try {
    const { data: adminUser } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'administrador')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (adminUser) {
      console.warn('Using admin user as fallback for database operation')
      return adminUser.id
    }
  } catch (error) {
    console.warn('Could not get admin user as fallback:', error)
  }

  // If all else fails, return null and let the calling function handle it
  console.error('Could not determine a valid user ID for database operation')
  return null
}

// Database connection test
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)

    if (error) {
      console.error('Database connection test failed:', error)
      return false
    }

    console.log('Database connection test successful')
    return true
  } catch (error) {
    console.error('Database connection test error:', error)
    return false
  }
}

// Utility function to format currency
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}

// Utility function to validate email
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Utility function to validate phone number
export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\d{10}$/
  const cleanPhone = phone.replace(/\D/g, '')
  return phoneRegex.test(cleanPhone)
}

// Utility function to generate client number
export function generateClientNumber(): string {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substr(2, 4).toUpperCase()
  return `DC-${timestamp}-${random}`
}

// Database health check
export async function checkDatabaseHealth(): Promise<{
  isHealthy: boolean
  tables: Record<string, boolean>
  errors: string[]
}> {
  const tables = ['users', 'patients', 'services', 'appointments', 'payments', 'roles']
  const tableStatus: Record<string, boolean> = {}
  const errors: string[] = []
  let isHealthy = true

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count')
        .limit(1)

      if (error) {
        tableStatus[table] = false
        errors.push(`Error accessing table ${table}: ${error.message}`)
        isHealthy = false
      } else {
        tableStatus[table] = true
      }
    } catch (error) {
      tableStatus[table] = false
      errors.push(`Exception accessing table ${table}: ${(error as Error).message}`)
      isHealthy = false
    }
  }

  return {
    isHealthy,
    tables: tableStatus,
    errors
  }
}