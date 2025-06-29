// Utilidades de validación para formularios

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  // Acepta números mexicanos de 10 dígitos
  const cleanPhone = phone.replace(/\D/g, '')
  return cleanPhone.length === 10
}

export const validateDate = (dateString: string): boolean => {
  const date = new Date(dateString)
  const now = new Date()
  return date instanceof Date && !isNaN(date.getTime()) && date <= now
}

export const validateFutureDate = (dateString: string): boolean => {
  const date = new Date(dateString)
  const now = new Date()
  return date instanceof Date && !isNaN(date.getTime()) && date > now
}

export const validatePositiveNumber = (value: string | number): boolean => {
  const num = typeof value === 'string' ? parseFloat(value) : value
  return !isNaN(num) && num > 0
}

export const validateRequiredField = (value: string | null | undefined): boolean => {
  return value !== null && value !== undefined && value.trim().length > 0
}

export const sanitizeString = (value: string): string => {
  return value.trim().replace(/\s+/g, ' ')
}

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`
  }
  return phone
}

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN'
  }).format(amount)
}

// Validaciones específicas para formularios
export const validatePatientForm = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!validateRequiredField(data.nombre_completo)) {
    errors.push('El nombre completo es requerido')
  }

  if (data.telefono && !validatePhone(data.telefono)) {
    errors.push('El teléfono debe tener 10 dígitos')
  }

  if (data.cumpleanos && !validateDate(data.cumpleanos)) {
    errors.push('Fecha de nacimiento inválida')
  }

  if (data.precio_total && !validatePositiveNumber(data.precio_total)) {
    errors.push('El precio total debe ser un número positivo')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateAppointmentForm = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.patient_id) {
    errors.push('Debe seleccionar un paciente')
  }

  if (!data.service_id) {
    errors.push('Debe seleccionar un servicio')
  }

  if (!data.fecha_hora) {
    errors.push('Debe seleccionar fecha y hora')
  } else if (!validateFutureDate(data.fecha_hora)) {
    errors.push('La fecha y hora no puede ser en el pasado')
  }

  if (data.precio_sesion && !validatePositiveNumber(data.precio_sesion)) {
    errors.push('La duración debe ser un número positivo')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateServiceForm = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!validateRequiredField(data.nombre)) {
    errors.push('El nombre del servicio es requerido')
  }

  if (!data.zona) {
    errors.push('La zona corporal es requerida')
  }

  if (!data.precio_base || !validatePositiveNumber(data.precio_base)) {
    errors.push('El precio base debe ser mayor a 0')
  }

  if (data.duracion_minutos && !validatePositiveNumber(data.duracion_minutos)) {
    errors.push('La duración debe ser mayor a 0 minutos')
  }

  if (data.sesiones_recomendadas && !validatePositiveNumber(data.sesiones_recomendadas)) {
    errors.push('Las sesiones recomendadas deben ser mayor a 0')
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validatePaymentForm = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!data.cajera_id) {
    errors.push('Debe estar autenticado como cajero para procesar pagos')
  }

  if (!data.metodo_pago) {
    errors.push('Debe seleccionar un método de pago')
  }

  if (!data.monto || !validatePositiveNumber(data.monto)) {
    errors.push('El monto debe ser mayor a 0')
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
    errors
  }
}