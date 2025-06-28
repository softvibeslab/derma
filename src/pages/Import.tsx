import React, { useState, useEffect, useRef } from 'react'
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
  Edit3,
  Save,
  RotateCcw,
  Trash2,
  Plus,
  FileSpreadsheet,
  AlertTriangle,
  Check
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

interface ValidationError {
  row: number
  column: string
  error: string
  severity: 'error' | 'warning'
}

interface CellData {
  value: string
  originalValue: string
  hasError: boolean
  error?: string
  isEdited: boolean
}

export default function Import() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('patients')
  const [loading, setLoading] = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [rawData, setRawData] = useState<any[]>([])
  const [tableData, setTableData] = useState<CellData[][]>([])
  const [headers, setHeaders] = useState<string[]>([])
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [importStep, setImportStep] = useState<'upload' | 'edit' | 'importing' | 'completed'>('upload')
  const [importProgress, setImportProgress] = useState<ImportProgress | null>(null)
  const [realTimeLog, setRealTimeLog] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [editingCell, setEditingCell] = useState<{row: number, col: number} | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const tabs = [
    { id: 'patients', name: 'Pacientes', icon: Users, color: 'bg-blue-500' },
    { id: 'payments', name: 'Pagos', icon: CreditCard, color: 'bg-green-500' },
    { id: 'appointments', name: 'Citas', icon: Calendar, color: 'bg-purple-500' },
    { id: 'services', name: 'Servicios', icon: Scissors, color: 'bg-pink-500' }
  ]

  const getRequiredFields = () => {
    const fields = {
      patients: ['nombre_completo'],
      payments: ['cliente', 'monto', 'metodo_pago'],
      appointments: ['cliente', 'servicio', 'fecha_hora'],
      services: ['nombre', 'zona', 'precio_base']
    }
    return fields[activeTab as keyof typeof fields] || []
  }

  const getExpectedHeaders = () => {
    const expectedHeaders = {
      patients: ['nombre_completo', 'telefono', 'cumpleanos', 'sexo', 'localidad', 'zonas_tratamiento', 'precio_total', 'metodo_pago_preferido', 'observaciones'],
      payments: ['cliente', 'telefono', 'monto', 'metodo_pago', 'fecha_pago', 'banco', 'referencia', 'observaciones', 'tipo_pago'],
      appointments: ['cliente', 'telefono', 'servicio', 'fecha_hora', 'numero_sesion', 'status', 'precio_sesion', 'observaciones'],
      services: ['nombre', 'descripcion', 'zona', 'precio_base', 'duracion_minutos', 'sesiones_recomendadas', 'tecnologia']
    }
    return expectedHeaders[activeTab as keyof typeof expectedHeaders] || []
  }

  const validateCell = (value: string, header: string, rowIndex: number): { isValid: boolean; error?: string; severity?: 'error' | 'warning' } => {
    const requiredFields = getRequiredFields()
    
    // Campo requerido vacío
    if (requiredFields.includes(header) && (!value || value.trim() === '')) {
      return { isValid: false, error: 'Campo requerido', severity: 'error' }
    }

    // Validaciones específicas por tipo de campo
    switch (header) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return { isValid: false, error: 'Email inválido', severity: 'error' }
        }
        break
      
      case 'telefono':
        if (value && !/^\d{10,15}$/.test(value.replace(/\D/g, ''))) {
          return { isValid: false, error: 'Teléfono debe tener 10-15 dígitos', severity: 'warning' }
        }
        break
      
      case 'sexo':
        if (value && !['M', 'F', 'm', 'f'].includes(value)) {
          return { isValid: false, error: 'Debe ser M o F', severity: 'error' }
        }
        break
      
      case 'monto':
      case 'precio_base':
      case 'precio_total':
      case 'precio_sesion':
        if (value && (isNaN(parseFloat(value)) || parseFloat(value) <= 0)) {
          return { isValid: false, error: 'Debe ser un número mayor a 0', severity: 'error' }
        }
        break
      
      case 'metodo_pago':
        if (value && !['efectivo', 'transferencia', 'bbva', 'clip'].includes(value.toLowerCase())) {
          return { isValid: false, error: 'Métodos válidos: efectivo, transferencia, bbva, clip', severity: 'warning' }
        }
        break
      
      case 'fecha_hora':
      case 'fecha_pago':
      case 'cumpleanos':
        if (value && isNaN(Date.parse(value))) {
          return { isValid: false, error: 'Formato de fecha inválido', severity: 'error' }
        }
        break
      
      case 'numero_sesion':
      case 'duracion_minutos':
      case 'sesiones_recomendadas':
        if (value && (isNaN(parseInt(value)) || parseInt(value) < 1)) {
          return { isValid: false, error: 'Debe ser un número entero mayor a 0', severity: 'error' }
        }
        break
    }

    return { isValid: true }
  }

  const validateAllData = () => {
    const errors: ValidationError[] = []
    
    tableData.forEach((row, rowIndex) => {
      row.forEach((cell, colIndex) => {
        const header = headers[colIndex]
        const validation = validateCell(cell.value, header, rowIndex)
        
        if (!validation.isValid) {
          errors.push({
            row: rowIndex,
            column: header,
            error: validation.error || 'Error desconocido',
            severity: validation.severity || 'error'
          })
        }
      })
    })
    
    setValidationErrors(errors)
    return errors
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    
    const files = Array.from(e.dataTransfer.files)
    const file = files[0]
    
    if (file && (file.type === 'text/csv' || file.name.endsWith('.csv'))) {
      processFile(file)
    } else {
      alert('Por favor, sube un archivo CSV válido')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const processFile = async (file: File) => {
    setLoading(true)
    setImportResult(null)
    setTableData([])
    setHeaders([])
    setValidationErrors([])
    setImportStep('upload')
    setRealTimeLog([])

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length === 0) {
        throw new Error('El archivo está vacío')
      }

      const fileHeaders = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      const dataRows = lines.slice(1).map((line, index) => {
        const values = line.split(',').map(v => v.trim().replace(/"/g, ''))
        return values
      }).filter(row => row.some(val => val !== ''))

      if (dataRows.length === 0) {
        throw new Error('No se encontraron datos válidos en el archivo')
      }

      // Crear estructura de tabla editable
      const processedData: CellData[][] = dataRows.map(row => 
        fileHeaders.map((_, colIndex) => ({
          value: row[colIndex] || '',
          originalValue: row[colIndex] || '',
          hasError: false,
          isEdited: false
        }))
      )

      setHeaders(fileHeaders)
      setTableData(processedData)
      setRawData(dataRows.map(row => {
        const obj: any = { _rowNumber: dataRows.indexOf(row) + 2 }
        fileHeaders.forEach((header, index) => {
          obj[header] = row[index] || ''
        })
        return obj
      }))
      
      setImportStep('edit')
      
      // Validar datos automáticamente
      setTimeout(() => {
        validateAllData()
      }, 100)
      
      setRealTimeLog([
        `✅ Archivo cargado exitosamente`,
        `📊 Se encontraron ${dataRows.length} registros`,
        `📋 Columnas detectadas: ${fileHeaders.join(', ')}`,
        `🔍 Validando datos...`
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

  const updateCell = (rowIndex: number, colIndex: number, newValue: string) => {
    setTableData(prev => {
      const newData = [...prev]
      const validation = validateCell(newValue, headers[colIndex], rowIndex)
      
      newData[rowIndex][colIndex] = {
        value: newValue,
        originalValue: newData[rowIndex][colIndex].originalValue,
        hasError: !validation.isValid,
        error: validation.error,
        isEdited: newValue !== newData[rowIndex][colIndex].originalValue
      }
      
      return newData
    })
    
    // Re-validar después de un pequeño delay
    setTimeout(() => {
      validateAllData()
    }, 100)
  }

  const addRow = () => {
    const newRow = headers.map(() => ({
      value: '',
      originalValue: '',
      hasError: false,
      isEdited: false
    }))
    
    setTableData(prev => [...prev, newRow])
  }

  const deleteRow = (rowIndex: number) => {
    setTableData(prev => prev.filter((_, index) => index !== rowIndex))
    setTimeout(() => validateAllData(), 100)
  }

  const resetData = () => {
    setTableData(prev => 
      prev.map(row => 
        row.map(cell => ({
          ...cell,
          value: cell.originalValue,
          hasError: false,
          error: undefined,
          isEdited: false
        }))
      )
    )
    setTimeout(() => validateAllData(), 100)
  }

  const startImport = async () => {
    const errors = validateAllData()
    const criticalErrors = errors.filter(err => err.severity === 'error')
    
    if (criticalErrors.length > 0) {
      alert(`No se puede importar. Hay ${criticalErrors.length} errores críticos que deben corregirse.`)
      return
    }

    setImportStep('importing')
    setLoading(true)
    setImportResult(null)
    setRealTimeLog([])

    try {
      // Convertir tableData de vuelta a formato de objeto
      const processedData = tableData.map((row, rowIndex) => {
        const obj: any = { _rowNumber: rowIndex + 2 }
        headers.forEach((header, colIndex) => {
          obj[header] = row[colIndex].value
        })
        return obj
      })

      if (activeTab === 'patients') {
        await importPatientsWithProgress(processedData)
      } else if (activeTab === 'payments') {
        await importPaymentsWithProgress(processedData)
      } else if (activeTab === 'appointments') {
        await importAppointmentsWithProgress(processedData)
      } else if (activeTab === 'services') {
        await importServicesWithProgress(processedData)
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

  // Las funciones de importación (mantener las existentes)
  const importPatientsWithProgress = async (data: any[]) => {
    const results: ImportResult = { success: 0, errors: [], total: data.length }
    addLog(`🚀 Iniciando importación de ${data.length} pacientes...`)

    for (const [index, row] of data.entries()) {
      const rowNumber = row._rowNumber || index + 2
      const patientName = row['nombre_completo'] || row['nombre'] || `Registro ${rowNumber}`
      
      updateProgress(index + 1, data.length, patientName, 'processing', `Procesando: ${patientName}`)

      try {
        if (!row['nombre_completo'] && !row['nombre']) {
          const error = `❌ Fila ${rowNumber}: El campo 'nombre_completo' es requerido`
          results.errors.push(error)
          updateProgress(index + 1, data.length, patientName, 'error', error)
          continue
        }

        let zonasTratamiento: string[] = []
        const zonasStr = row['zonas_tratamiento'] || row['zonas'] || ''
        if (zonasStr) {
          zonasTratamiento = zonasStr.split(';').map((z: string) => z.trim()).filter((z: string) => z)
        }

        let sexo = null
        if (row['sexo']) {
          const sexoUpper = row['sexo'].toUpperCase()
          if (sexoUpper === 'M' || sexoUpper === 'F') {
            sexo = sexoUpper
          }
        }

        let cumpleanos = null
        if (row['cumpleanos'] || row['fecha_nacimiento']) {
          const fechaStr = row['cumpleanos'] || row['fecha_nacimiento']
          const fecha = new Date(fechaStr)
          if (!isNaN(fecha.getTime())) {
            cumpleanos = fecha.toISOString().split('T')[0]
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

        const monto = parseFloat(row['monto'] || row['cantidad'] || '0')
        if (monto <= 0) {
          const error = `❌ Fila ${rowNumber}: El monto debe ser mayor a 0`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

        const metodoPago = row['metodo_pago'] || row['metodo'] || 'efectivo'
        if (!['efectivo', 'transferencia', 'bbva', 'clip'].includes(metodoPago)) {
          const error = `❌ Fila ${rowNumber}: Método de pago inválido: ${metodoPago}`
          results.errors.push(error)
          updateProgress(index + 1, data.length, clienteName, 'error', error)
          continue
        }

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
    setTableData([])
    setHeaders([])
    setRawData([])
    setImportResult(null)
    setImportProgress(null)
    setRealTimeLog([])
    setValidationErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
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
      
      const { data: patientData, error: patientError } = await supabase
        .from('patients')
        .insert([{
          nombre_completo: 'Paciente Prueba Excel',
          telefono: '9999999999',
          sexo: 'F',
          localidad: 'Prueba',
          zonas_tratamiento: ['axilas', 'piernas'],
          precio_total: 1500.00,
          metodo_pago_preferido: 'efectivo',
          observaciones: 'Paciente insertado desde interfaz Excel'
        }])
        .select()
        .single()

      if (patientError) throw patientError

      const { data: serviceData, error: serviceError } = await supabase
        .from('services')
        .insert([{
          nombre: 'Servicio Prueba Excel',
          descripcion: 'Servicio de prueba para interfaz Excel',
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
          observaciones_caja: 'Cita de prueba Excel',
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
          observaciones: 'Pago de prueba Excel',
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

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <FileSpreadsheet className="w-7 h-7 mr-3 text-pink-600" />
          Importación Excel Avanzada
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Importa y edita datos con una interfaz tipo Excel con validación en tiempo real
        </p>
      </div>

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
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
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
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Upload className="w-5 h-5 mr-2" />
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

            <div 
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragOver 
                  ? 'border-pink-400 bg-pink-50' 
                  : 'border-gray-300 hover:border-pink-400'
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              <FileSpreadsheet className={`mx-auto h-12 w-12 ${dragOver ? 'text-pink-500' : 'text-gray-400'}`} />
              <div className="mt-4">
                <label htmlFor="file-upload" className="cursor-pointer">
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {dragOver ? 'Suelta el archivo aquí' : 'Arrastra un archivo CSV aquí o haz clic para seleccionar'}
                  </span>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    name="file-upload"
                    type="file"
                    accept=".csv"
                    className="sr-only"
                    onChange={handleFileSelect}
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

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Campos Esperados
            </h3>
            
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-red-600 mb-2">Campos Requeridos:</h4>
                <div className="flex flex-wrap gap-2">
                  {getRequiredFields().map(field => (
                    <span key={field} className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
                      {field}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-600 mb-2">Campos Opcionales:</h4>
                <div className="flex flex-wrap gap-2">
                  {getExpectedHeaders()
                    .filter(field => !getRequiredFields().includes(field))
                    .map(field => (
                      <span key={field} className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded-full">
                        {field}
                      </span>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Step - Excel-like Interface */}
      {importStep === 'edit' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Editor de Datos - {tableData.length} registros
                </h3>
                {validationErrors.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    <span className="text-sm text-amber-600">
                      {validationErrors.filter(e => e.severity === 'error').length} errores,{' '}
                      {validationErrors.filter(e => e.severity === 'warning').length} advertencias
                    </span>
                  </div>
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={resetData}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Restaurar
                </button>
                <button
                  onClick={addRow}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Fila
                </button>
                <button
                  onClick={resetImport}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancelar
                </button>
                <button
                  onClick={startImport}
                  disabled={validationErrors.filter(e => e.severity === 'error').length > 0}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Importar Datos
                </button>
              </div>
            </div>

            {/* Excel-like Table */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-96">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="w-12 px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      {headers.map((header, colIndex) => {
                        const isRequired = getRequiredFields().includes(header)
                        const hasErrors = validationErrors.some(err => err.column === header)
                        return (
                          <th 
                            key={colIndex} 
                            className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                              isRequired ? 'text-red-600 bg-red-50' : 'text-gray-500'
                            } ${hasErrors ? 'border-2 border-red-300' : ''}`}
                          >
                            <div className="flex items-center space-x-1">
                              <span>{header}</span>
                              {isRequired && <span className="text-red-500">*</span>}
                              {hasErrors && <AlertTriangle className="w-3 h-3 text-red-500" />}
                            </div>
                          </th>
                        )
                      })}
                      <th className="w-16 px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tableData.map((row, rowIndex) => (
                      <tr key={rowIndex} className={`hover:bg-gray-50 ${
                        validationErrors.some(err => err.row === rowIndex) ? 'bg-red-50' : ''
                      }`}>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900 bg-gray-50">
                          {rowIndex + 1}
                        </td>
                        {row.map((cell, colIndex) => {
                          const cellError = validationErrors.find(
                            err => err.row === rowIndex && err.column === headers[colIndex]
                          )
                          const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex
                          
                          return (
                            <td 
                              key={colIndex} 
                              className={`px-1 py-1 text-sm relative ${
                                cell.hasError 
                                  ? cellError?.severity === 'error' 
                                    ? 'bg-red-100 border border-red-300' 
                                    : 'bg-yellow-100 border border-yellow-300'
                                  : cell.isEdited 
                                    ? 'bg-blue-50 border border-blue-300' 
                                    : 'border border-gray-200'
                              }`}
                              title={cell.error || (cell.isEdited ? 'Valor modificado' : '')}
                            >
                              {isEditing ? (
                                <input
                                  type="text"
                                  value={cell.value}
                                  onChange={(e) => updateCell(rowIndex, colIndex, e.target.value)}
                                  onBlur={() => setEditingCell(null)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === 'Tab') {
                                      setEditingCell(null)
                                    }
                                    if (e.key === 'Escape') {
                                      updateCell(rowIndex, colIndex, cell.originalValue)
                                      setEditingCell(null)
                                    }
                                  }}
                                  className="w-full px-2 py-1 text-sm border-none focus:outline-none focus:ring-2 focus:ring-pink-500"
                                  autoFocus
                                />
                              ) : (
                                <div
                                  onClick={() => setEditingCell({ row: rowIndex, col: colIndex })}
                                  className="min-h-[32px] px-2 py-1 cursor-text hover:bg-gray-100 flex items-center"
                                >
                                  <span className={cell.value ? '' : 'text-gray-400'}>
                                    {cell.value || 'Vacío'}
                                  </span>
                                  {cell.isEdited && (
                                    <Edit3 className="w-3 h-3 text-blue-500 ml-auto" />
                                  )}
                                  {cell.hasError && (
                                    <AlertTriangle className={`w-3 h-3 ml-1 ${
                                      cellError?.severity === 'error' ? 'text-red-500' : 'text-yellow-500'
                                    }`} />
                                  )}
                                </div>
                              )}
                            </td>
                          )
                        })}
                        <td className="px-2 py-2 text-center">
                          <button
                            onClick={() => deleteRow(rowIndex)}
                            className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded"
                            title="Eliminar fila"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Validation Summary */}
            {validationErrors.length > 0 && (
              <div className="mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-2">Errores de Validación:</h4>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {validationErrors.slice(0, 10).map((error, index) => (
                    <div key={index} className={`text-xs p-2 rounded flex items-start space-x-2 ${
                      error.severity === 'error' 
                        ? 'bg-red-50 text-red-700 border border-red-200' 
                        : 'bg-yellow-50 text-yellow-700 border border-yellow-200'
                    }`}>
                      {error.severity === 'error' ? (
                        <AlertCircle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      )}
                      <span>
                        Fila {error.row + 1}, {error.column}: {error.error}
                      </span>
                    </div>
                  ))}
                  {validationErrors.length > 10 && (
                    <div className="text-xs text-gray-500 text-center">
                      ... y {validationErrors.length - 10} errores más
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Importing Step */}
      {importStep === 'importing' && (
        <div className="space-y-6">
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