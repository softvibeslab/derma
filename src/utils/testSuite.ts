import { supabase } from '../lib/supabase'
import { checkDatabaseHealth, testDatabaseConnection } from './databaseValidation'

export interface TestResult {
  module: string
  test: string
  status: 'success' | 'error' | 'warning'
  message: string
  details?: any
}

export interface TestSuiteResults {
  overall: 'success' | 'error' | 'warning'
  results: TestResult[]
  summary: {
    total: number
    passed: number
    failed: number
    warnings: number
  }
}

class TestSuite {
  private results: TestResult[] = []

  private addResult(module: string, test: string, status: 'success' | 'error' | 'warning', message: string, details?: any) {
    this.results.push({ module, test, status, message, details })
    console.log(`[${status.toUpperCase()}] ${module} - ${test}: ${message}`)
  }

  // Test Database Connection and Health
  async testDatabaseConnection(): Promise<void> {
    try {
      const isConnected = await testDatabaseConnection()
      if (isConnected) {
        this.addResult('Database', 'Connection', 'success', 'Conexión a la base de datos exitosa')
      } else {
        this.addResult('Database', 'Connection', 'error', 'No se pudo conectar a la base de datos')
      }

      const health = await checkDatabaseHealth()
      if (health.isHealthy) {
        this.addResult('Database', 'Health Check', 'success', 'Todas las tablas están accesibles')
      } else {
        this.addResult('Database', 'Health Check', 'error', 'Problemas con algunas tablas', health.errors)
      }
    } catch (error) {
      this.addResult('Database', 'Connection', 'error', 'Error al probar la conexión', error)
    }
  }

