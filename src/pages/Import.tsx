import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  Upload, 
  Download, 
  FileText, 
  Users, 
  Calendar,
  CreditCard,
  Scissors,
  AlertCircle,
  CheckCircle,
  X,
  ArrowRight,
  Plus,
  Trash2,
  Edit3
} from 'lucide-react'

interface CSVColumn {
  name: string
  samples: string[]
  detectedType: 'text' | 'number' | 'date' | 'boolean'
}

interface FieldMapping {
  dbField: string
  csvColumn: string | null
  useFixedValue: boolean
  fixedValue: string
  required: boolean
  type: 'text' | 'number' | 'date' | 'boolean' | 'array' | 'select'
  options?: string[]
}

interface ImportStats {
  total: number
  success: number
  errors: number
  warnings: number
}

const DB_FIELDS = {
  patients: [
    { key: 'nombre_completo', label: 'Nombre Completo', required: true, type: 'text' },
    { key: 'telefono', label: 'Teléfono', required: false, type: 'text' },
    { key: 'cumpleanos', label: 'Fecha de Nacimiento', required: false, type: 'date' },
    { key: 'sexo', label: 'Sexo', required: false, type: 'select', options: ['M', 'F'] },
    { key: 'localidad', label: 'Localidad', required: false, type: 'text' },
    { key: 'zonas_tratamiento', label: 'Zonas de Tratamiento', required: false, type: 'array' },
    { key: 'precio_total', label: 'Precio Total', required: false, type: 'number' },
    { key: 'metodo_pago_preferido', label: 'Método de Pago Preferido', required: false, type: 'select', options: ['efectivo', 'transferencia', 'bbva', 'clip'] },
    { key: 'observaciones', label: 'Observaciones', required: false, type: 'text' },
    { key: 'consentimiento_firmado', label: 'Consentimiento Firmado', required: false, type: 'boolean' }
  ],
  services: [
    { key: 'nombre', label: 'Nombre del Servicio', required: true, type: 'text' },
    { key: 'descripcion', label: 'Descripción', required: false, type: 'text' },
    { key: 'zona', label: 'Zona Corporal', required: true, type: 'text' },
    { key: 'precio_base', label: 'Precio Base', required: true, type: 'number' },
    { key: 'duracion_minutos', label: 'Duración (minutos)', required: false, type: 'number' },
    { key: 'sesiones_recomendadas', label: 'Sesiones Recomendadas', required: false, type: 'number' },
    { key: 'tecnologia', label: 'Tecnología', required: false, type: 'text' }
  ],
  appointments: [
    { key: 'patient_id', label: 'ID del Paciente', required: true, type: 'text' },
    { key: 'service_id', label: 'ID del Servicio', required: true, type: 'text' },
    { key: 'fecha_hora', label: 'Fecha y Hora', required: true, type: 'date' },
    { key: 'numero_sesion', label: 'Número de Sesión', required: false, type: 'number' },
    { key: 'status', label: 'Estado', required: false, type: 'select', options: ['agendada', 'confirmada', 'completada', 'cancelada'] },
    { key: 'precio_sesion', label: 'Precio de Sesión', required: false, type: 'number' },
    { key: 'observaciones_caja', label: 'Observaciones', required: false, type: 'text' }
  ],
  payments: [
    { key: 'patient_id', label: 'ID del Paciente', required: true, type: 'text' },
    { key: 'monto', label: 'Monto', required: true, type: 'number' },
    { key: 'metodo_pago', label: 'Método de Pago', required: true, type: 'select', options: ['efectivo', 'transferencia', 'bbva', 'clip'] },
    { key: 'fecha_pago', label: 'Fecha de Pago', required: false, type: 'date' },
    { key: 'banco', label: 'Banco', required: false, type: 'text' },
    { key: 'referencia', label: 'Referencia', required: false, type: 'text' },
    { key: 'observaciones', label: 'Observaciones', required: false, type: 'text' },
    { key: 'tipo_pago', label: 'Tipo de Pago', required: false, type: 'select', options: ['pago_sesion', 'abono', 'transferencia'] }
  ]
}

