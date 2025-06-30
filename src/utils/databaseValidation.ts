import { supabase } from '../lib/supabase'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Función simplificada para validar que un usuario existe
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
    return false
  }
}

// Función simplificada para obtener un usuario válido
export const getValidUserId = async (preferredUserId?: string | null): Promise<string | null> => {
  if (preferredUserId) {
    const isValid = await validateUserExists(preferredUserId)
    if (isValid) return preferredUserId
  }

  try {
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .eq('is_active', true)
      .limit(1)
      .single()

    return data?.id || null
  } catch (error) {
    return null
  }
}

// Validación simplificada de datos de paciente
export const validatePatientData = (data: any): ValidationResult => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data.nombre_completo?.trim()) {
    errors.push('El nombre completo es requerido')
  }

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

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validación simplificada de datos de cita
export const validateAppointmentData = async (data: any): Promise<ValidationResult> => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data.patient_id) {
    errors.push('Debe seleccionar un paciente')
  }

  if (!data.service_id) {
    errors.push('Debe seleccionar un servicio')
  }

  if (!data.fecha_hora) {
    errors.push('Debe seleccionar fecha y hora')
  } else {
    const appointmentDate = new Date(data.fecha_hora)
    const now = new Date()
    
    if (appointmentDate <= now) {
      warnings.push('La fecha de la cita es en el pasado')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

// Validación simplificada de datos de pago
export const validatePaymentData = async (data: any): Promise<ValidationResult> => {
  const errors: string[] = []
  const warnings: string[] = []

  if (!data.patient_id) {
    errors.push('Debe especificar un paciente')
  }

  if (!data.monto || parseFloat(data.monto) <= 0) {
    errors.push('El monto debe ser mayor a 0')
  }

  if (!data.metodo_pago) {
    errors.push('Debe seleccionar un método de pago')
  }

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

// Función simplificada para limpiar datos de cita
export const sanitizeAppointmentData = async (data: any) => {
  return {
    patient_id: data.patient_id,
    service_id: data.service_id,
    operadora_id: data.operadora_id || null,
    cajera_id: data.cajera_id || null,
    fecha_hora: data.fecha_hora,
    duracion_minutos: data.duracion_minutos || null,
    numero_sesion: data.numero_sesion || 1,
    status: data.status || 'agendada',
    observaciones_caja: data.observaciones_caja?.trim() || null,
    observaciones_operadora: data.observaciones_operadora?.trim() || null,
    is_paid: data.is_paid || false
  }
}

// Función simplificada para limpiar datos de pago
export const sanitizePaymentData = async (data: any) => {
  return {
    patient_id: data.patient_id,
    appointment_id: data.appointment_id || null,
    monto: parseFloat(data.monto),
    metodo_pago: data.metodo_pago,
    fecha_pago: data.fecha_pago || new Date().toISOString(),
    cajera_id: data.cajera_id || null,
    banco: data.banco?.trim() || null,
    referencia: data.referencia?.trim() || null,
    observaciones: data.observaciones?.trim() || null,
    tipo_pago: data.tipo_pago || 'pago_sesion'
  }
}