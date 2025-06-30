import React, { useState } from 'react'
import { testSuite, TestSuiteResults, TestResult } from '../utils/testSuite'
import { 
  Play, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Database,
  Users,
  Calendar,
  CreditCard,
  Scissors,
  Shield,
  BarChart3,
  Upload,
  Star,
  Settings
} from 'lucide-react'

const moduleIcons: Record<string, React.ComponentType<any>> = {
  Database: Database,
  Auth: Users,
  Roles: Shield,
  Patients: Users,
  Services: Scissors,
  Appointments: Calendar,
  Payments: CreditCard,
  Users: Settings,
  Reports: BarChart3,
  Import: Upload,
  Workflow: Star
}

export default function TestDashboard() {
  const [results, setResults] = useState<TestSuiteResults | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [selectedModule, setSelectedModule] = useState<string | null>(null)

  const runTests = async () => {
    setIsRunning(true)
    setResults(null)
    
    try {
      const testResults = await testSuite.runAllTests()
      setResults(testResults)
    } catch (error) {
      console.error('Error running tests:', error)
    } finally {
      setIsRunning(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'error':
        return <XCircle className="w-5 h-5 text-red-600" />
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800'
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800'
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const groupedResults = results?.results.reduce((acc, result) => {
    if (!acc[result.module]) {
      acc[result.module] = []
    }
    acc[result.module].push(result)
    return acc
  }, {} as Record<string, TestResult[]>) || {}

  const filteredResults = selectedModule 
    ? { [selectedModule]: groupedResults[selectedModule] || [] }
    : groupedResults

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Play className="w-7 h-7 mr-3 text-pink-600" />
          Suite de Pruebas Integral
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Validación completa de todos los módulos y funcionalidades del sistema
        </p>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={runTests}
              disabled={isRunning}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-50 transition-all"
            >
              {isRunning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Ejecutando Pruebas...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Ejecutar Todas las Pruebas
                </>
              )}
            </button>

            {results && (
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-600 mr-1" />
                  <span className="text-green-600 font-medium">{results.summary.passed} Exitosas</span>
                </div>
                <div className="flex items-center">
                  <XCircle className="w-4 h-4 text-red-600 mr-1" />
                  <span className="text-red-600 font-medium">{results.summary.failed} Errores</span>
                </div>
                <div className="flex items-center">
                  <AlertTriangle className="w-4 h-4 text-yellow-600 mr-1" />
                  <span className="text-yellow-600 font-medium">{results.summary.warnings} Advertencias</span>
                </div>
              </div>
            )}
          </div>

          {results && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">Filtrar por módulo:</span>
              <select
                value={selectedModule || ''}
                onChange={(e) => setSelectedModule(e.target.value || null)}
                className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
              >
                <option value="">Todos los módulos</option>
                {Object.keys(groupedResults).map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Overall Status */}
      {results && (
        <div className={`rounded-lg border p-4 mb-6 ${getStatusColor(results.overall)}`}>
          <div className="flex items-center">
            {getStatusIcon(results.overall)}
            <div className="ml-3">
              <h3 className="text-lg font-medium">
                Estado General: {results.overall === 'success' ? 'Exitoso' : 
                                results.overall === 'error' ? 'Con Errores' : 'Con Advertencias'}
              </h3>
              <p className="text-sm">
                {results.summary.passed} de {results.summary.total} pruebas pasaron exitosamente
                {results.summary.failed > 0 && ` • ${results.summary.failed} errores encontrados`}
                {results.summary.warnings > 0 && ` • ${results.summary.warnings} advertencias`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Test Results */}
      {results && (
        <div className="space-y-6">
          {Object.entries(filteredResults).map(([module, moduleResults]) => {
            const ModuleIcon = moduleIcons[module] || Settings
            const moduleStatus = moduleResults.some(r => r.status === 'error') ? 'error' :
                               moduleResults.some(r => r.status === 'warning') ? 'warning' : 'success'

            return (
              <div key={module} className="bg-white rounded-lg shadow-sm border border-gray-200">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <ModuleIcon className="w-6 h-6 text-pink-600 mr-3" />
                      <h3 className="text-lg font-medium text-gray-900">{module}</h3>
                      {getStatusIcon(moduleStatus)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {moduleResults.length} prueba{moduleResults.length !== 1 ? 's' : ''}
                    </div>
                  </div>
                </div>

                <div className="p-6">
                  <div className="space-y-4">
                    {moduleResults.map((result, index) => (
                      <div key={index} className={`rounded-lg border p-4 ${getStatusColor(result.status)}`}>
                        <div className="flex items-start justify-between">
                          <div className="flex items-start">
                            {getStatusIcon(result.status)}
                            <div className="ml-3 flex-1">
                              <h4 className="font-medium">{result.test}</h4>
                              <p className="text-sm mt-1">{result.message}</p>
                              {result.details && (
                                <details className="mt-2">
                                  <summary className="cursor-pointer text-sm font-medium">
                                    Ver detalles
                                  </summary>
                                  <pre className="mt-2 text-xs bg-white bg-opacity-50 p-2 rounded overflow-auto">
                                    {typeof result.details === 'string' 
                                      ? result.details 
                                      : JSON.stringify(result.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Loading State */}
      {isRunning && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <RefreshCw className="w-12 h-12 text-pink-600 mx-auto mb-4 animate-spin" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Ejecutando Pruebas</h3>
          <p className="text-gray-600">
            Validando todos los módulos del sistema. Esto puede tomar unos momentos...
          </p>
        </div>
      )}

      {/* Empty State */}
      {!results && !isRunning && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <Play className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Suite de Pruebas Lista</h3>
          <p className="text-gray-600 mb-6">
            Ejecuta la suite de pruebas integral para validar todos los módulos del sistema.
          </p>
          <button
            onClick={runTests}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-lg shadow-sm text-base font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <Play className="w-5 h-5 mr-2" />
            Comenzar Pruebas
          </button>
        </div>
      )}

      {/* Test Information */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h4 className="text-lg font-medium text-blue-900 mb-3">¿Qué se está probando?</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-blue-800">
          <div>
            <h5 className="font-medium mb-2">Conectividad</h5>
            <ul className="space-y-1">
              <li>• Conexión a base de datos</li>
              <li>• Salud de las tablas</li>
              <li>• Autenticación</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Operaciones CRUD</h5>
            <ul className="space-y-1">
              <li>• Crear registros</li>
              <li>• Leer datos</li>
              <li>• Actualizar información</li>
              <li>• Eliminar/desactivar</li>
            </ul>
          </div>
          <div>
            <h5 className="font-medium mb-2">Módulos</h5>
            <ul className="space-y-1">
              <li>• Pacientes y servicios</li>
              <li>• Citas y pagos</li>
              <li>• Usuarios y roles</li>
              <li>• Reportes y flujos</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}