export default function Import() {
  const { userProfile } = useAuth()
  const [activeTab, setActiveTab] = useState('patients')
  const [step, setStep] = useState(1) // 1: Upload, 2: Mapping, 3: Preview, 4: Import
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [csvColumns, setCsvColumns] = useState<CSVColumn[]>([])
  const [fieldMappings, setFieldMappings] = useState<Record<string, FieldMapping>>({})
  const [loading, setLoading] = useState(false)
  const [importStats, setImportStats] = useState<ImportStats | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [previewData, setPreviewData] = useState<any[]>([])

  const tabs = [
    { id: 'patients', name: 'Pacientes', icon: Users },
    { id: 'services', name: 'Servicios', icon: Scissors },
    { id: 'appointments', name: 'Citas', icon: Calendar },
    { id: 'payments', name: 'Pagos', icon: CreditCard }
  ]

  useEffect(() => {
    initializeFieldMappings()
  }, [activeTab])

  const initializeFieldMappings = () => {
    const fields = DB_FIELDS[activeTab as keyof typeof DB_FIELDS] || []
    const mappings: Record<string, FieldMapping> = {}
    
    fields.forEach(field => {
      mappings[field.key] = {
        dbField: field.key,
        csvColumn: null,
        useFixedValue: false,
        fixedValue: '',
        required: field.required,
        type: field.type,
        options: field.options
      }
    })
    
    setFieldMappings(mappings)
  }

  const detectColumnType = (values: string[]): 'text' | 'number' | 'date' | 'boolean' => {
    const nonEmptyValues = values.filter(v => v && v.trim())
    if (nonEmptyValues.length === 0) return 'text'

    // Check for boolean
    const booleanValues = nonEmptyValues.filter(v => 
      ['true', 'false', 'yes', 'no', 'si', 'no', '1', '0'].includes(v.toLowerCase())
    )
    if (booleanValues.length / nonEmptyValues.length > 0.8) return 'boolean'

    // Check for numbers
    const numberValues = nonEmptyValues.filter(v => !isNaN(Number(v)))
    if (numberValues.length / nonEmptyValues.length > 0.8) return 'number'

    // Check for dates
    const dateValues = nonEmptyValues.filter(v => {
      const date = new Date(v)
      return !isNaN(date.getTime())
    })
    if (dateValues.length / nonEmptyValues.length > 0.8) return 'date'

    return 'text'
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      alert('Por favor selecciona un archivo CSV')
      return
    }

    setLoading(true)
    setCsvFile(file)

    try {
      const text = await file.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('El archivo CSV debe tener al menos una fila de encabezados y una fila de datos')
      }

      // Parse headers
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))
      
      // Parse data
      const data = []
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''))
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        data.push(row)
      }

      // Analyze columns
      const columns: CSVColumn[] = headers.map(header => {
        const values = data.map(row => row[header]).slice(0, 10) // Sample first 10 rows
        return {
          name: header,
          samples: values.filter(v => v).slice(0, 3),
          detectedType: detectColumnType(values)
        }
      })

      setCsvData(data)
      setCsvColumns(columns)
      
      // Auto-map columns by similarity
      autoMapColumns(columns)
      
      setStep(2)
    } catch (error) {
      console.error('Error reading CSV:', error)
      alert('Error al leer el archivo CSV: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const autoMapColumns = (columns: CSVColumn[]) => {
    const fields = DB_FIELDS[activeTab as keyof typeof DB_FIELDS] || []
    const updatedMappings = { ...fieldMappings }

    fields.forEach(field => {
      // Try to find matching column by name similarity
      const matchingColumn = columns.find(col => {
        const colName = col.name.toLowerCase()
        const fieldKey = field.key.toLowerCase()
        const fieldLabel = field.label.toLowerCase()
        
        return colName.includes(fieldKey) || 
               colName.includes(fieldLabel) ||
               fieldKey.includes(colName) ||
               fieldLabel.includes(colName)
      })

      if (matchingColumn) {
        updatedMappings[field.key] = {
          ...updatedMappings[field.key],
          csvColumn: matchingColumn.name,
          useFixedValue: false
        }
      }
    })

    setFieldMappings(updatedMappings)
  }

  const updateFieldMapping = (fieldKey: string, updates: Partial<FieldMapping>) => {
    setFieldMappings(prev => ({
      ...prev,
      [fieldKey]: { ...prev[fieldKey], ...updates }
    }))
  }

  const generatePreview = () => {
    if (csvData.length === 0) return

    const preview = csvData.slice(0, 5).map(row => {
      const transformedRow: any = {}
      
      Object.entries(fieldMappings).forEach(([fieldKey, mapping]) => {
        if (mapping.useFixedValue) {
          transformedRow[fieldKey] = mapping.fixedValue
        } else if (mapping.csvColumn) {
          let value = row[mapping.csvColumn]
          
          // Transform value based on type
          if (mapping.type === 'number' && value) {
            value = parseFloat(value)
          } else if (mapping.type === 'boolean' && value) {
            value = ['true', 'yes', 'si', '1'].includes(value.toLowerCase())
          } else if (mapping.type === 'array' && value) {
            value = value.split(';').map((v: string) => v.trim())
          }
          
          transformedRow[fieldKey] = value
        } else {
          transformedRow[fieldKey] = null
        }
      })
      
      return transformedRow
    })

    setPreviewData(preview)
    setStep(3)
  }

  const validateData = () => {
    const errors: string[] = []
    const fields = DB_FIELDS[activeTab as keyof typeof DB_FIELDS] || []
    
    // Check required fields
    fields.forEach(field => {
      if (field.required) {
        const mapping = fieldMappings[field.key]
        if (!mapping.useFixedValue && !mapping.csvColumn) {
          errors.push(`El campo requerido "${field.label}" no está mapeado`)
        } else if (mapping.useFixedValue && !mapping.fixedValue.trim()) {
          errors.push(`El campo requerido "${field.label}" necesita un valor fijo`)
        }
      }
    })

    setErrors(errors)
    return errors.length === 0
  }

  const executeImport = async () => {
    if (!validateData()) return

    setLoading(true)
    setStep(4)
    
    let success = 0
    let errorsCount = 0
    const importErrors: string[] = []

    try {
      for (const row of csvData) {
        try {
          const transformedRow: any = {}
          
          Object.entries(fieldMappings).forEach(([fieldKey, mapping]) => {
            if (mapping.useFixedValue) {
              transformedRow[fieldKey] = mapping.fixedValue
            } else if (mapping.csvColumn) {
              let value = row[mapping.csvColumn]
              
              // Transform value based on type
              if (mapping.type === 'number' && value) {
                transformedRow[fieldKey] = parseFloat(value)
              } else if (mapping.type === 'boolean' && value) {
                transformedRow[fieldKey] = ['true', 'yes', 'si', '1'].includes(value.toLowerCase())
              } else if (mapping.type === 'array' && value) {
                transformedRow[fieldKey] = value.split(';').map((v: string) => v.trim())
              } else {
                transformedRow[fieldKey] = value || null
              }
            }
          })

          // Insert into database
          const { error } = await supabase
            .from(activeTab)
            .insert([transformedRow])

          if (error) {
            console.error('Database error:', error)
            errorsCount++
            importErrors.push(`Fila ${success + errorsCount + 1}: ${error.message}`)
          } else {
            success++
          }
        } catch (error) {
          errorsCount++
          importErrors.push(`Fila ${success + errorsCount + 1}: Error de procesamiento`)
        }
      }

      setImportStats({
        total: csvData.length,
        success,
        errors: errorsCount,
        warnings: 0
      })

      if (importErrors.length > 0) {
        setErrors(importErrors.slice(0, 10)) // Show first 10 errors
      }

    } catch (error) {
      console.error('Import error:', error)
      alert('Error durante la importación: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const resetImport = () => {
    setStep(1)
    setCsvFile(null)
    setCsvData([])
    setCsvColumns([])
    setPreviewData([])
    setImportStats(null)
    setErrors([])
    initializeFieldMappings()
  }

  const downloadTemplate = () => {
    const fields = DB_FIELDS[activeTab as keyof typeof DB_FIELDS] || []
    const headers = fields.map(field => field.label)
    
    // Create sample data
    const sampleRows = [
      headers, // Headers row
      fields.map(field => {
        switch (field.type) {
          case 'text': return field.key === 'nombre_completo' ? 'Juan Pérez' : 'Ejemplo'
          case 'number': return '100'
          case 'date': return '2025-01-01'
          case 'boolean': return 'true'
          case 'select': return field.options?.[0] || 'opcion1'
          case 'array': return 'valor1;valor2'
          default: return 'ejemplo'
        }
      })
    ]

    const csvContent = sampleRows.map(row => row.join(',')).join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plantilla-${activeTab}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-8">
      {[
        { num: 1, label: 'Subir CSV' },
        { num: 2, label: 'Mapear Campos' },
        { num: 3, label: 'Vista Previa' },
        { num: 4, label: 'Importar' }
      ].map((stepItem, index) => (
        <React.Fragment key={stepItem.num}>
          <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
            step >= stepItem.num 
              ? 'bg-pink-600 border-pink-600 text-white' 
              : 'border-gray-300 text-gray-500'
          }`}>
            {step > stepItem.num ? (
              <CheckCircle className="w-6 h-6" />
            ) : (
              <span className="text-sm font-medium">{stepItem.num}</span>
            )}
          </div>
          <span className={`ml-2 text-sm font-medium ${
            step >= stepItem.num ? 'text-gray-900' : 'text-gray-500'
          }`}>
            {stepItem.label}
          </span>
          {index < 3 && (
            <ArrowRight className="w-5 h-5 text-gray-400 mx-4" />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Upload className="w-7 h-7 mr-3 text-pink-600" />
          Importación de Datos
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Importa datos desde archivos CSV con mapeo automático de columnas
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                resetImport()
              }}
              className={`whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === tab.id
                  ? 'border-pink-500 text-pink-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4 mr-2" />
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Step Indicator */}
      {step > 1 && renderStepIndicator()}

      {/* Step 1: File Upload */}
      {step === 1 && (
        <div className="max-w-2xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
            <div className="text-center">
              <Upload className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900">
                Subir archivo CSV
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Selecciona un archivo CSV para importar {tabs.find(t => t.id === activeTab)?.name.toLowerCase()}
              </p>
              
              <div className="mt-6">
                <label className="relative cursor-pointer bg-white rounded-lg border-2 border-dashed border-gray-300 p-6 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-colors">
                  <input
                    type="file"
                    className="sr-only"
                    accept=".csv"
                    onChange={handleFileUpload}
                    disabled={loading}
                  />
                  <div className="space-y-2">
                    <FileText className="mx-auto h-8 w-8 text-gray-400" />
                    <div className="text-sm text-gray-600">
                      <span className="font-medium text-pink-600 hover:text-pink-500">
                        Haz clic para seleccionar
                      </span>
                      {' o arrastra y suelta'}
                    </div>
                    <p className="text-xs text-gray-500">CSV hasta 10MB</p>
                  </div>
                </label>
              </div>

              <div className="mt-6 flex items-center justify-center space-x-4">
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Descargar Plantilla
                </button>
              </div>

              {loading && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-600 mr-2"></div>
                  <span className="text-sm text-gray-600">Procesando archivo...</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Field Mapping */}
      {step === 2 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Mapear Campos
            </h3>
            <p className="text-sm text-gray-600">
              Relaciona las columnas de tu CSV con los campos de la base de datos, o asigna valores fijos
            </p>
          </div>

          <div className="space-y-4">
            {Object.entries(fieldMappings).map(([fieldKey, mapping]) => {
              const field = DB_FIELDS[activeTab as keyof typeof DB_FIELDS]?.find(f => f.key === fieldKey)
              if (!field) return null

              return (
                <div key={fieldKey} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-gray-900 flex items-center">
                        {field.label}
                        {field.required && <span className="text-red-500 ml-1">*</span>}
                      </h4>
                      <p className="text-sm text-gray-500">
                        Tipo: {field.type} 
                        {field.options && ` (${field.options.join(', ')})`}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`mapping-${fieldKey}`}
                          checked={!mapping.useFixedValue}
                          onChange={() => updateFieldMapping(fieldKey, { useFixedValue: false })}
                          className="text-pink-600 focus:ring-pink-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Columna CSV</span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name={`mapping-${fieldKey}`}
                          checked={mapping.useFixedValue}
                          onChange={() => updateFieldMapping(fieldKey, { useFixedValue: true })}
                          className="text-pink-600 focus:ring-pink-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">Valor Fijo</span>
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CSV Column Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Columna del CSV
                      </label>
                      <select
                        value={mapping.csvColumn || ''}
                        onChange={(e) => updateFieldMapping(fieldKey, { csvColumn: e.target.value || null })}
                        disabled={mapping.useFixedValue}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                      >
                        <option value="">Seleccionar columna...</option>
                        {csvColumns.map(col => (
                          <option key={col.name} value={col.name}>
                            {col.name} ({col.detectedType})
                            {col.samples.length > 0 && ` - ej: ${col.samples.join(', ')}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fixed Value */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Valor Fijo
                      </label>
                      {field.type === 'select' && field.options ? (
                        <div className="space-y-2">
                          <select
                            value={mapping.fixedValue}
                            onChange={(e) => updateFieldMapping(fieldKey, { fixedValue: e.target.value })}
                            disabled={!mapping.useFixedValue}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                          >
                            <option value="">Seleccionar valor...</option>
                            {field.options.map(option => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                            <option value="__custom__">Otro (personalizado)</option>
                          </select>
                          {mapping.fixedValue === '__custom__' && (
                            <input
                              type="text"
                              placeholder="Escribir valor personalizado..."
                              onChange={(e) => updateFieldMapping(fieldKey, { fixedValue: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                            />
                          )}
                        </div>
                      ) : (
                        <input
                          type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                          value={mapping.fixedValue}
                          onChange={(e) => updateFieldMapping(fieldKey, { fixedValue: e.target.value })}
                          disabled={!mapping.useFixedValue}
                          placeholder={`Valor fijo para ${field.label.toLowerCase()}...`}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 disabled:bg-gray-100"
                        />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {errors.length > 0 && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center mb-2">
                <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
                <h4 className="font-medium text-red-800">Errores de Mapeo</h4>
              </div>
              <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex justify-between">
            <button
              onClick={resetImport}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Volver
            </button>
            <button
              onClick={generatePreview}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
            >
              Generar Vista Previa
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Preview */}
      {step === 3 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Vista Previa de Datos
            </h3>
            <p className="text-sm text-gray-600">
              Revisa las primeras 5 filas para confirmar que el mapeo es correcto
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {Object.keys(fieldMappings).map(fieldKey => {
                    const field = DB_FIELDS[activeTab as keyof typeof DB_FIELDS]?.find(f => f.key === fieldKey)
                    return (
                      <th key={fieldKey} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field?.label}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {previewData.map((row, index) => (
                  <tr key={index}>
                    {Object.keys(fieldMappings).map(fieldKey => (
                      <td key={fieldKey} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {Array.isArray(row[fieldKey]) 
                          ? row[fieldKey].join(', ')
                          : String(row[fieldKey] || '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Volver al Mapeo
            </button>
            <button
              onClick={executeImport}
              disabled={loading}
              className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50"
            >
              {loading ? 'Importando...' : `Importar ${csvData.length} registros`}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Import Results */}
      {step === 4 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center">
            {loading ? (
              <div>
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4"></div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Importando datos...
                </h3>
                <p className="text-sm text-gray-600">
                  Por favor espera mientras procesamos los datos
                </p>
              </div>
            ) : importStats ? (
              <div>
                <CheckCircle className="mx-auto h-12 w-12 text-green-600 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Importación Completada
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-green-600">{importStats.success}</div>
                    <div className="text-sm text-green-700">Éxitosos</div>
                  </div>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-red-600">{importStats.errors}</div>
                    <div className="text-sm text-red-700">Errores</div>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="text-2xl font-bold text-gray-600">{importStats.total}</div>
                    <div className="text-sm text-gray-700">Total</div>
                  </div>
                </div>

                {errors.length > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-left">
                    <h4 className="font-medium text-red-800 mb-2">Errores encontrados:</h4>
                    <div className="max-h-32 overflow-y-auto">
                      <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
                        {errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                <button
                  onClick={resetImport}
                  className="px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700"
                >
                  Nueva Importación
                </button>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  )
}