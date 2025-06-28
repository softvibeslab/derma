import React, { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Upload, 
  Download, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Users,
  Calendar,
  CreditCard,
  Scissors,
  TestTube,
  Play,
  Loader,
  X,
  Eye,
  ArrowRight
} from 'lucide-react'

interface ImportResult {
  success: number
  errors: string[]
  total: number
}

interface ImportProgress {
  current: number
  total: number
  currentItem: string
  status: 'processing' | 'success' | 'error'
  message: string
}

export default function Import() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('patients')
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [importStep, setImportStep] = useState<'upload' | 'preview' | 'importing' | 'completed'>('upload')
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [realTimeLog, setRealTimeLog] = useState<string[]>([])

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setImportResult(null)
    setPreviewData([])
    setRawData([])
    setImportStep('upload')
    setRealTimeLog([])

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        throw new Error('El archivo está vacío')
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const data = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = { _rowNumber: index + 2 } // Para tracking de errores
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      }).filter(row => Object.values(row).some(val => val !== '' && val !== row._rowNumber))

      if (data.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo')
      }

      setRawData(data)
      setPreviewData(data.slice(0, 10)) // Show first 10 rows for preview
      setImportStep('preview')
      
      // Agregar log
      setRealTimeLog([
        `✅ Archivo cargado exitosamente`,
        `📊 Se encontraron ${data.length} registros para importar`,
        `👀 Mostrando vista previa de los primeros ${Math.min(data.length, 10)} registros`
      ])

    } catch (error) {
      console.error('Error processing file:', error)
      setRealTimeLog([
        `❌ Error al procesar el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`
      ])
    } finally {
      setLoading(false)
    }
  }

  const startImport = async () => {
    setImportStep('importing')
    setLoading(true)
    setImportResult(null)
    setRealTimeLog([])

    try {
      if (activeTab === 'patients') {
        await importPatientsWithProgress(rawData)
      } else if (activeTab === 'payments') {
        await importPaymentsWithProgress(rawData)
      } else if (activeTab === 'appointments') {
        await importAppointmentsWithProgress(rawData)
      } else if (activeTab === 'services') {
        await importServicesWithProgress(rawData)
      }
    } catch (error) {
      console.error('Import error:', error)
      setRealTimeLog(prev => [...prev, `❌ Error general en la importación: ${error}`])
    } finally {
      setLoading(false)
      setImportStep('completed')
    }
  }

  const addLog = (message: string) => {
    setRealTimeLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${message}`])
  }

  const updateProgress = (current: number, total: number, currentItem: string, status: 'processing' | 'success' | 'error', message: string) => {
    setImportProgress({ current, total, currentItem, status, message })
    addLog(message)
  }

  const importPatientsWithProgress = async (data: any[]) => {
    const results: ImportResult = { success: 0, errors: [], total: data.length }
    addLog(`🚀 Iniciando importación de ${data.length} pacientes...`)

    for (const [index, row] of data.entries()) {
      const rowNumber = row._rowNumber || index + 2
      const patientName = row['nombre_completo'] || row['nombre'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, patientName, 'processing', `Procesando: ${patientName}`)

      try {
        // Validar campos requeridos
        if (!row['nombre_completo'] && !row['nombre']) {
          const error = `❌ Fila ${rowNumber}: El campo 'nombre_completo' es requerido`
          results.errors.push(error)
          updateProgress(index + 1, data.length, patientName, 'error', error)
          continue
        }

        // Procesar zonas_tratamiento
        let zonasTratamiento: string[] = []
        const zonasStr = row['zonas_tratamiento'] || row['zonas'] || ''
        if (zonasStr) {
          zonasTratamiento = zonasStr.split(';').map((z: string) => z.trim()).filter((z: string) => z)
        }

        // Validar sexo
        let sexo = null
        if (row['sexo']) {
          const sexoUpper = row['sexo'].toUpperCase()
          if (sexoUpper === 'M' || sexoUpper === 'F') {
            sexo = sexoUpper
          } else {
            const error = `❌ Fila ${rowNumber}: El campo 'sexo' debe ser 'M' o 'F'`
            results.errors.push(error)
            updateProgress(index + 1, data.length, patientName, 'error', error)
            continue
          }
        }

        // Procesar fecha de cumpleaños
        let cumpleanos = null
        if (row['cumpleanos'] || row['fecha_nacimiento']) {
          const fechaStr = row['cumpleanos'] || row['fecha_nacimiento']
          const fecha = new Date(fechaStr)
          if (!isNaN(fecha.getTime())) {
            cumpleanos = fecha.toISOString().split('T')[0]
          } else {
            const error = `❌ Fila ${rowNumber}: Fecha de cumpleaños inválida: ${fechaStr}`
            results.errors.push(error)
            updateProgress(index + 1, data.length, patientName, 'error', error)
            continue
          }
        }

        const patientData = {
          nombre_completo: row['nombre_completo'] || row['nombre'],
          telefono: row['telefono'] || null,
          cumpleanos,
          sexo,
          localidad: row['localidad'] || null,
          zonas_tratamiento: zonasTratamiento.length > 0 ? zonasTratamiento : null,
          precio_total: row['precio_total'] ? parseFloat(row['precio_total']) : null,
          metodo_pago_preferido: row['metodo_pago_preferido'] || row['metodo_pago'] || null,
          observaciones: row['observaciones'] || null
        }

        const { error } = await supabase
          .from('patients')
          .insert([patientData])

        if (error) {
          const errorMsg = `❌ Fila ${rowNumber}: ${error.message}`
          results.errors.push(errorMsg)
          updateProgress(index + 1, data.length, patientName, 'error', errorMsg)
        } else {
          results.success++
          updateProgress(index + 1, data.length, patientName, 'success', `✅ Paciente creado: ${patientName}`)
        }

        // Pequeña pausa para visualizar el progreso
        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMsg = `❌ Fila ${rowNumber}: Error inesperado - ${error}`
        results.errors.push(errorMsg)
        updateProgress(index + 1, data.length, patientName, 'error', errorMsg)
      }
    }

    addLog(`🏁 Importación completada: ${results.success} exitosos, ${results.errors.length} errores`)
    setImportResult(results)
  }

  const importPaymentsWithProgress = async (data: any[]) => {
    const results: ImportResult = { success: 0, errors: [], total: data.length }
    addLog(`🚀 Iniciando importación de ${data.length} pagos...`)

    for (const [index, row] of data.entries()) {
      const rowNumber = row._rowNumber || index + 2
      const clienteName = row['cliente'] || row['paciente'] || row['nombre_completo'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, clienteName, 'processing', `Procesando pago de: ${clienteName}`)

      try {
        // Buscar paciente por nombre o teléfono
        let patient = null
        if (row['cliente'] || row['paciente'] || row['nombre_completo']) {
          const nombreBusqueda = row['cliente'] || row['paciente'] || row['nombre_completo']
          const { data: patients } = await supabase
            .from('patients')
            .select('id, nombre_completo')
            .ilike('nombre_completo', `%${nombreBusqueda}%`)
            .limit(1)
          patient = patients?.[0]
        }

        if (!patient && row['telefono']) {
          const { data: patients } = await supabase
            .from('patients')
            .select('id, nombre_completo')
            .eq('telefono', row['telefono'])
            .limit(1)
          patient = patients?.[0]
        }

        if (!patient) {
          const error = `❌ Fila ${rowNumber}: No se encontró el paciente: ${clienteName}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        // Validar monto
        const monto = parseFloat(row['monto'] || row['cantidad'] || '0')
        if (monto <= 0) {
          const error = `❌ Fila ${rowNumber}: El monto debe ser mayor a 0`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        // Validar método de pago
        const metodoPago = row['metodo_pago'] || row['metodo'] || 'efectivo'
        if (!['efectivo', 'transferencia', 'bbva', 'clip'].includes(metodoPago)) {
          const error = `❌ Fila ${rowNumber}: Método de pago inválido: ${metodoPago}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        // Procesar fecha de pago
        let fechaPago = new Date().toISOString()
        if (row['fecha_pago'] || row['fecha']) {
          const fechaStr = row['fecha_pago'] || row['fecha']
          const fecha = new Date(fechaStr)
          if (!isNaN(fecha.getTime())) {
            fechaPago = fecha.toISOString()
          }
        }

        const paymentData = {
          patient_id: patient.id,
          monto,
          metodo_pago: metodoPago,
          fecha_pago: fechaPago,
          cajera_id: userProfile?.id || '550e8400-e29b-41d4-a716-446655440002',
          banco: row['banco'] || null,
          referencia: row['referencia'] || null,
          observaciones: row['observaciones'] || null,
          tipo_pago: row['tipo_pago'] || 'pago_sesion'
        }

        const { error } = await supabase
          .from('payments')
          .insert([paymentData])

        if (error) {
          const errorMsg = `❌ Fila ${rowNumber}: ${error.message}`
          results.errors.push(errorMsg)
          updateProgress(index + 1, data.length, clienteName, 'error', errorMsg)
        } else {
          results.success++
          updateProgress(index + 1, data.length, clienteName, 'success', `✅ Pago registrado: $${monto} - ${patient.nombre_completo}`)
        }

        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMsg = `❌ Fila ${rowNumber}: Error inesperado - ${error}`
        results.errors.push(errorMsg)
        updateProgress(index + 1, data.length, clienteName, 'error', errorMsg)
      }
    }

    addLog(`🏁 Importación completada: ${results.success} exitosos, ${results.errors.length} errores`)
    setImportResult(results)
  }

  const importAppointmentsWithProgress = async (data: any[]) => {
    const results: ImportResult = { success: 0, errors: [], total: data.length }
    addLog(`🚀 Iniciando importación de ${data.length} citas...`)

    for (const [index, row] of data.entries()) {
      const rowNumber = row._rowNumber || index + 2
      const clienteName = row['cliente'] || row['paciente'] || row['nombre_completo'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, clienteName, 'processing', `Procesando cita de: ${clienteName}`)

      try {
        // Buscar paciente
        let patient = null
        if (row['cliente'] || row['paciente'] || row['nombre_completo']) {
          const nombreBusqueda = row['cliente'] || row['paciente'] || row['nombre_completo']
          const { data: patients } = await supabase
            .from('patients')
            .select('id, nombre_completo')
            .ilike('nombre_completo', `%${nombreBusqueda}%`)
            .limit(1)
          patient = patients?.[0]
        }

        if (!patient && row['telefono']) {
          const { data: patients } = await supabase
            .from('patients')
            .select('id, nombre_completo')
            .eq('telefono', row['telefono'])
            .limit(1)
          patient = patients?.[0]
        }

        if (!patient) {
          const error = `❌ Fila ${rowNumber}: No se encontró el paciente: ${clienteName}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        // Buscar servicio
        let service = null
        if (row['servicio'] || row['tratamiento']) {
          const serviceBusqueda = row['servicio'] || row['tratamiento']
          const { data: services } = await supabase
            .from('services')
            .select('id, nombre, precio_base')
            .ilike('nombre', `%${serviceBusqueda}%`)
            .eq('is_active', true)
            .limit(1)
          service = services?.[0]
        }

        if (!service) {
          const error = `❌ Fila ${rowNumber}: No se encontró el servicio: ${row['servicio'] || row['tratamiento']}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        // Procesar fecha y hora
        let fechaHora = new Date().toISOString()
        if (row['fecha_hora'] || row['fecha']) {
          const fechaStr = row['fecha_hora'] || row['fecha']
          const fecha = new Date(fechaStr)
          if (!isNaN(fecha.getTime())) {
            fechaHora = fecha.toISOString()
          } else {
            const error = `❌ Fila ${rowNumber}: Fecha inválida: ${fechaStr}`
            results.errors.push(error)
            updateProgress(index + 1, data.length, clienteName, 'error', error)
            continue
          }
        }

        const appointmentData = {
          patient_id: patient.id,
          service_id: service.id,
          fecha_hora: fechaHora,
          numero_sesion: parseInt(row['numero_sesion'] || row['sesion'] || '1'),
          status: row['status'] || row['estado'] || 'agendada',
          precio_sesion: row['precio_sesion'] ? parseFloat(row['precio_sesion']) : service.precio_base,
          observaciones_caja: row['observaciones'] || null,
          operadora_id: userProfile?.id || null
        }

        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData])

        if (error) {
          const errorMsg = `❌ Fila ${rowNumber}: ${error.message}`
          results.errors.push(errorMsg)
          updateProgress(index + 1, data.length, clienteName, 'error', errorMsg)
        } else {
          results.success++
          updateProgress(index + 1, data.length, clienteName, 'success', `✅ Cita creada: ${patient.nombre_completo} - ${service.nombre}`)
        }

        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMsg = `❌ Fila ${rowNumber}: Error inesperado - ${error}`
        results.errors.push(errorMsg)
        updateProgress(index + 1, data.length, clienteName, 'error', errorMsg)
      }
    }

    addLog(`🏁 Importación completada: ${results.success} exitosos, ${results.errors.length} errores`)
    setImportResult(results)
  }

  const importServicesWithProgress = async (data: any[]) => {
    const results: ImportResult = { success: 0, errors: [], total: data.length }
    addLog(`🚀 Iniciando importación de ${data.length} servicios...`)

    for (const [index, row] of data.entries()) {
      const rowNumber = row._rowNumber || index + 2
      const serviceName = row['nombre'] || `Servicio ${rowNumber}`
      
      updateProgress(index + 1, data.length, serviceName, 'processing', `Procesando servicio: ${serviceName}`)

      try {
        // Validar campos requeridos
        if (!row['nombre']) {
          const error = `❌ Fila ${rowNumber}: El campo 'nombre' es requerido`
          results.errors.push(error)
          updateProgress(index + 1, data.length, serviceName, 'error', error)
          continue
        }

        if (!row['zona']) {
          const error = `❌ Fila ${rowNumber}: El campo 'zona' es requerido`
          results.errors.push(error)
          updateProgress(index + 1, data.length, serviceName, 'error', error)
          continue
        }

        const precioBase = parseFloat(row['precio_base'] || row['precio'] || '0')
        if (precioBase <= 0) {
          const error = `❌ Fila ${rowNumber}: El precio base debe ser mayor a 0`
          results.errors.push(error)
          updateProgress(index + 1, data.length, serviceName, 'error', error)
          continue
        }

        const serviceData = {
          nombre: row['nombre'],
          descripcion: row['descripcion'] || null,
          zona: row['zona'],
          precio_base: precioBase,
          duracion_minutos: row['duracion_minutos'] ? parseInt(row['duracion_minutos']) : 60,
          sesiones_recomendadas: row['sesiones_recomendadas'] ? parseInt(row['sesiones_recomendadas']) : 10,
          tecnologia: row['tecnologia'] || 'Sopranoice'
        }

        const { error } = await supabase
          .from('services')
          .insert([serviceData])

        if (error) {
          const errorMsg = `❌ Fila ${rowNumber}: ${error.message}`
          results.errors.push(errorMsg)
          updateProgress(index + 1, data.length, serviceName, 'error', errorMsg)
        } else {
          results.success++
          updateProgress(index + 1, data.length, serviceName, 'success', `✅ Servicio creado: ${serviceName} - $${precioBase}`)
        }

        await new Promise(resolve => setTimeout(resolve, 100))

      } catch (error) {
        const errorMsg = `❌ Fila ${rowNumber}: Error inesperado - ${error}`
        results.errors.push(errorMsg)
        updateProgress(index + 1, data.length, serviceName, 'error', errorMsg)
      }
    }

    addLog(`🏁 Importación completada: ${results.success} exitosos, ${results.errors.length} errores`)
    setImportResult(results)
  }

  const resetImport = () => {
    setImportStep('upload')
    setPreviewData([])
    setRawData([])
    setImportResult(null)
    setImportProgress(null)
    setRealTimeLog([])
  }

  const downloadTemplate = (type: string) => {
    let headers: string[] = []
    let sampleData: string[] = []

    switch (type) {
      case 'patients':
        headers = ['nombre_completo', 'telefono', 'cumpleanos', 'sexo', 'localidad', 'zonas_tratamiento', 'precio_total', 'metodo_pago_preferido', 'observaciones']
        sampleData = ['María García López', '9841234567', '1990-05-15', 'F', 'Playa del Carmen', 'axilas;piernas', '2500', 'efectivo', 'Piel sensible']
        break
      case 'payments':
        headers = ['cliente', 'telefono', 'monto', 'metodo_pago', 'fecha_pago', 'banco', 'referencia', 'observaciones', 'tipo_pago']
        sampleData = ['María García López', '9841234567', '800', 'efectivo', '2025-01-15 10:30', '', '', 'Pago sesión 1', 'pago_sesion']
        break
      case 'appointments':
        headers = ['cliente', 'telefono', 'servicio', 'fecha_hora', 'numero_sesion', 'status', 'precio_sesion', 'observaciones']
        sampleData = ['María García López', '9841234567', 'Depilación Láser Axilas', '2025-01-20 10:00', '1', 'agendada', '800', 'Primera sesión']
        break
      case 'services':
        headers = ['nombre', 'descripcion', 'zona', 'precio_base', 'duracion_minutos', 'sesiones_recomendadas', 'tecnologia']
        sampleData = ['Depilación Láser Facial', 'Tratamiento para zona facial completa', 'cara_completa', '1200', '45', '8', 'Sopranoice']
        break
    }

    const csvContent = [headers.join(','), sampleData.join(',')].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla-${type}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const insertTestData = async () => {
    try {
      setLoading(true)
      
      // Insertar paciente de prueba
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([{
          nombre_completo: 'Paciente Prueba CSV',
          telefono: '9999999999',
          sexo: 'F',
          localidad: 'Prueba',
          zonas_tratamiento: ['axilas', 'piernas'],
          precio_total: 1500.00,
          metodo_pago_preferido: 'efectivo',
          observaciones: 'Paciente insertado desde prueba de importación CSV'
        }])
        .select()
        .single()

      if (patientError) throw patientError

      // Insertar servicio de prueba
      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .insert([{
          nombre: 'Servicio Prueba CSV',
          descripcion: 'Servicio de prueba para importación CSV',
          zona: 'test_zone',
          precio_base: 999.99,
          duracion_minutos: 60,
          sesiones_recomendadas: 8,
          tecnologia: 'Sopranoice'
        }])
        .select()
        .single()

      if (serviceError) throw serviceError

      // Insertar cita de prueba
      const { error: appointmentError } = await supabase
        .from('appointments')
        .insert([{
          patient_id: patientData.id,
          service_id: serviceData.id,
          fecha_hora: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          numero_sesion: 1,
          status: 'agendada',
          precio_sesion: 999.99,
          observaciones_caja: 'Cita de prueba CSV',
          operadora_id: userProfile?.id
        }])

      if (appointmentError) throw appointmentError

      // Insertar pago de prueba
      const { error: paymentError } = await supabase
        .from('payments')
        .insert([{
          patient_id: patientData.id,
          monto: 999.99,
          metodo_pago: 'efectivo',
          cajera_id: userProfile?.id || '550e8400-e29b-41d4-a716-446655440002',
          observaciones: 'Pago de prueba CSV',
          tipo_pago: 'pago_sesion'
        }])

      if (paymentError) throw paymentError

      alert('✅ Datos de prueba insertados correctamente:\n- 1 Paciente\n- 1 Servicio\n- 1 Cita\n- 1 Pago')
      
    } catch (error) {
      console.error('Error inserting test data:', error)
      alert('❌ Error al insertar datos de prueba: ' + (error as any).message)
    } finally {
      setLoading(false)
    }
  }

  const tabs = [
    { id: 'patients', name: 'Pacientes', icon: Users },
    { id: 'payments', name: 'Pagos', icon: CreditCard },
    { id: 'appointments', name: 'Citas', icon: Calendar },
    { id: 'services', name: 'Servicios', icon: Scissors }
  ]

  const getStepIndicator = () => {
    const steps = [
      { id: 'upload', name: 'Cargar', icon: Upload },
      { id: 'preview', name: 'Vista Previa', icon: Eye },
      { id: 'importing', name: 'Importando', icon: Play },
      { id: 'completed', name: 'Completado', icon: CheckCircle }
    ]

    return (
      <div className="flex items-center justify-center mb-8">
        {steps.map((step, index) => {
          const isActive = importStep === step.id
          const isCompleted = steps.findIndex(s => s.id === importStep) > index
          const Icon = step.icon
          
          return (
            <div key={step.id} className="flex items-center">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                isActive ? 'border-pink-500 bg-pink-500 text-white' :
                isCompleted ? 'border-green-500 bg-green-500 text-white' :
                'border-gray-300 text-gray-400'
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className={`ml-2 text-sm font-medium ${
                isActive ? 'text-pink-600' :
                isCompleted ? 'text-green-600' :
                'text-gray-400'
              }`}>
                {step.name}
              </span>
              {index < steps.length - 1 && (
                <ArrowRight className={`w-4 h-4 mx-4 ${
                  isCompleted ? 'text-green-500' : 'text-gray-300'
                }`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Upload className="w-7 h-7 mr-3 text-pink-600" />
          Importación de Datos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Importa datos desde archivos CSV para migrar información existente
        </p>
      </div>

      {/* Step Indicator */}
      {getStepIndicator()}

      {/* Test Data Button */}
      <div className="mb-6">
        <button
          onClick={insertTestData}
          disabled={loading}
          className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-all disabled:opacity-50"
        >
          <TestTube className="w-4 h-4 mr-2" />
          {loading ? 'Insertando...' : 'Insertar Datos de Prueba'}
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id)
                  resetImport()
                }}
                disabled={importStep === 'importing'}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-pink-500 text-pink-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <Icon className="w-5 h-5 mr-2" />
                {tab.name}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Upload Step */}
      {importStep === 'upload' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Cargar Archivo - {tabs.find(t => t.id === activeTab)?.name}
            </h3>
            
            <div className="mb-4">
              <button
                onClick={() => downloadTemplate(activeTab)}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Descargar Plantilla
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-pink-400 transition-colors">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <div className="mt-4">
                <label htmlFor={`file-upload-${activeTab}`} className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    Arrastra un archivo CSV aquí o haz clic para seleccionar
                  </span>
                  <input
                    id={`file-upload-${activeTab}`}
                    name={`file-upload-${activeTab}`}
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                </label>
                <p className="mt-1 text-xs text-gray-500">
                  Solo archivos CSV hasta 10MB
                </p>
              </div>
            </div>

            {loading && (
              <div className="mt-4 flex items-center justify-center">
                <Loader className="animate-spin h-6 w-6 text-pink-600" />
                <span className="ml-2 text-sm text-gray-600">Procesando archivo...</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Instrucciones de Importación
            </h3>
            
            {activeTab === 'patients' && (
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Campos requeridos:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>nombre_completo</code> - Nombre completo del paciente</li>
                </ul>
                <p><strong>Campos opcionales:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>telefono</code> - Número de teléfono</li>
                  <li><code>cumpleanos</code> - Fecha de nacimiento (YYYY-MM-DD)</li>
                  <li><code>sexo</code> - M o F</li>
                  <li><code>localidad</code> - Ciudad o localidad</li>
                  <li><code>zonas_tratamiento</code> - Separadas por punto y coma (;)</li>
                  <li><code>precio_total</code> - Precio total del tratamiento</li>
                  <li><code>metodo_pago_preferido</code> - efectivo, transferencia, bbva, clip</li>
                  <li><code>observaciones</code> - Notas adicionales</li>
                </ul>
              </div>
            )}

            {activeTab === 'payments' && (
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Campos requeridos:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>cliente</code> - Nombre del cliente (debe existir)</li>
                  <li><code>monto</code> - Cantidad pagada</li>
                  <li><code>metodo_pago</code> - efectivo, transferencia, bbva, clip</li>
                </ul>
                <p><strong>Campos opcionales:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>telefono</code> - Para identificar al cliente</li>
                  <li><code>fecha_pago</code> - Fecha del pago (YYYY-MM-DD HH:MM)</li>
                  <li><code>banco</code> - Nombre del banco</li>
                  <li><code>referencia</code> - Número de referencia</li>
                  <li><code>observaciones</code> - Notas adicionales</li>
                  <li><code>tipo_pago</code> - pago_sesion, abono, transferencia</li>
                </ul>
              </div>
            )}

            {activeTab === 'appointments' && (
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Campos requeridos:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>cliente</code> - Nombre del cliente (debe existir)</li>
                  <li><code>servicio</code> - Nombre del servicio (debe existir)</li>
                  <li><code>fecha_hora</code> - Fecha y hora (YYYY-MM-DD HH:MM)</li>
                </ul>
                <p><strong>Campos opcionales:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>telefono</code> - Para identificar al cliente</li>
                  <li><code>numero_sesion</code> - Número de sesión</li>
                  <li><code>status</code> - agendada, confirmada, completada, cancelada</li>
                  <li><code>precio_sesion</code> - Precio de la sesión</li>
                  <li><code>observaciones</code> - Notas adicionales</li>
                </ul>
              </div>
            )}

            {activeTab === 'services' && (
              <div className="space-y-3 text-sm text-gray-600">
                <p><strong>Campos requeridos:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>nombre</code> - Nombre del servicio</li>
                  <li><code>zona</code> - Zona corporal del tratamiento</li>
                  <li><code>precio_base</code> - Precio base del servicio</li>
                </ul>
                <p><strong>Campos opcionales:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><code>descripcion</code> - Descripción del servicio</li>
                  <li><code>duracion_minutos</code> - Duración en minutos (default: 60)</li>
                  <li><code>sesiones_recomendadas</code> - Sesiones recomendadas (default: 10)</li>
                  <li><code>tecnologia</code> - Tecnología utilizada (default: Sopranoice)</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Preview Step */}
      {importStep === 'preview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Vista Previa - {rawData.length} registros listos para importar
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={resetImport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </button>
              <button
                onClick={startImport}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Play className="w-4 h-4 mr-2" />
                Iniciar Importación
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  {Object.keys(previewData[0] || {}).filter(key => key !== '_rowNumber').map((header) => (
                    <th key={header} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {index + 1}
                    </td>
                    {Object.entries(row).filter(([key]) => key !== '_rowNumber').map(([key, value], cellIndex) => (
                      <td key={cellIndex} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Array.isArray(value) ? value.join(', ') : String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {rawData.length > 10 && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              Mostrando 10 de {rawData.length} registros. Todos los registros serán importados.
            </p>
          )}
        </div>
      )}

      {/* Importing Step */}
      {importStep === 'importing' && (
        <div className="space-y-6">
          {/* Progress Bar */}
          {importProgress && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Progreso de Importación</h3>
                <span className="text-sm text-gray-500">
                  {importProgress.current} de {importProgress.total}
                </span>
              </div>
              
              <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
                <div 
                  className="bg-gradient-to-r from-pink-500 to-purple-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex items-center space-x-2">
                {importProgress.status === 'processing' && (
                  <Loader className="animate-spin w-4 h-4 text-blue-600" />
                )}
                {importProgress.status === 'success' && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
                {importProgress.status === 'error' && (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <span className="text-sm font-medium">
                  {importProgress.currentItem}
                </span>
              </div>
            </div>
          )}

          {/* Real-time Log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log de Importación en Tiempo Real</h3>
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto font-mono text-sm">
              {realTimeLog.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('🚀') ? 'text-blue-400' :
                    log.includes('🏁') ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
              {realTimeLog.length === 0 && (
                <div className="text-gray-500 text-center">
                  Esperando logs de importación...
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed Step */}
      {importStep === 'completed' && importResult && (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Resultados de la Importación
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-800">Exitosos</p>
                    <p className="text-2xl font-bold text-green-900">{importResult.success}</p>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">Errores</p>
                    <p className="text-2xl font-bold text-red-900">{importResult.errors.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-800">Total</p>
                    <p className="text-2xl font-bold text-blue-900">{importResult.total}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <button
                onClick={resetImport}
                className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                Nueva Importación
              </button>
            </div>
          </div>

          {/* Error Details */}
          {importResult.errors.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">Errores Encontrados:</h4>
              <div className="bg-red-50 rounded-lg p-4 max-h-64 overflow-y-auto">
                <ul className="text-sm text-red-700 space-y-2">
                  {importResult.errors.map((error, index) => (
                    <li key={index} className="flex items-start">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                      {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Final Log */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log Final de Importación</h3>
            <div className="bg-gray-900 rounded-lg p-4 h-64 overflow-y-auto font-mono text-sm">
              {realTimeLog.map((log, index) => (
                <div 
                  key={index} 
                  className={`mb-1 ${
                    log.includes('✅') ? 'text-green-400' :
                    log.includes('❌') ? 'text-red-400' :
                    log.includes('🚀') ? 'text-blue-400' :
                    log.includes('🏁') ? 'text-yellow-400' :
                    'text-gray-300'
                  }`}
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}