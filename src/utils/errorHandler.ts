// Manejo centralizado de errores

interface ErrorDetails {
  message: string
  code?: string
  details?: any
}

export class AppError extends Error {
  public code: string
  public details: any

  constructor(message: string, code: string = 'UNKNOWN_ERROR', details?: any) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.details = details
  }
}

export const handleSupabaseError = (error: any): ErrorDetails => {
  console.error('Supabase Error:', error)

  // Errores específicos de Supabase
  if (error?.code) {
    switch (error.code) {
      case 'PGRST116':
        return {
          message: 'No se encontraron registros que coincidan con los criterios',
          code: 'NOT_FOUND'
        }
      
      case '23505':
        return {
          message: 'Ya existe un registro con estos datos. Verifica los campos únicos.',
          code: 'DUPLICATE_KEY'
        }
      
      case '23503':
        return {
          message: 'No se puede completar la operación. Verifica que todos los datos relacionados existan.',
          code: 'FOREIGN_KEY_VIOLATION'
        }
      
      case '23514':
        return {
          message: 'Los datos no cumplen con las restricciones requeridas.',
          code: 'CHECK_VIOLATION'
        }
      
      case '42501':
        return {
          message: 'No tienes permisos para realizar esta acción.',
          code: 'INSUFFICIENT_PRIVILEGE'
        }
      
      case 'row_level_security_violated':
        return {
          message: 'No tienes permisos para acceder a estos datos.',
          code: 'RLS_VIOLATION'
        }
      
      default:
        return {
          message: `Error de base de datos: ${error.message}`,
          code: error.code,
          details: error
        }
    }
  }

  // Errores de red o conexión
  if (error?.message?.includes('fetch')) {
    return {
      message: 'Error de conexión. Verifica tu conexión a internet.',
      code: 'NETWORK_ERROR'
    }
  }

  // Error genérico
  return {
    message: error?.message || 'Ha ocurrido un error inesperado',
    code: 'UNKNOWN_ERROR',
    details: error
  }
}

export const showErrorMessage = (error: any, fallbackMessage?: string) => {
  const errorDetails = handleSupabaseError(error)
  const message = fallbackMessage || errorDetails.message
  
  // En desarrollo, mostrar detalles adicionales
  if (import.meta.env.DEV) {
    console.error('Error Details:', errorDetails)
  }
  
  alert(message)
}

export const handleAsyncError = async <T>(
  operation: () => Promise<T>,
  errorMessage?: string
): Promise<T | null> => {
  try {
    return await operation()
  } catch (error) {
    showErrorMessage(error, errorMessage)
    return null
  }
}

// Hook para manejo de errores en componentes
export const useErrorHandler = () => {
  const handleError = (error: any, customMessage?: string) => {
    showErrorMessage(error, customMessage)
  }

  const handleAsyncOperation = async <T>(
    operation: () => Promise<T>,
    successMessage?: string,
    errorMessage?: string
  ): Promise<T | null> => {
    try {
      const result = await operation()
      if (successMessage) {
        alert(successMessage)
      }
      return result
    } catch (error) {
      handleError(error, errorMessage)
      return null
    }
  }

  return {
    handleError,
    handleAsyncOperation
  }
}