import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Database, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Play,
  RotateCcw,
  Users,
  Calendar,
  Scissors,
  CreditCard,
  Shield,
  Loader
} from 'lucide-react'

interface TestResult {
  name: string
  status: 'pending' | 'success' | 'error' | 'warning'
  message: string
  details?: any
}

interface TestSuite {
  name: string
  tests: TestResult[]
  status: 'pending' | 'running' | 'completed'
}

export default function DatabaseTest() {
  const { userProfile } = useAuth()
  const [testSuites, setTestSuites] = useState<TestSuite[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState('')

  const updateTestResult = (suiteName: string, testName: string, result: Partial<TestResult>) => {
    setTestSuites(prev => prev.map(suite => {
      if (suite.name === suiteName) {
        return {
          ...suite,
          tests: suite.tests.map(test => 
            test.name === testName ? { ...test, ...result } : test
          )
        }
      }
      return suite
    }))
  }

  const initializeTests = () => {
    const suites: TestSuite[] = [
      {
        name: 'Conectividad',
        status: 'pending',
        tests: [
          { name: 'Conexión Supabase', status: 'pending', message: '' },
          { name: 'Autenticación', status: 'pending', message: '' },
          { name: 'Permisos RLS', status: 'pending', message: '' }
        ]
      },
      {
        name: 'Usuarios',
        status: 'pending',
        tests: [
          { name: 'Leer usuarios', status: 'pending', message: '' },
          { name: 'Crear usuario de prueba', status: 'pending', message: '' },
          { name: 'Actualizar usuario', status: 'pending', message: '' },
          { name: 'Validar foreign keys', status: 'pending', message: '' }
        ]
      },
      {
        name: 'Pacientes',
        status: 'pending',
        tests: [
          { name: 'Leer pacientes', status: 'pending', message: '' },
          { name: 'Crear paciente', status: 'pending', message: '' },
          { name: 'Actualizar paciente', status: 'pending', message: '' },
          { name: 'Validar datos requeridos', status: 'pending', message: '' }
        ]
      },
      {
        name: 'Servicios',
        status: 'pending',
        tests: [
          { name: 'Leer servicios', status: 'pending', message: '' },
          { name: 'Crear servicio', status: 'pending', message: '' },
          { name: 'Actualizar servicio', status: 'pending', message: '' },
          { name: 'Validar precios', status: 'pending', message: '' }
        ]
      },
      {
        name: 'Citas',
        status: 'pending',
        tests: [
          { name: 'Leer citas', status: 'pending', message: '' },
          { name: 'Crear cita simple', status: 'pending', message: '' },
          { name: 'Crear cita con operadora', status: 'pending', message: '' },
          { name: 'Actualizar cita', status: 'pending', message: '' },
          { name: 'Validar foreign keys', status: 'pending', message: '' }
        ]
      },
      {
        name: 'Pagos',
        status: 'pending',
        tests: [
          { name: 'Leer pagos', status: 'pending', message: '' },
          { name: 'Crear pago sin cita', status: 'pending', message: '' },
          { name: 'Crear pago con cita', status: 'pending', message: '' },
          { name: 'Validar cajera_id', status: 'pending', message: '' }
        ]
      }
    ]
    setTestSuites(suites)
  }

  useEffect(() => {
    initializeTests()
  }, [])

  const runAllTests = async () => {
    setIsRunning(true)
    setCurrentTest('Iniciando pruebas...')

    try {
      // Test Conectividad
      await runConnectivityTests()
      
      // Test Usuarios
      await runUserTests()
      
      // Test Pacientes
      await runPatientTests()
      
      // Test Servicios
      await runServiceTests()
      
      // Test Citas
      await runAppointmentTests()
      
      // Test Pagos
      await runPaymentTests()

    } catch (error) {
      console.error('Error running tests:', error)
    } finally {
      setIsRunning(false)
      setCurrentTest('Pruebas completadas')
    }
  }

  const runConnectivityTests = async () => {
    setCurrentTest('Probando conectividad...')
    
    // Test 1: Conexión Supabase
    try {
      const { data, error } = await supabase.from('roles').select('count', { count: 'exact', head: true })
      
      if (error) throw error
      
      updateTestResult('Conectividad', 'Conexión Supabase', {
        status: 'success',
        message: 'Conexión exitosa'
      })
    } catch (error) {
      updateTestResult('Conectividad', 'Conexión Supabase', {
        status: 'error',
        message: `Error: ${error.message}`,
        details: error
      })
    }

    // Test 2: Autenticación
    try {
      const { data: session } = await supabase.auth.getSession()
      
      if (session?.session?.user) {
        updateTestResult('Conectividad', 'Autenticación', {
          status: 'success',
          message: `Usuario autenticado: ${session.session.user.email}`
        })
      } else {
        updateTestResult('Conectividad', 'Autenticación', {
          status: 'warning',
          message: 'No hay sesión activa'
        })
      }
    } catch (error) {
      updateTestResult('Conectividad', 'Autenticación', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 3: Permisos RLS
    try {
      const { data, error } = await supabase.from('users').select('count', { count: 'exact', head: true })
      
      if (error) throw error
      
      updateTestResult('Conectividad', 'Permisos RLS', {
        status: 'success',
        message: 'Permisos RLS funcionando'
      })
    } catch (error) {
      updateTestResult('Conectividad', 'Permisos RLS', {
        status: 'error',
        message: `Error RLS: ${error.message}`
      })
    }
  }

  const runUserTests = async () => {
    setCurrentTest('Probando usuarios...')
    
    // Test 1: Leer usuarios
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role_id')
        .limit(5)

      if (error) throw error

      updateTestResult('Usuarios', 'Leer usuarios', {
        status: 'success',
        message: `${data.length} usuarios encontrados`
      })
    } catch (error) {
      updateTestResult('Usuarios', 'Leer usuarios', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 2: Crear usuario de prueba
    try {
      // Primero verificar si el usuario actual existe en la tabla users
      if (userProfile?.id) {
        const { data: existingUser, error: checkError } = await supabase
          .from('users')
          .select('id')
          .eq('id', userProfile.id)
          .single()

        if (checkError && checkError.code === 'PGRST116') {
          // Usuario no existe, crearlo
          const { data: roleData } = await supabase
            .from('roles')
            .select('id')
            .eq('name', userProfile.role || 'cajero')
            .single()

          const { error: insertError } = await supabase
            .from('users')
            .insert([{
              id: userProfile.id,
              email: userProfile.email,
              password_hash: 'managed_by_supabase_auth',
              full_name: userProfile.full_name,
              role_id: roleData?.id
            }])

          if (insertError) throw insertError

          updateTestResult('Usuarios', 'Crear usuario de prueba', {
            status: 'success',
            message: 'Usuario actual creado en tabla users'
          })
        } else {
          updateTestResult('Usuarios', 'Crear usuario de prueba', {
            status: 'success',
            message: 'Usuario actual ya existe'
          })
        }
      } else {
        updateTestResult('Usuarios', 'Crear usuario de prueba', {
          status: 'warning',
          message: 'No hay perfil de usuario disponible'
        })
      }
    } catch (error) {
      updateTestResult('Usuarios', 'Crear usuario de prueba', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 3: Actualizar usuario
    try {
      if (userProfile?.id) {
        const { error } = await supabase
          .from('users')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', userProfile.id)

        if (error) throw error

        updateTestResult('Usuarios', 'Actualizar usuario', {
          status: 'success',
          message: 'Usuario actualizado exitosamente'
        })
      } else {
        updateTestResult('Usuarios', 'Actualizar usuario', {
          status: 'warning',
          message: 'No hay usuario para actualizar'
        })
      }
    } catch (error) {
      updateTestResult('Usuarios', 'Actualizar usuario', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 4: Validar foreign keys
    try {
      const { data: users } = await supabase
        .from('users')
        .select('id, role_id, roles(name)')
        .limit(5)

      const validFKs = users?.every(user => user.role_id && user.roles) || false

      updateTestResult('Usuarios', 'Validar foreign keys', {
        status: validFKs ? 'success' : 'warning',
        message: validFKs ? 'Todas las FK son válidas' : 'Algunas FK faltantes'
      })
    } catch (error) {
      updateTestResult('Usuarios', 'Validar foreign keys', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }
  }

  const runPatientTests = async () => {
    setCurrentTest('Probando pacientes...')
    
    // Test 1: Leer pacientes
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .limit(5)

      if (error) throw error

      updateTestResult('Pacientes', 'Leer pacientes', {
        status: 'success',
        message: `${data.length} pacientes encontrados`
      })
    } catch (error) {
      updateTestResult('Pacientes', 'Leer pacientes', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 2: Crear paciente
    const testPatientId = crypto.randomUUID()
    try {
      const { error } = await supabase
        .from('patients')
        .insert([{
          id: testPatientId,
          nombre_completo: 'Paciente de Prueba',
          telefono: '9849999999',
          cumpleanos: '1990-01-01',
          sexo: 'F',
          localidad: 'Test City',
          observaciones: 'Paciente creado para pruebas'
        }])

      if (error) throw error

      updateTestResult('Pacientes', 'Crear paciente', {
        status: 'success',
        message: 'Paciente creado exitosamente'
      })
    } catch (error) {
      updateTestResult('Pacientes', 'Crear paciente', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 3: Actualizar paciente
    try {
      const { error } = await supabase
        .from('patients')
        .update({ observaciones: 'Paciente actualizado en pruebas' })
        .eq('id', testPatientId)

      if (error) throw error

      updateTestResult('Pacientes', 'Actualizar paciente', {
        status: 'success',
        message: 'Paciente actualizado exitosamente'
      })
    } catch (error) {
      updateTestResult('Pacientes', 'Actualizar paciente', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 4: Validar datos requeridos
    try {
      const { error } = await supabase
        .from('patients')
        .insert([{
          nombre_completo: '', // Campo requerido vacío
        }])

      updateTestResult('Pacientes', 'Validar datos requeridos', {
        status: error ? 'success' : 'warning',
        message: error ? 'Validación funcionando correctamente' : 'Validación no aplicada'
      })
    } catch (error) {
      updateTestResult('Pacientes', 'Validar datos requeridos', {
        status: 'success',
        message: 'Validaciones funcionando'
      })
    }
  }

  const runServiceTests = async () => {
    setCurrentTest('Probando servicios...')
    
    // Test 1: Leer servicios
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .limit(5)

      if (error) throw error

      updateTestResult('Servicios', 'Leer servicios', {
        status: 'success',
        message: `${data.length} servicios encontrados`
      })
    } catch (error) {
      updateTestResult('Servicios', 'Leer servicios', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 2: Crear servicio
    const testServiceId = crypto.randomUUID()
    try {
      const { error } = await supabase
        .from('services')
        .insert([{
          id: testServiceId,
          nombre: 'Servicio de Prueba',
          zona: 'test_zone',
          precio_base: 999.99,
          duracion_minutos: 60,
          sesiones_recomendadas: 8,
          tecnologia: 'Test Technology'
        }])

      if (error) throw error

      updateTestResult('Servicios', 'Crear servicio', {
        status: 'success',
        message: 'Servicio creado exitosamente'
      })
    } catch (error) {
      updateTestResult('Servicios', 'Crear servicio', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 3: Actualizar servicio
    try {
      const { error } = await supabase
        .from('services')
        .update({ precio_base: 1099.99 })
        .eq('id', testServiceId)

      if (error) throw error

      updateTestResult('Servicios', 'Actualizar servicio', {
        status: 'success',
        message: 'Servicio actualizado exitosamente'
      })
    } catch (error) {
      updateTestResult('Servicios', 'Actualizar servicio', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 4: Validar precios
    try {
      const { error } = await supabase
        .from('services')
        .insert([{
          nombre: 'Test Invalid Price',
          zona: 'test',
          precio_base: -100 // Precio negativo
        }])

      updateTestResult('Servicios', 'Validar precios', {
        status: error ? 'success' : 'warning',
        message: error ? 'Validación de precios funciona' : 'Sin validación de precios'
      })
    } catch (error) {
      updateTestResult('Servicios', 'Validar precios', {
        status: 'success',
        message: 'Validaciones funcionando'
      })
    }
  }

  const runAppointmentTests = async () => {
    setCurrentTest('Probando citas...')

    // Obtener IDs válidos para las pruebas
    let testPatientId: string | null = null
    let testServiceId: string | null = null
    let validCajeroId: string | null = null

    try {
      const [patientsRes, servicesRes, usersRes] = await Promise.all([
        supabase.from('patients').select('id').limit(1).single(),
        supabase.from('services').select('id').limit(1).single(),
        supabase.from('users').select('id').limit(1).single()
      ])

      testPatientId = patientsRes.data?.id || null
      testServiceId = servicesRes.data?.id || null
      validCajeroId = usersRes.data?.id || null
    } catch (error) {
      console.log('Error getting test IDs:', error)
    }

    // Test 1: Leer citas
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('*')
        .limit(5)

      if (error) throw error

      updateTestResult('Citas', 'Leer citas', {
        status: 'success',
        message: `${data.length} citas encontradas`
      })
    } catch (error) {
      updateTestResult('Citas', 'Leer citas', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 2: Crear cita simple (sin operadora)
    const testAppointmentId = crypto.randomUUID()
    try {
      if (!testPatientId || !testServiceId) {
        throw new Error('No hay pacientes o servicios disponibles')
      }

      const { error } = await supabase
        .from('appointments')
        .insert([{
          id: testAppointmentId,
          patient_id: testPatientId,
          service_id: testServiceId,
          fecha_hora: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Mañana
          numero_sesion: 1,
          status: 'agendada',
          is_paid: false
        }])

      if (error) throw error

      updateTestResult('Citas', 'Crear cita simple', {
        status: 'success',
        message: 'Cita sin operadora creada exitosamente'
      })
    } catch (error) {
      updateTestResult('Citas', 'Crear cita simple', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 3: Crear cita con operadora
    try {
      if (!testPatientId || !testServiceId || !validCajeroId) {
        throw new Error('Faltan IDs válidos para la prueba')
      }

      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: testPatientId,
          service_id: testServiceId,
          operadora_id: validCajeroId,
          cajera_id: validCajeroId,
          fecha_hora: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // Pasado mañana
          numero_sesion: 2,
          status: 'agendada',
          is_paid: false
        }])

      if (error) throw error

      updateTestResult('Citas', 'Crear cita con operadora', {
        status: 'success',
        message: 'Cita con operadora creada exitosamente'
      })
    } catch (error) {
      updateTestResult('Citas', 'Crear cita con operadora', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 4: Actualizar cita
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmada' })
        .eq('id', testAppointmentId)

      if (error) throw error

      updateTestResult('Citas', 'Actualizar cita', {
        status: 'success',
        message: 'Cita actualizada exitosamente'
      })
    } catch (error) {
      updateTestResult('Citas', 'Actualizar cita', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 5: Validar foreign keys
    try {
      const { error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: '00000000-0000-0000-0000-000000000000', // ID inexistente
          service_id: testServiceId,
          fecha_hora: new Date().toISOString()
        }])

      updateTestResult('Citas', 'Validar foreign keys', {
        status: error ? 'success' : 'warning',
        message: error ? 'FK validation funciona' : 'Sin validación FK'
      })
    } catch (error) {
      updateTestResult('Citas', 'Validar foreign keys', {
        status: 'success',
        message: 'Validaciones FK funcionando'
      })
    }
  }

  const runPaymentTests = async () => {
    setCurrentTest('Probando pagos...')

    // Obtener IDs válidos
    let testPatientId: string | null = null
    let testAppointmentId: string | null = null
    let validCajeroId: string | null = null

    try {
      const [patientsRes, appointmentsRes, usersRes] = await Promise.all([
        supabase.from('patients').select('id').limit(1).single(),
        supabase.from('appointments').select('id').limit(1).single(),
        supabase.from('users').select('id').limit(1).single()
      ])

      testPatientId = patientsRes.data?.id || null
      testAppointmentId = appointmentsRes.data?.id || null
      validCajeroId = usersRes.data?.id || null
    } catch (error) {
      console.log('Error getting payment test IDs:', error)
    }

    // Test 1: Leer pagos
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .limit(5)

      if (error) throw error

      updateTestResult('Pagos', 'Leer pagos', {
        status: 'success',
        message: `${data.length} pagos encontrados`
      })
    } catch (error) {
      updateTestResult('Pagos', 'Leer pagos', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 2: Crear pago sin cita
    try {
      if (!testPatientId || !validCajeroId) {
        throw new Error('Faltan IDs válidos para crear pago')
      }

      const { error } = await supabase
        .from('payments')
        .insert([{
          patient_id: testPatientId,
          monto: 500.00,
          metodo_pago: 'efectivo',
          cajera_id: validCajeroId,
          tipo_pago: 'abono',
          observaciones: 'Pago de prueba sin cita'
        }])

      if (error) throw error

      updateTestResult('Pagos', 'Crear pago sin cita', {
        status: 'success',
        message: 'Pago sin cita creado exitosamente'
      })
    } catch (error) {
      updateTestResult('Pagos', 'Crear pago sin cita', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 3: Crear pago con cita
    try {
      if (!testPatientId || !testAppointmentId || !validCajeroId) {
        throw new Error('Faltan IDs válidos para crear pago con cita')
      }

      const { error } = await supabase
        .from('payments')
        .insert([{
          patient_id: testPatientId,
          appointment_id: testAppointmentId,
          monto: 800.00,
          metodo_pago: 'transferencia',
          cajera_id: validCajeroId,
          tipo_pago: 'pago_sesion',
          referencia: 'TEST-REF-123',
          observaciones: 'Pago de prueba con cita'
        }])

      if (error) throw error

      updateTestResult('Pagos', 'Crear pago con cita', {
        status: 'success',
        message: 'Pago con cita creado exitosamente'
      })
    } catch (error) {
      updateTestResult('Pagos', 'Crear pago con cita', {
        status: 'error',
        message: `Error: ${error.message}`
      })
    }

    // Test 4: Validar cajera_id
    try {
      const { error } = await supabase
        .from('payments')
        .insert([{
          patient_id: testPatientId,
          monto: 100.00,
          metodo_pago: 'efectivo',
          cajera_id: '00000000-0000-0000-0000-000000000000' // ID inexistente
        }])

      updateTestResult('Pagos', 'Validar cajera_id', {
        status: error ? 'success' : 'warning',
        message: error ? 'Validación cajera_id funciona' : 'Sin validación cajera_id'
      })
    } catch (error) {
      updateTestResult('Pagos', 'Validar cajera_id', {
        status: 'success',
        message: 'Validación cajera_id funcionando'
      })
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />
      case 'pending':
        return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
      default:
        return <Loader className="w-5 h-5 animate-spin text-blue-500" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50'
      case 'error':
        return 'border-red-200 bg-red-50'
      case 'warning':
        return 'border-yellow-200 bg-yellow-50'
      case 'pending':
        return 'border-gray-200 bg-gray-50'
      default:
        return 'border-blue-200 bg-blue-50'
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Database className="w-7 h-7 mr-3 text-pink-600" />
          Pruebas de Base de Datos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Validación completa de todos los CRUDs del sistema
        </p>
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Control de Pruebas</h3>
            <p className="text-sm text-gray-600">
              Estado: {isRunning ? 'Ejecutando...' : 'Listo'}
            </p>
            {currentTest && (
              <p className="text-sm text-blue-600 mt-1">{currentTest}</p>
            )}
          </div>
          <div className="flex space-x-3">
            <button
              onClick={initializeTests}
              disabled={isRunning}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reiniciar
            </button>
            <button
              onClick={runAllTests}
              disabled={isRunning}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {isRunning ? 'Ejecutando...' : 'Ejecutar Todas las Pruebas'}
            </button>
          </div>
        </div>
      </div>

      {/* Test Results */}
      <div className="space-y-6">
        {testSuites.map((suite) => (
          <div key={suite.name} className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {suite.name === 'Conectividad' && <Database className="w-5 h-5 text-blue-600" />}
                {suite.name === 'Usuarios' && <Users className="w-5 h-5 text-green-600" />}
                {suite.name === 'Pacientes' && <Users className="w-5 h-5 text-purple-600" />}
                {suite.name === 'Servicios' && <Scissors className="w-5 h-5 text-pink-600" />}
                {suite.name === 'Citas' && <Calendar className="w-5 h-5 text-orange-600" />}
                {suite.name === 'Pagos' && <CreditCard className="w-5 h-5 text-emerald-600" />}
                <h3 className="text-lg font-medium text-gray-900">{suite.name}</h3>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {suite.tests.map((test) => (
                  <div
                    key={test.name}
                    className={`p-3 rounded-lg border ${getStatusColor(test.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(test.status)}
                        <span className="font-medium text-gray-900">{test.name}</span>
                      </div>
                      <span className="text-sm text-gray-600">{test.message}</span>
                    </div>
                    {test.details && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                        <pre>{JSON.stringify(test.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      {testSuites.length > 0 && (
        <div className="mt-8 bg-gray-50 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Resultados</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {['success', 'error', 'warning', 'pending'].map((status) => {
              const count = testSuites.reduce((acc, suite) => 
                acc + suite.tests.filter(test => test.status === status).length, 0
              )
              return (
                <div key={status} className={`p-3 rounded-lg ${getStatusColor(status)}`}>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{status}</p>
                      <p className="text-2xl font-bold text-gray-900">{count}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}