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
  ArrowRight,
  ArrowLeft,
  Link,
  AlertTriangle,
  FileSpreadsheet,
  Settings
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

interface ColumnMapping {
  csvColumn: string
  dbField: string
  required: boolean
  dataType: string
  example?: string
}

interface FieldDefinition {
  key: string
  label: string
  required: boolean
  type: 'text' | 'number' | 'date' | 'boolean' | 'select' | 'array'
  options?: string[]
  description?: string
}

export default function Import() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('patients')
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [previewData, setPreviewData] = useState<any[]>([])
  const [rawData, setRawData] = useState<any[]>([])
  const [csvColumns, setCsvColumns] = useState<string[]>([])
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [mappedData, setMappedData] = useState<any[]>([])
  const [importStep, setImportStep] = useState<'upload' | 'analyze' | 'preview' | 'importing' | 'completed'>('upload')
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [realTimeLog, setRealTimeLog] = useState<string[]>([])

  // Field definitions for each module
  const fieldDefinitions: Record<string, FieldDefinition[]> = {
    patients: [
      { key: 'nombre_completo', label: 'Nombre Completo', required: true, type: 'text', description: 'Nombre completo del paciente' },
      { key: 'telefono', label: 'Teléfono', required: false, type: 'text', description: 'Número de teléfono' },
      { key: 'cumpleanos', label: 'Fecha de Nacimiento', required: false, type: 'date', description: 'Formato: YYYY-MM-DD' },
      { key: 'sexo', label: 'Sexo', required: false, type: 'select', options: ['M', 'F'], description: 'M para masculino, F para femenino' },
      { key: 'localidad', label: 'Localidad', required: false, type: 'text', description: 'Ciudad o localidad' },
      { key: 'zonas_tratamiento', label: 'Zonas de Tratamiento', required: false, type: 'array', description: 'Separadas por ; (punto y coma)' },
      { key: 'precio_total', label: 'Precio Total', required: false, type: 'number', description: 'Precio total del tratamiento' },
      { key: 'metodo_pago_preferido', label: 'Método de Pago Preferido', required: false, type: 'select', options: ['efectivo', 'transferencia', 'bbva', 'clip'] },
      { key: 'observaciones', label: 'Observaciones', required: false, type: 'text', description: 'Notas adicionales' }
    ],
    payments: [
      { key: 'cliente', label: 'Cliente', required: true, type: 'text', description: 'Nombre del cliente (debe existir)' },
      { key: 'telefono', label: 'Teléfono', required: false, type: 'text', description: 'Para identificar al cliente' },
      { key: 'monto', label: 'Monto', required: true, type: 'number', description: 'Cantidad pagada' },
      { key: 'metodo_pago', label: 'Método de Pago', required: true, type: 'select', options: ['efectivo', 'transferencia', 'bbva', 'clip'] },
      { key: 'fecha_pago', label: 'Fecha de Pago', required: false, type: 'date', description: 'Formato: YYYY-MM-DD HH:MM' },
      { key: 'banco', label: 'Banco', required: false, type: 'text', description: 'Nombre del banco' },
      { key: 'referencia', label: 'Referencia', required: false, type: 'text', description: 'Número de referencia' },
      { key: 'observaciones', label: 'Observaciones', required: false, type: 'text', description: 'Notas adicionales' },
      { key: 'tipo_pago', label: 'Tipo de Pago', required: false, type: 'select', options: ['pago_sesion', 'abono', 'transferencia'] }
    ],
    appointments: [
      { key: 'cliente', label: 'Cliente', required: true, type: 'text', description: 'Nombre del cliente (debe existir)' },
      { key: 'telefono', label: 'Teléfono', required: false, type: 'text', description: 'Para identificar al cliente' },
      { key: 'servicio', label: 'Servicio', required: true, type: 'text', description: 'Nombre del servicio (debe existir)' },
      { key: 'fecha_hora', label: 'Fecha y Hora', required: true, type: 'date', description: 'Formato: YYYY-MM-DD HH:MM' },
      { key: 'numero_sesion', label: 'Número de Sesión', required: false, type: 'number', description: 'Número de sesión' },
      { key: 'status', label: 'Estado', required: false, type: 'select', options: ['agendada', 'confirmada', 'completada', 'cancelada'] },
      { key: 'precio_sesion', label: 'Precio de Sesión', required: false, type: 'number', description: 'Precio de la sesión' },
      { key: 'observaciones', label: 'Observaciones', required: false, type: 'text', description: 'Notas adicionales' }
    ],
    services: [
      { key: 'nombre', label: 'Nombre', required: true, type: 'text', description: 'Nombre del servicio' },
      { key: 'zona', label: 'Zona', required: true, type: 'text', description: 'Zona corporal del tratamiento' },
      { key: 'precio_base', label: 'Precio Base', required: true, type: 'number', description: 'Precio base del servicio' },
      { key: 'descripcion', label: 'Descripción', required: false, type: 'text', description: 'Descripción del servicio' },
      { key: 'duracion_minutos', label: 'Duración (minutos)', required: false, type: 'number', description: 'Duración en minutos' },
      { key: 'sesiones_recomendadas', label: 'Sesiones Recomendadas', required: false, type: 'number', description: 'Sesiones recomendadas' },
      { key: 'tecnologia', label: 'Tecnología', required: false, type: 'text', description: 'Tecnología utilizada' }
    ]
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setLoading(true)
    setImportResult(null)
    setPreviewData([])
    setRawData([])
    setCsvColumns([])
    setColumnMappings([])
    setMappedData([])
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
        const row: any = { _rowNumber: index + 2 }
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        return row
      }).filter(row => Object.values(row).some(val => val !== '' && val !== row._rowNumber))

      if (data.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo')
      }

      setRawData(data)
      setCsvColumns(headers)
      setPreviewData(data.slice(0, 10))
      
      // Initialize column mappings with auto-detection
      initializeColumnMappings(headers)
      
      setImportStep('analyze')
      
      setRealTimeLog([
        `✅ Archivo cargado exitosamente`,
        `📊 Se encontraron ${data.length} registros`,
        `📋 Se detectaron ${headers.length} columnas: ${headers.join(', ')}`,
        `🔍 Iniciando análisis automático de columnas...`
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

  const initializeColumnMappings = (headers: string[]) => {
    const currentFields = fieldDefinitions[activeTab] || []
    const mappings: ColumnMapping[] = []

    currentFields.forEach(field => {
      // Try to auto-detect matching columns
      const matchingColumn = headers.find(header => {
        const headerLower = header.toLowerCase().replace(/[_\s]/g, '')
        const fieldLower = field.key.toLowerCase().replace(/[_\s]/g, '')
        const labelLower = field.label.toLowerCase().replace(/[_\s]/g, '')
        
        return headerLower === fieldLower || 
               headerLower === labelLower ||
               headerLower.includes(fieldLower) ||
               fieldLower.includes(headerLower)
      })

      mappings.push({
        csvColumn: matchingColumn || '',
        dbField: field.key,
        required: field.required,
        dataType: field.type,
        example: matchingColumn ? getColumnExample(matchingColumn, rawData) : undefined
      })
    })

    setColumnMappings(mappings)
    addLog(`🎯 Auto-detección completada: ${mappings.filter(m => m.csvColumn).length} de ${mappings.length} campos mapeados`)
  }

  const getColumnExample = (columnName: string, data: any[]): string => {
    const examples = data.slice(0, 3)
      .map(row => row[columnName])
      .filter(val => val && val.toString().trim())
    
    return examples.length > 0 ? examples[0].toString() : ''
  }

  const updateColumnMapping = (dbField: string, csvColumn: string) => {
    setColumnMappings(prev => prev.map(mapping => 
      mapping.dbField === dbField 
        ? { 
            ...mapping, 
            csvColumn,
            example: csvColumn ? getColumnExample(csvColumn, rawData) : undefined
          }
        : mapping
    ))
  }

  const validateMappings = (): { isValid: boolean, errors: string[] } => {
    const errors: string[] = []
    const requiredFields = columnMappings.filter(m => m.required)
    
    requiredFields.forEach(field => {
      if (!field.csvColumn) {
        errors.push(`El campo "${fieldDefinitions[activeTab].find(f => f.key === field.dbField)?.label}" es requerido y debe ser mapeado`)
      }
    })

    // Check for duplicate mappings
    const usedColumns = columnMappings.filter(m => m.csvColumn).map(m => m.csvColumn)
    const duplicates = usedColumns.filter((col, index) => usedColumns.indexOf(col) !== index)
    
    if (duplicates.length > 0) {
      errors.push(`Las siguientes columnas están mapeadas múltiples veces: ${duplicates.join(', ')}`)
    }

    return { isValid: errors.length === 0, errors }
  }

  const applyMapping = () => {
    const { isValid, errors } = validateMappings()
    
    if (!isValid) {
      setRealTimeLog(prev => [...prev, ...errors.map(error => `❌ ${error}`)])
      return
    }

    try {
      const mapped = rawData.map((row, index) => {
        const mappedRow: any = { _rowNumber: row._rowNumber || index + 2 }
        
        columnMappings.forEach(mapping => {
          if (mapping.csvColumn) {
            let value = row[mapping.csvColumn]
            
            // Apply data type transformations
            if (mapping.dataType === 'array' && value) {
              value = value.split(';').map((v: string) => v.trim()).filter((v: string) => v)
            } else if (mapping.dataType === 'number' && value) {
              value = parseFloat(value.toString().replace(/[,$]/g, ''))
            } else if (mapping.dataType === 'boolean' && value) {
              value = ['true', '1', 'sí', 'si', 'yes'].includes(value.toString().toLowerCase())
            }
            
            mappedRow[mapping.dbField] = value
          }
        })
        
        return mappedRow
      })

      setMappedData(mapped)
      setPreviewData(mapped.slice(0, 10))
      setImportStep('preview')
      
      addLog(`✅ Mapeo aplicado exitosamente`)
      addLog(`📋 ${mapped.length} registros listos para importar`)
      
    } catch (error) {
      addLog(`❌ Error al aplicar el mapeo: ${error}`)
    }
  }

  const startImport = async () => {
    setImportStep('importing')
    setLoading(true)
    setImportResult(null)
    setRealTimeLog([])

    try {
      if (activeTab === 'patients') {
        await importPatientsWithProgress(mappedData)
      } else if (activeTab === 'payments') {
        await importPaymentsWithProgress(mappedData)
      } else if (activeTab === 'appointments') {
        await importAppointmentsWithProgress(mappedData)
      } else if (activeTab === 'services') {
        await importServicesWithProgress(mappedData)
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

  // Import functions (same as before, but using mappedData instead of rawData)
  const importPatientsWithProgress = async (data: any[]) => {
    const results: ImportResult = { success: 0, errors: [], total: data.length }
    addLog(`🚀 Iniciando importación de ${data.length} pacientes...`)

    for (const [index, row] of data.entries()) {
      const rowNumber = row._rowNumber || index + 2
      const patientName = row['nombre_completo'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, patientName, 'processing', `Procesando: ${patientName}`)

      try {
        if (!row['nombre_completo']) {
          const error = `❌ Fila ${rowNumber}: El campo 'nombre_completo' es requerido`
          results.errors.push(error)
          updateProgress(index + 1, data.length, patientName, 'error', error)
          continue
        }

        let sexo = null
        if (row['sexo']) {
          const sexoUpper = row['sexo'].toString().toUpperCase()
          if (sexoUpper === 'M' || sexoUpper === 'F') {
            sexo = sexoUpper
          } else {
            const error = `❌ Fila ${rowNumber}: El campo 'sexo' debe ser 'M' o 'F'`
            results.errors.push(error)
            updateProgress(index + 1, data.length, patientName, 'error', error)
            continue
          }
        }

        let cumpleanos = null
        if (row['cumpleanos']) {
          const fecha = new Date(row['cumpleanos'])
          if (!isNaN(fecha.getTime())) {
            cumpleanos = fecha.toISOString().split('T')[0]
          } else {
            const error = `❌ Fila ${rowNumber}: Fecha de cumpleaños inválida: ${row['cumpleanos']}`
            results.errors.push(error)
            updateProgress(index + 1, data.length, patientName, 'error', error)
            continue
          }
        }

        const patientData = {
          nombre_completo: row['nombre_completo'],
          telefono: row['telefono'] || null,
          cumpleanos,
          sexo,
          localidad: row['localidad'] || null,
          zonas_tratamiento: Array.isArray(row['zonas_tratamiento']) ? row['zonas_tratamiento'] : null,
          precio_total: row['precio_total'] ? parseFloat(row['precio_total']) : null,
          metodo_pago_preferido: row['metodo_pago_preferido'] || null,
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
      const clienteName = row['cliente'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, clienteName, 'processing', `Procesando pago de: ${clienteName}`)

      try {
        let patient = null
        if (row['cliente']) {
          const { data: patients } = await supabase
            .from('patients')
            .select('id, nombre_completo')
            .ilike('nombre_completo', `%${row['cliente']}%`)
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

        const monto = parseFloat(row['monto'] || '0')
        if (monto <= 0) {
          const error = `❌ Fila ${rowNumber}: El monto debe ser mayor a 0`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        const metodoPago = row['metodo_pago'] || 'efectivo'
        if (!['efectivo', 'transferencia', 'bbva', 'clip'].includes(metodoPago)) {
          const error = `❌ Fila ${rowNumber}: Método de pago inválido: ${metodoPago}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        let fechaPago = new Date().toISOString()
        if (row['fecha_pago']) {
          const fecha = new Date(row['fecha_pago'])
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
      const clienteName = row['cliente'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, clienteName, 'processing', `Procesando cita de: ${clienteName}`)

      try {
        let patient = null
        if (row['cliente']) {
          const { data: patients } = await supabase
            .from('patients')
            .select('id, nombre_completo')
            .ilike('nombre_completo', `%${row['cliente']}%`)
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

        let service = null
        if (row['servicio']) {
          const { data: services } = await supabase
            .from('services')
            .select('id, nombre, precio_base')
            .ilike('nombre', `%${row['servicio']}%`)
            .eq('is_active', true)
            .limit(1)
          service = services?.[0]
        }

        if (!service) {
          const error = `❌ Fila ${rowNumber}: No se encontró el servicio: ${row['servicio']}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        let fechaHora = new Date().toISOString()
        if (row['fecha_hora']) {
          const fecha = new Date(row['fecha_hora'])
          if (!isNaN(fecha.getTime())) {
            fechaHora = fecha.toISOString()
          } else {
            const error = `❌ Fila ${rowNumber}: Fecha inválida: ${row['fecha_hora']}`
            results.errors.push(error)
            updateProgress(index + 1, data.length, clienteName, 'error', error)
            continue
          }
        }

        const appointmentData = {
          patient_id: patient.id,
          service_id: service.id,
          fecha_hora: fechaHora,
          numero_sesion: parseInt(row['numero_sesion'] || '1'),
          status: row['status'] || 'agendada',
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

        // Pequeña pausa para visualizar el progreso
        await new Promise(resolve => setTimeout(resolve, 50))

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

        const precioBase = parseFloat(row['precio_base'] || '0')
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

        // Pequeña pausa para visualizar el progreso
        await new Promise(resolve => setTimeout(resolve, 50))

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
    setCsvColumns([])
    setColumnMappings([])
    setMappedData([])
    setImportResult(null)
    setImportProgress(null)
    setRealTimeLog([])
  }

  const downloadTemplate = (type: string) => {
    const fields = fieldDefinitions[type] || []
    const headers = fields.map(field => field.key)
    const sampleData = fields.map(field => {
      switch (field.key) {
        case 'nombre_completo': return 'María García López'
        case 'telefono': return '9841234567'
        case 'cumpleanos': return '1990-05-15'
        case 'sexo': return 'F'
        case 'localidad': return 'Playa del Carmen'
        case 'zonas_tratamiento': return 'axilas;piernas'
        case 'precio_total': return '2500'
        case 'metodo_pago_preferido': return 'efectivo'
        case 'observaciones': return 'Piel sensible'
        case 'cliente': return 'María García López'
        case 'monto': return '800'
        case 'metodo_pago': return 'efectivo'
        case 'fecha_pago': return '2025-01-15 10:30'
        case 'tipo_pago': return 'pago_sesion'
        case 'servicio': return 'Depilación Láser Axilas'
        case 'fecha_hora': return '2025-01-20 10:00'
        case 'numero_sesion': return '1'
        case 'status': return 'agendada'
        case 'precio_sesion': return '800'
        case 'nombre': return 'Depilación Láser Facial'
        case 'zona': return 'cara_completa'
        case 'precio_base': return '1200'
        case 'duracion_minutos': return '45'
        case 'sesiones_recomendadas': return '8'
        case 'tecnologia': return 'Sopranoice'
        default: return ''
      }
    })

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
      { id: 'analyze', name: 'Analizar', icon: Settings },
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
          Importación Inteligente de Datos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Importa datos desde archivos CSV con mapeo automático de columnas
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
              <FileSpreadsheet className="mx-auto h-12 w-12 text-gray-400" />
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
                <span className="ml-2 text-sm text-gray-600">Analizando archivo...</span>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Campos Disponibles para {tabs.find(t => t.id === activeTab)?.name}
            </h3>
            
            <div className="space-y-3 text-sm">
              {fieldDefinitions[activeTab]?.map((field) => (
                <div key={field.key} className="flex items-start space-x-3">
                  <div className={`mt-1 w-2 h-2 rounded-full ${
                    field.required ? 'bg-red-500' : 'bg-gray-300'
                  }`} />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{field.label}</span>
                      {field.required && <span className="text-red-500 text-xs">*</span>}
                    </div>
                    <p className="text-gray-600 text-xs">{field.description}</p>
                    {field.options && (
                      <p className="text-blue-600 text-xs">
                        Opciones: {field.options.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              <div className="mt-4 text-xs text-gray-500">
                <span className="flex items-center">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2" />
                  Campos requeridos
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analyze Step - Column Mapping */}
      {importStep === 'analyze' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900">
                Mapeo de Columnas - {csvColumns.length} columnas detectadas
              </h3>
              <p className="text-sm text-gray-600">
                Vincula las columnas de tu CSV con los campos de la base de datos
              </p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={resetImport}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Volver
              </button>
              <button
                onClick={applyMapping}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
              >
                <Link className="w-4 h-4 mr-2" />
                Aplicar Mapeo
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {columnMappings.map((mapping, index) => {
              const field = fieldDefinitions[activeTab].find(f => f.key === mapping.dbField)
              const { isValid, errors } = validateMappings()
              const hasError = !mapping.csvColumn && mapping.required
              
              return (
                <div key={mapping.dbField} className={`border rounded-lg p-4 ${
                  hasError ? 'border-red-200 bg-red-50' : 'border-gray-200'
                }`}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-center">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{field?.label}</span>
                        {mapping.required && <span className="text-red-500 text-xs">*</span>}
                      </div>
                      <p className="text-xs text-gray-500">{field?.description}</p>
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 mt-1">
                        {mapping.dataType}
                      </span>
                    </div>
                    
                    <div>
                      <select
                        value={mapping.csvColumn}
                        onChange={(e) => updateColumnMapping(mapping.dbField, e.target.value)}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 ${
                          hasError ? 'border-red-300' : 'border-gray-300'
                        }`}
                      >
                        <option value="">Seleccionar columna del CSV</option>
                        {csvColumns.map(column => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div>
                      {mapping.example && (
                        <div className="text-sm">
                          <span className="text-gray-500">Ejemplo:</span>
                          <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded mt-1">
                            {mapping.example}
                          </div>
                        </div>
                      )}
                      {hasError && (
                        <div className="flex items-center text-red-600 text-xs mt-1">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Campo requerido
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {(() => {
            const { isValid, errors } = validateMappings()
            return !isValid && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">
                      Errores de Mapeo
                    </h3>
                    <div className="mt-2 text-sm text-red-700">
                      <ul className="list-disc list-inside space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}

      {/* Preview Step */}
      {importStep === 'preview' && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              Vista Previa - {mappedData.length} registros listos para importar
            </h3>
            <div className="flex space-x-3">
              <button
                onClick={() => setImportStep('analyze')}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Editar Mapeo
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
                  {fieldDefinitions[activeTab]?.filter(field => 
                    columnMappings.find(m => m.dbField === field.key)?.csvColumn
                  ).map((field) => (
                    <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {field.label}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
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
                    {fieldDefinitions[activeTab]?.filter(field => 
                      columnMappings.find(m => m.dbField === field.key)?.csvColumn
                    ).map((field) => (
                      <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Array.isArray(row[field.key]) 
                          ? row[field.key].join(', ') 
                          : String(row[field.key] || '')
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {mappedData.length > 10 && (
            <p className="mt-4 text-sm text-gray-500 text-center">
              Mostrando 10 de {mappedData.length} registros. Todos los registros serán importados.
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log de Importación</h3>
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
        </div>
      )}
    </div>
  )
}