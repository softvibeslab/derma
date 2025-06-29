import { supabase } from '../lib/supabase'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Función para validar que un usuario existe
export const validateUserExists = async (userId: string): Promise<boolean> => {
  if (!userId) return false
  
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    return !error && !!data
  } catch (error) {
    console.error('Error validating user:', error)
    return false
  }
}

// Función para obtener o crear un usuario válido para operaciones
export const getValidUserId = async (preferredUserId?: string | null): Promise<string | null> => {
  // Si se proporciona un ID, verificar que existe
  if (preferredUserId && await validateUserExists(preferredUserId)) {
    return preferredUserId
  }

  // Buscar cualquier usuario disponible
  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    if (!error && data) {
      return data.id
    }
  } catch (error) {
    console.error('Error getting valid user ID:', error)
  }

  return null
}

// Función para validar datos de paciente
export const validatePatientData = (data: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validaciones requeridas
  if (!data.nombre_completo?.trim()) {
    errors.push('El nombre completo es requerido')
  }

  // Validaciones opcionales con advertencias
  if (data.telefono && data.telefono.trim()) {
    const cleanPhone = data.telefono.replace(/\D/g, '')
    if (cleanPhone.length !== 10) {
      warnings.push('El teléfono debe tener 10 dígitos')
    }
  }

  if (data.cumpleanos) {
    const birthDate = new Date(data.cumpleanos)
    const today = new Date()
    const age = today.getFullYear() - birthDate.getFullYear()
    
    if (age < 0 || age > 120) {
      errors.push('Fecha de nacimiento inválida')
    }
  }

  if (data.precio_total && isNaN(parseFloat(data.precio_total))) {
    errors.push('El precio total debe ser un número válido')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Función para validar datos de cita
export const validateAppointmentData = async (data: any): Promise<ValidationResult> => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validaciones requeridas
  if (!data.patient_id) {
    errors.push('Debe seleccionar un paciente')
  } else {
    // Verificar que el paciente existe
    const patientExists = await validateUserExists(data.patient_id)
    if (!patientExists) {
      const { data: patient } = await supabase
        .from('patients')
        .select('id')
        .eq('id', data.patient_id)
        .single()
      
      if (!patient) {
        errors.push('El paciente seleccionado no existe')
      }
    }
  }

  if (!data.service_id) {
    errors.push('Debe seleccionar un servicio')
  } else {
    // Verificar que el servicio existe
    const { data: service } = await supabase
      .from('services')
      .select('id')
      .eq('id', data.service_id)
      .single()
    
    if (!service) {
      errors.push('El servicio seleccionado no existe')
    }
  }

  if (!data.fecha_hora) {
    errors.push('Debe seleccionar fecha y hora')
  } else {
    const appointmentDate = new Date(data.fecha_hora)
    const now = new Date()
    
    if (appointmentDate <= now) {
      errors.push('La fecha y hora no puede ser en el pasado')
    }
  }

  // Validaciones opcionales
  if (data.operadora_id) {
    const operadoraExists = await validateUserExists(data.operadora_id)
    if (!operadoraExists) {
      warnings.push('La operadora seleccionada no existe, se creará la cita sin operadora')
    }
  }

  if (data.cajera_id) {
    const cajeraExists = await validateUserExists(data.cajera_id)
    if (!cajeraExists) {
      errors.push('El ID de cajera no es válido')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Función para validar datos de pago
export const validatePaymentData = async (data: any): Promise<ValidationResult> => {
  const errors: string[] = []
  const warnings: string[] = []

  // Validaciones requeridas
  if (!data.patient_id) {
    errors.push('Debe especificar un paciente')
  } else {
    const { data: patient } = await supabase
      .from('patients')
      .select('id')
      .eq('id', data.patient_id)
      .single()
    
    if (!patient) {
      errors.push('El paciente especificado no existe')
    }
  }

  if (!data.monto || isNaN(parseFloat(data.monto)) || parseFloat(data.monto) <= 0) {
    errors.push('El monto debe ser mayor a 0')
  }

  if (!data.metodo_pago) {
    errors.push('Debe seleccionar un método de pago')
  }

  // Validar cajera_id
  if (data.cajera_id) {
    const cajeraExists = await validateUserExists(data.cajera_id)
    if (!cajeraExists) {
      warnings.push('El ID de cajera no es válido, se procesará sin cajera asignada')
    }
  }

  // Validar appointment_id si se proporciona
  if (data.appointment_id) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', data.appointment_id)
      .single()
    
    if (!appointment) {
      warnings.push('La cita especificada no existe')
    }
  }

  // Validaciones específicas por método de pago
  if (data.metodo_pago === 'efectivo' && data.monto_recibido) {
    const recibido = parseFloat(data.monto_recibido)
    const monto = parseFloat(data.monto)
    
    if (recibido < monto) {
      errors.push('El monto recibido debe ser mayor o igual al total')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Función para limpiar y preparar datos antes de insertar
export const sanitizeAppointmentData = async (data: any) => {
  const sanitized = { ...data }

  // Limpiar campos opcionales
  sanitized.operadora_id = sanitized.operadora_id || null
  sanitized.observaciones_caja = sanitized.observaciones_caja?.trim() || null
  sanitized.observaciones_operadora = sanitized.observaciones_operadora?.trim() || null

  // Validar y corregir cajera_id
  if (sanitized.cajera_id && !(await validateUserExists(sanitized.cajera_id))) {
    console.warn('Invalid cajera_id provided, setting to null')
    sanitized.cajera_id = null
  }

  // Validar y corregir operadora_id
  if (sanitized.operadora_id && !(await validateUserExists(sanitized.operadora_id))) {
    console.warn('Invalid operadora_id provided, setting to null')
    sanitized.operadora_id = null
  }

  return sanitized
}

// Función para limpiar y preparar datos de pago
export const sanitizePaymentData = async (data: any) => {
  const sanitized = { ...data }

  // Limpiar campos opcionales
  sanitized.observaciones = sanitized.observaciones?.trim() || null
  sanitized.referencia = sanitized.referencia?.trim() || null
  sanitized.banco = sanitized.banco?.trim() || null

  // Validar y corregir cajera_id
  if (sanitized.cajera_id && !(await validateUserExists(sanitized.cajera_id))) {
    console.warn('Invalid cajera_id provided, setting to null')
    sanitized.cajera_id = null
  }

  // Asegurar que appointment_id sea null si no es válido
  if (sanitized.appointment_id) {
    const { data: appointment } = await supabase
      .from('appointments')
      .select('id')
      .eq('id', sanitized.appointment_id)
      .single()
    
    if (!appointment) {
      console.warn('Invalid appointment_id provided, setting to null')
      sanitized.appointment_id = null
    }
  }

  return sanitized
}

// Función para verificar integridad de datos después de operaciones
export const verifyDataIntegrity = async (): Promise<{
  orphanedAppointments: number,
  orphanedPayments: number,
  invalidUserReferences: number
}> => {
  try {
    // Verificar citas con referencias inválidas
    const { data: orphanedAppointments } = await supabase
      .from('appointments')
      .select('id', { count: 'exact', head: true })
      .is('patient_id', null)

    // Verificar pagos con referencias inválidas
    const { data: orphanedPayments } = await supabase
      .from('payments')
      .select('id', { count: 'exact', head: true })
      .is('patient_id', null)

    // Verificar usuarios con role_id inválido
    const { data: invalidUserReferences } = await supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .is('role_id', null)

    return {
      orphanedAppointments: orphanedAppointments?.length || 0,
      orphanedPayments: orphanedPayments?.length || 0,
      invalidUserReferences: invalidUserReferences?.length || 0
    }
  } catch (error) {
    console.error('Error verifying data integrity:', error)
    return {
      orphanedAppointments: 0,
      orphanedPayments: 0,
      invalidUserReferences: 0
    }
  }
}