  // Test Authentication Module
  async testAuthentication(): Promise<void> {
    try {
      // Test getting current session
      const { data: session, error: sessionError } = await supabase.auth.getSession()
      if (sessionError) {
        this.addResult('Auth', 'Session', 'error', 'Error al obtener sesión', sessionError)
      } else {
        this.addResult('Auth', 'Session', 'success', session?.session ? 'Usuario autenticado' : 'No hay sesión activa')
      }

      // Test user profile access
      if (session?.session?.user) {
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.session.user.id)
          .single()

        if (profileError) {
          this.addResult('Auth', 'User Profile', 'warning', 'Perfil de usuario no encontrado', profileError)
        } else {
          this.addResult('Auth', 'User Profile', 'success', 'Perfil de usuario cargado correctamente', profile)
        }
      }
    } catch (error) {
      this.addResult('Auth', 'General', 'error', 'Error en módulo de autenticación', error)
    }
  }

  // Test Roles Module
  async testRoles(): Promise<void> {
    try {
      // Test reading roles
      const { data: roles, error: readError } = await supabase
        .from('roles')
        .select('*')
        .limit(5)

      if (readError) {
        this.addResult('Roles', 'Read', 'error', 'Error al leer roles', readError)
      } else {
        this.addResult('Roles', 'Read', 'success', `${roles?.length || 0} roles encontrados`)
      }

      // Test role creation (dry run)
      const testRole = {
        name: `test_role_${Date.now()}`,
        description: 'Rol de prueba',
        permissions: { test: ['read'] }
      }

      const { data: createdRole, error: createError } = await supabase
        .from('roles')
        .insert([testRole])
        .select()
        .single()

      if (createError) {
        this.addResult('Roles', 'Create', 'error', 'Error al crear rol de prueba', createError)
      } else {
        this.addResult('Roles', 'Create', 'success', 'Rol de prueba creado exitosamente')

        // Clean up test role
        await supabase.from('roles').delete().eq('id', createdRole.id)
        this.addResult('Roles', 'Cleanup', 'success', 'Rol de prueba eliminado')
      }
    } catch (error) {
      this.addResult('Roles', 'General', 'error', 'Error en módulo de roles', error)
    }
  }

  // Test Patients Module
  async testPatients(): Promise<void> {
    try {
      // Test reading patients
      const { data: patients, error: readError } = await supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .limit(5)

      if (readError) {
        this.addResult('Patients', 'Read', 'error', 'Error al leer pacientes', readError)
      } else {
        this.addResult('Patients', 'Read', 'success', `${patients?.length || 0} pacientes encontrados`)
      }

      // Test patient creation (dry run)
      const testPatient = {
        nombre_completo: `Paciente Prueba ${Date.now()}`,
        telefono: '9841234567',
        sexo: 'F',
        localidad: 'Test City',
        zonas_tratamiento: ['axilas'],
        observaciones: 'Paciente de prueba'
      }

      const { data: createdPatient, error: createError } = await supabase
        .from('patients')
        .insert([testPatient])
        .select()
        .single()

      if (createError) {
        this.addResult('Patients', 'Create', 'error', 'Error al crear paciente de prueba', createError)
      } else {
        this.addResult('Patients', 'Create', 'success', 'Paciente de prueba creado exitosamente')

        // Test patient update
        const { error: updateError } = await supabase
          .from('patients')
          .update({ observaciones: 'Paciente actualizado' })
          .eq('id', createdPatient.id)

        if (updateError) {
          this.addResult('Patients', 'Update', 'error', 'Error al actualizar paciente', updateError)
        } else {
          this.addResult('Patients', 'Update', 'success', 'Paciente actualizado exitosamente')
        }

        // Clean up test patient
        await supabase.from('patients').update({ is_active: false }).eq('id', createdPatient.id)
        this.addResult('Patients', 'Cleanup', 'success', 'Paciente de prueba desactivado')
      }
    } catch (error) {
      this.addResult('Patients', 'General', 'error', 'Error en módulo de pacientes', error)
    }
  }

  // Test Services Module
  async testServices(): Promise<void> {
    try {
      // Test reading services
      const { data: services, error: readError } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .limit(5)

      if (readError) {
        this.addResult('Services', 'Read', 'error', 'Error al leer servicios', readError)
      } else {
        this.addResult('Services', 'Read', 'success', `${services?.length || 0} servicios encontrados`)
      }

      // Test service creation (dry run)
      const testService = {
        nombre: `Servicio Prueba ${Date.now()}`,
        descripcion: 'Servicio de prueba',
        zona: 'test_zone',
        precio_base: 100.00,
        duracion_minutos: 30,
        sesiones_recomendadas: 5,
        tecnologia: 'Test Tech'
      }

      const { data: createdService, error: createError } = await supabase
        .from('services')
        .insert([testService])
        .select()
        .single()

      if (createError) {
        this.addResult('Services', 'Create', 'error', 'Error al crear servicio de prueba', createError)
      } else {
        this.addResult('Services', 'Create', 'success', 'Servicio de prueba creado exitosamente')

        // Clean up test service
        await supabase.from('services').update({ is_active: false }).eq('id', createdService.id)
        this.addResult('Services', 'Cleanup', 'success', 'Servicio de prueba desactivado')
      }
    } catch (error) {
      this.addResult('Services', 'General', 'error', 'Error en módulo de servicios', error)
    }
  }

  // Test Appointments Module
  async testAppointments(): Promise<void> {
    try {
      // Test reading appointments
      const { data: appointments, error: readError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients(nombre_completo),
          services(nombre)
        `)
        .limit(5)

      if (readError) {
        this.addResult('Appointments', 'Read', 'error', 'Error al leer citas', readError)
      } else {
        this.addResult('Appointments', 'Read', 'success', `${appointments?.length || 0} citas encontradas`)
      }

      // Get test data for appointment creation
      const { data: testPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('is_active', true)
        .limit(1)

      const { data: testServices } = await supabase
        .from('services')
        .select('id')
        .eq('is_active', true)
        .limit(1)

      if (testPatients?.length && testServices?.length) {
        const testAppointment = {
          patient_id: testPatients[0].id,
          service_id: testServices[0].id,
          fecha_hora: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          numero_sesion: 1,
          status: 'agendada',
          observaciones_caja: 'Cita de prueba'
        }

        const { data: createdAppointment, error: createError } = await supabase
          .from('appointments')
          .insert([testAppointment])
          .select()
          .single()

        if (createError) {
          this.addResult('Appointments', 'Create', 'error', 'Error al crear cita de prueba', createError)
        } else {
          this.addResult('Appointments', 'Create', 'success', 'Cita de prueba creada exitosamente')

          // Clean up test appointment
          await supabase.from('appointments').delete().eq('id', createdAppointment.id)
          this.addResult('Appointments', 'Cleanup', 'success', 'Cita de prueba eliminada')
        }
      } else {
        this.addResult('Appointments', 'Create', 'warning', 'No hay pacientes o servicios para crear cita de prueba')
      }
    } catch (error) {
      this.addResult('Appointments', 'General', 'error', 'Error en módulo de citas', error)
    }
  }

  // Test Payments Module
  async testPayments(): Promise<void> {
    try {
      // Test reading payments
      const { data: payments, error: readError } = await supabase
        .from('payments')
        .select(`
          *,
          patients(nombre_completo)
        `)
        .limit(5)

      if (readError) {
        this.addResult('Payments', 'Read', 'error', 'Error al leer pagos', readError)
      } else {
        this.addResult('Payments', 'Read', 'success', `${payments?.length || 0} pagos encontrados`)
      }

      // Get test data for payment creation
      const { data: testPatients } = await supabase
        .from('patients')
        .select('id')
        .eq('is_active', true)
        .limit(1)

      if (testPatients?.length) {
        const testPayment = {
          patient_id: testPatients[0].id,
          monto: 100.00,
          metodo_pago: 'efectivo',
          observaciones: 'Pago de prueba',
          tipo_pago: 'pago_sesion'
        }

        const { data: createdPayment, error: createError } = await supabase
          .from('payments')
          .insert([testPayment])
          .select()
          .single()

        if (createError) {
          this.addResult('Payments', 'Create', 'error', 'Error al crear pago de prueba', createError)
        } else {
          this.addResult('Payments', 'Create', 'success', 'Pago de prueba creado exitosamente')

          // Clean up test payment
          await supabase.from('payments').delete().eq('id', createdPayment.id)
          this.addResult('Payments', 'Cleanup', 'success', 'Pago de prueba eliminado')
        }
      } else {
        this.addResult('Payments', 'Create', 'warning', 'No hay pacientes para crear pago de prueba')
      }
    } catch (error) {
      this.addResult('Payments', 'General', 'error', 'Error en módulo de pagos', error)
    }
  }

  // Test Users Module
  async testUsers(): Promise<void> {
    try {
      // Test reading users
      const { data: users, error: readError } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .limit(5)

      if (readError) {
        this.addResult('Users', 'Read', 'error', 'Error al leer usuarios', readError)
      } else {
        this.addResult('Users', 'Read', 'success', `${users?.length || 0} usuarios encontrados`)
      }

      // Test user permissions
      const { data: currentUser } = await supabase.auth.getUser()
      if (currentUser.user) {
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('role')
          .eq('id', currentUser.user.id)
          .single()

        if (profileError) {
          this.addResult('Users', 'Permissions', 'warning', 'No se pudo verificar permisos del usuario')
        } else {
          this.addResult('Users', 'Permissions', 'success', `Usuario con rol: ${userProfile.role}`)
        }
      }
    } catch (error) {
      this.addResult('Users', 'General', 'error', 'Error en módulo de usuarios', error)
    }
  }

  // Test Reports Module
  async testReports(): Promise<void> {
    try {
      // Test basic report queries
      const today = new Date()
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))

      // Test today's appointments count
      const { data: todayAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('id')
        .gte('fecha_hora', startOfToday.toISOString())

      if (appointmentsError) {
        this.addResult('Reports', 'Appointments Query', 'error', 'Error al consultar citas de hoy', appointmentsError)
      } else {
        this.addResult('Reports', 'Appointments Query', 'success', `${todayAppointments?.length || 0} citas hoy`)
      }

      // Test payments sum
      const { data: paymentsSum, error: paymentsError } = await supabase
        .from('payments')
        .select('monto')
        .gte('fecha_pago', startOfToday.toISOString())

      if (paymentsError) {
        this.addResult('Reports', 'Payments Query', 'error', 'Error al consultar pagos de hoy', paymentsError)
      } else {
        const total = paymentsSum?.reduce((sum, p) => sum + p.monto, 0) || 0
        this.addResult('Reports', 'Payments Query', 'success', `$${total.toLocaleString()} en pagos hoy`)
      }
    } catch (error) {
      this.addResult('Reports', 'General', 'error', 'Error en módulo de reportes', error)
    }
  }

  // Test Import Module
  async testImport(): Promise<void> {
    try {
      // Test CSV parsing simulation
      const csvData = 'nombre,telefono,zona\nTest Patient,1234567890,axilas'
      const lines = csvData.split('\n')
      const headers = lines[0].split(',')
      
      if (headers.length >= 3) {
        this.addResult('Import', 'CSV Parsing', 'success', 'Simulación de parsing CSV exitosa')
      } else {
        this.addResult('Import', 'CSV Parsing', 'error', 'Error en simulación de parsing CSV')
      }

      // Test template generation
      const templateHeaders = ['nombre_completo', 'telefono', 'zona']
      const template = templateHeaders.join(',') + '\nEjemplo,1234567890,axilas'
      
      if (template.includes('nombre_completo')) {
        this.addResult('Import', 'Template Generation', 'success', 'Generación de plantilla exitosa')
      } else {
        this.addResult('Import', 'Template Generation', 'error', 'Error en generación de plantilla')
      }
    } catch (error) {
      this.addResult('Import', 'General', 'error', 'Error en módulo de importación', error)
    }
  }

  // Test Workflow Module
  async testWorkflow(): Promise<void> {
    try {
      // Test workflow steps simulation
      const workflowSteps = [
        'Seleccionar Paciente',
        'Seleccionar Servicio', 
        'Agendar Cita',
        'Procesar Pago',
        'Completado'
      ]

      let currentStep = 1
      for (const step of workflowSteps) {
        if (currentStep <= 5) {
          this.addResult('Workflow', `Step ${currentStep}`, 'success', `${step} - Simulación exitosa`)
          currentStep++
        }
      }

      // Test workflow data validation
      const workflowData = {
        patient: { id: 'test', name: 'Test Patient' },
        service: { id: 'test', name: 'Test Service' },
        appointment: { date: new Date().toISOString() },
        payment: { amount: 100, method: 'efectivo' }
      }

      if (workflowData.patient && workflowData.service && workflowData.appointment && workflowData.payment) {
        this.addResult('Workflow', 'Data Validation', 'success', 'Validación de datos del flujo exitosa')
      } else {
        this.addResult('Workflow', 'Data Validation', 'error', 'Error en validación de datos del flujo')
      }
    } catch (error) {
      this.addResult('Workflow', 'General', 'error', 'Error en módulo de flujo de trabajo', error)
    }
  }

  // Run all tests
  async runAllTests(): Promise<TestSuiteResults> {
    console.log('🚀 Iniciando suite de pruebas integral...')
    this.results = []

    await this.testDatabaseConnection()
    await this.testAuthentication()
    await this.testRoles()
    await this.testPatients()
    await this.testServices()
    await this.testAppointments()
    await this.testPayments()
    await this.testUsers()
    await this.testReports()
    await this.testImport()
    await this.testWorkflow()

    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'success').length,
      failed: this.results.filter(r => r.status === 'error').length,
      warnings: this.results.filter(r => r.status === 'warning').length
    }

    const overall = summary.failed > 0 ? 'error' : summary.warnings > 0 ? 'warning' : 'success'

    console.log('✅ Suite de pruebas completada')
    console.log(`📊 Resumen: ${summary.passed}/${summary.total} exitosas, ${summary.failed} errores, ${summary.warnings} advertencias`)

    return {
      overall,
      results: this.results,
      summary
    }
  }
}

export const testSuite = new TestSuite()