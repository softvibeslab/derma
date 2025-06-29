import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  User, 
  Calendar, 
  Scissors, 
  CreditCard, 
  CheckCircle,
  ArrowRight,
  Plus,
  Search,
  Clock,
  DollarSign,
  FileText,
  Star
} from 'lucide-react'
import { format, addWeeks } from 'date-fns'
import { es } from 'date-fns/locale'

interface Patient {
  id: string
  nombre_completo: string
  telefono: string | null
  cumpleanos: string | null
  zonas_tratamiento: string[] | null
}

interface Service {
  id: string
  nombre: string
  zona: string
  precio_base: number
  duracion_minutos: number | null
  sesiones_recomendadas: number | null
}

interface WorkflowStep {
  id: number
  title: string
  description: string
  icon: React.ComponentType<any>
  completed: boolean
  active: boolean
}

export default function Workflow() {
  const { userProfile } = useAuth()
  const [currentStep, setCurrentStep] = useState(1)
  const [patients, setPatients] = useState<Patient[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchPatient, setSearchPatient] = useState('')
  const [newPatientMode, setNewPatientMode] = useState(false)

  // Estados para nuevo paciente
  const [newPatient, setNewPatient] = useState({
    nombre_completo: '',
    telefono: '',
    cumpleanos: '',
    localidad: '',
    zonas_tratamiento: [] as string[],
    observaciones: '',
    sexo: ''
  })

  // Estados para cita
  const [appointmentData, setAppointmentData] = useState({
    fecha_hora: '',
    numero_sesion: 1,
    observaciones_caja: ''
  })

  // Estados para pago
  const [paymentData, setPaymentData] = useState({
    metodo_pago: 'efectivo',
    monto_recibido: '',
    descuento: '',
    observaciones: ''
  })

  // Estado para mostrar progreso
  const [processingStep, setProcessingStep] = useState('')

  const [workflowResults, setWorkflowResults] = useState({
    patientId: '',
    appointmentId: '',
    paymentId: ''
  })

  const steps: WorkflowStep[] = [
    {
      id: 1,
      title: 'Seleccionar/Crear Paciente',
      description: 'Busca un paciente existente o registra uno nuevo',
      icon: User,
      completed: !!selectedPatient,
      active: currentStep === 1
    },
    {
      id: 2,
      title: 'Seleccionar Servicio',
      description: 'Elige el servicio de depilación láser',
      icon: Scissors,
      completed: !!selectedService,
      active: currentStep === 2
    },
    {
      id: 3,
      title: 'Agendar Cita',
      description: 'Programa la fecha y hora del tratamiento',
      icon: Calendar,
      completed: !!workflowResults.appointmentId,
      active: currentStep === 3
    },
    {
      id: 4,
      title: 'Procesar Pago',
      description: 'Cobra el servicio y genera comprobante',
      icon: CreditCard,
      completed: !!workflowResults.paymentId,
      active: currentStep === 4
    },
    {
      id: 5,
      title: 'Completado',
      description: 'Flujo completado exitosamente',
      icon: CheckCircle,
      completed: !!workflowResults.paymentId,
      active: currentStep === 5
    }
  ]

  useEffect(() => {
    fetchPatients()
    fetchServices()
  }, [])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('id, nombre_completo, telefono, cumpleanos, zonas_tratamiento')
        .eq('is_active', true)
        .order('nombre_completo')

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
    }
  }

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('nombre')

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    }
  }

  const filteredPatients = patients.filter(patient =>
    patient.nombre_completo.toLowerCase().includes(searchPatient.toLowerCase()) ||
    patient.telefono?.includes(searchPatient)
  )

  const handleCreatePatient = async () => {
    setProcessingStep('Validando datos del paciente...')
    
    if (!newPatient.nombre_completo.trim()) {
      alert('El nombre del paciente es requerido')
      setProcessingStep('')
      return
    }

    // Validaciones adicionales
    if (newPatient.telefono && newPatient.telefono.trim() && !/^\d{10}$/.test(newPatient.telefono.replace(/\D/g, ''))) {
      alert('El teléfono debe tener 10 dígitos')
      setProcessingStep('')
      return
    }
    
    // Validación de fecha de nacimiento
    if (newPatient.cumpleanos) {
      const birthDate = new Date(newPatient.cumpleanos)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      
      if (age < 0 || age > 120) {
        alert('Fecha de nacimiento inválida')
        setProcessingStep('')
        return
      }
    }

    setLoading(true)
    setProcessingStep('Creando paciente en la base de datos...')
    
    try {
      const { data, error } = await supabase
        .from('patients')
        .insert([{
          nombre_completo: newPatient.nombre_completo.trim(),
          telefono: newPatient.telefono?.trim() || null,
          cumpleanos: newPatient.cumpleanos || null,
          sexo: newPatient.sexo || null,
          localidad: newPatient.localidad?.trim() || null,
          zonas_tratamiento: newPatient.zonas_tratamiento.length > 0 ? newPatient.zonas_tratamiento : null,
          observaciones: newPatient.observaciones?.trim() || null
        }])
        .select()
        .single()

      if (error) throw error

      setSelectedPatient(data)
      setWorkflowResults(prev => ({ ...prev, patientId: data.id }))
      setNewPatientMode(false)
      setProcessingStep('¡Paciente creado exitosamente!')
      
      // Pequeña pausa para mostrar el mensaje de éxito
      setTimeout(() => {
        setProcessingStep('')
        setCurrentStep(2)
      }, 1000)
      
      await fetchPatients()
      
    } catch (error) {
      console.error('Error creating patient:', error)
      alert('Error al crear el paciente')
      setProcessingStep('')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setWorkflowResults(prev => ({ ...prev, patientId: patient.id }))
    setCurrentStep(2)
  }

  const handleSelectService = (service: Service) => {
    setSelectedService(service)
    setCurrentStep(3)
  }

  const handleCreateAppointment = async () => {
    setProcessingStep('Validando datos de la cita...')
    
    if (!selectedPatient || !selectedService || !appointmentData.fecha_hora) {
      alert('Faltan datos para crear la cita')
      setProcessingStep('')
      return
    }

    // Validar que la fecha no sea en el pasado
    if (new Date(appointmentData.fecha_hora) < new Date()) {
      alert('La fecha y hora no puede ser en el pasado')
      setProcessingStep('')
      return
    }
    
    setLoading(true)
    setProcessingStep('Agendando cita en el sistema...')
    
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert([{
          patient_id: selectedPatient.id,
          service_id: selectedService.id,
          operadora_id: userProfile?.id,
          cajera_id: userProfile?.id,
          fecha_hora: appointmentData.fecha_hora,
          duracion_minutos: selectedService.duracion_minutos,
          numero_sesion: appointmentData.numero_sesion,
          status: 'agendada',
          observaciones_caja: appointmentData.observaciones_caja?.trim() || null,
          is_paid: false
        }])
        .select()
        .single()

      if (error) throw error

      setProcessingStep('¡Cita agendada exitosamente!')
      setWorkflowResults(prev => ({ ...prev, appointmentId: data.id }))
      
      // Pequeña pausa para mostrar el mensaje de éxito
      setTimeout(() => {
        setProcessingStep('')
        setCurrentStep(4)
      }, 1000)
      
    } catch (error) {
      console.error('Error creating appointment:', error)
      alert('Error al agendar la cita')
      setProcessingStep('')
    } finally {
      setLoading(false)
    }
  }

  const handleProcessPayment = async () => {
    setProcessingStep('Validando datos del pago...')
    
    if (!selectedPatient || !selectedService || !workflowResults.appointmentId) {
      alert('Faltan datos para procesar el pago')
      setProcessingStep('')
      return
    }

    const descuento = parseFloat(paymentData.descuento) || 0
    const montoTotal = Math.max(0, selectedService.precio_base - descuento)
    
    if (montoTotal <= 0) {
      alert('El monto total debe ser mayor a 0')
      setProcessingStep('')
      return
    }

    if (paymentData.metodo_pago === 'efectivo' && paymentData.monto_recibido) {
      const recibido = parseFloat(paymentData.monto_recibido)
      if (recibido < montoTotal) {
        alert('El monto recibido debe ser mayor o igual al total')
        setProcessingStep('')
        return
      }
    }

    // Validación de método de pago
    if (!paymentData.metodo_pago) {
      alert('Debe seleccionar un método de pago')
      setProcessingStep('')
      return
    }
    
    setLoading(true)
    setProcessingStep('Procesando pago...')
    
    try {
      // Crear pago
      setProcessingStep('Registrando pago en el sistema...')
      const { data: payment, error: paymentError } = await supabase
        .from('payments')
        .insert([{
          patient_id: selectedPatient.id,
          appointment_id: workflowResults.appointmentId,
          monto: montoTotal,
          metodo_pago: paymentData.metodo_pago,
          cajera_id: userProfile?.id || null,
          observaciones: paymentData.observaciones?.trim() || null,
          tipo_pago: 'pago_sesion',
          referencia: paymentData.metodo_pago !== 'efectivo' ? `REF-${Date.now()}` : null,
          banco: paymentData.metodo_pago === 'bbva' ? 'BBVA' : 
                 paymentData.metodo_pago === 'clip' ? 'Clip' : null
        }])
        .select()
        .single()

      if (paymentError) throw paymentError

      // Actualizar cita como completada
      setProcessingStep('Actualizando estado de la cita...')
      await supabase
        .from('appointments')
        .update({ 
          status: 'completada',
          is_paid: true
        })
        .eq('id', workflowResults.appointmentId)

      setProcessingStep('¡Pago procesado exitosamente!')
      setWorkflowResults(prev => ({ ...prev, paymentId: payment.id }))
      
      // Pequeña pausa para mostrar el mensaje de éxito
      setTimeout(() => {
        setProcessingStep('')
        setCurrentStep(5)
      }, 1500)
      
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Error al procesar el pago')
      setProcessingStep('')
    } finally {
      setLoading(false)
    }
  }

  const resetWorkflow = () => {
    setCurrentStep(1)
    setSelectedPatient(null)
    setSelectedService(null)
    setNewPatientMode(false)
    setWorkflowResults({ patientId: '', appointmentId: '', paymentId: '' })
    setNewPatient({
      nombre_completo: '',
      telefono: '',
      cumpleanos: '',
      sexo: '',
      localidad: '',
      zonas_tratamiento: [],
      observaciones: ''
    })
    setAppointmentData({
      fecha_hora: '',
      numero_sesion: 1,
      observaciones_caja: ''
    })
    setPaymentData({
      metodo_pago: 'efectivo',
      monto_recibido: '',
      descuento: '',
      observaciones: ''
    })
  }

  const calculateTotal = () => {
    if (!selectedService) return 0
    const descuento = parseFloat(paymentData.descuento) || 0
    return Math.max(0, selectedService.precio_base - descuento)
  }

  const calculateChange = () => {
    if (paymentData.metodo_pago !== 'efectivo' || !paymentData.monto_recibido) return 0
    const total = calculateTotal()
    const recibido = parseFloat(paymentData.monto_recibido)
    return Math.max(0, recibido - total)
  }

  const generateTestPatient = () => {
    const names = [
      'María García López', 'Ana Rodríguez Pérez', 'Sofia Hernández Torres',
      'Isabella Castro Morales', 'Valeria Martín González', 'Camila Torres Ruiz'
    ]
    const phones = ['9841234567', '9847654321', '9843216789', '9849876543']
    const locations = ['Playa del Carmen', 'Cancún', 'Tulum', 'Cozumel']
    
    const randomName = names[Math.floor(Math.random() * names.length)]
    const randomPhone = phones[Math.floor(Math.random() * phones.length)]
    const randomLocation = locations[Math.floor(Math.random() * locations.length)]
    
    setNewPatient({
      nombre_completo: randomName,
      telefono: randomPhone,
      cumpleanos: '1990-05-15',
      sexo: 'F',
      localidad: randomLocation,
      zonas_tratamiento: ['axilas', 'piernas'],
      observaciones: 'Paciente de prueba generado automáticamente'
    })
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Star className="w-7 h-7 mr-3 text-pink-600" />
          Flujo de Trabajo 360°
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Proceso completo: Paciente → Servicio → Cita → Pago → Seguimiento
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <div className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-500 text-white' :
                  step.active ? 'bg-pink-600 text-white' :
                  'bg-gray-200 text-gray-500'
                }`}>
                  {step.completed ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-5 h-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p className="text-sm font-medium text-gray-900">{step.title}</p>
                  <p className="text-xs text-gray-500 max-w-24">{step.description}</p>
                </div>
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-5 h-5 text-gray-400 mx-4 mt-[-20px]" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Processing Status */}
      {processingStep && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-blue-800 font-medium">{processingStep}</span>
          </div>
        </div>
      )}

      {/* Step Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Step 1: Seleccionar/Crear Paciente */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paso 1: Seleccionar o Crear Paciente</h3>
            
            <div className="flex space-x-4 mb-6">
              <button
                onClick={() => setNewPatientMode(false)}
                className={`px-4 py-2 rounded-lg ${!newPatientMode ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Paciente Existente
              </button>
              <button
                onClick={() => setNewPatientMode(true)}
                className={`px-4 py-2 rounded-lg ${newPatientMode ? 'bg-pink-600 text-white' : 'bg-gray-200 text-gray-700'}`}
              >
                Nuevo Paciente
              </button>
            </div>

            {!newPatientMode ? (
              <div>
                <div className="mb-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o teléfono..."
                      value={searchPatient}
                      onChange={(e) => setSearchPatient(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                  {filteredPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => handleSelectPatient(patient)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    >
                      <h4 className="font-medium text-gray-900">{patient.nombre_completo}</h4>
                      {patient.telefono && (
                        <p className="text-sm text-gray-600">{patient.telefono}</p>
                      )}
                      {patient.zonas_tratamiento && patient.zonas_tratamiento.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {patient.zonas_tratamiento.slice(0, 3).map((zona) => (
                            <span key={zona} className="px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded-full">
                              {zona}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-md font-medium text-gray-900">Datos del Nuevo Paciente</h4>
                  <button
                    onClick={generateTestPatient}
                    className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Datos de Prueba
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre Completo *
                    </label>
                    <input
                      type="text"
                      required
                      value={newPatient.nombre_completo}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, nombre_completo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Teléfono
                    </label>
                    <input
                      type="tel"
                      value={newPatient.telefono}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, telefono: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sexo
                    </label>
                    <select
                      value={newPatient.sexo}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, sexo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="F">Femenino</option>
                      <option value="M">Masculino</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Nacimiento
                    </label>
                    <input
                      type="date"
                      value={newPatient.cumpleanos}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, cumpleanos: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Localidad
                    </label>
                    <input
                      type="text"
                      value={newPatient.localidad}
                      onChange={(e) => setNewPatient(prev => ({ ...prev, localidad: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Zonas de Tratamiento (Opcional)
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {['axilas', 'piernas', 'brazos', 'bikini_brasileno', 'bikini_full', 'ingles', 'labio_superior', 'menton'].map((zona) => (
                      <label key={zona} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={newPatient.zonas_tratamiento.includes(zona)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewPatient(prev => ({
                                ...prev,
                                zonas_tratamiento: [...prev.zonas_tratamiento, zona]
                              }))
                            } else {
                              setNewPatient(prev => ({
                                ...prev,
                                zonas_tratamiento: prev.zonas_tratamiento.filter(z => z !== zona)
                              }))
                            }
                          }}
                          className="rounded border-gray-300 text-pink-600 focus:ring-pink-500 mr-2"
                        />
                        <span className="text-sm text-gray-700 capitalize">
                          {zona.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Observaciones
                  </label>
                  <textarea
                    rows={3}
                    value={newPatient.observaciones}
                    onChange={(e) => setNewPatient(prev => ({ ...prev, observaciones: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="Alergias, condiciones especiales, etc."
                  />
                </div>

                {/* Indicador de progreso durante la creación */}
                {loading && (
                  <div className="text-center py-4">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
                    <p className="text-sm text-gray-600">Creando paciente...</p>
                  </div>
                )}

                <button
                  onClick={handleCreatePatient}
                  disabled={loading || !newPatient.nombre_completo.trim()}
                  className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'Creando Paciente...' : 'Crear Paciente y Continuar'}
                </button>
                
                {/* Mensaje de ayuda */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-blue-800 text-sm">
                    💡 <strong>Tip:</strong> Haz clic en "Datos de Prueba" para llenar automáticamente el formulario con información de ejemplo.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 2: Seleccionar Servicio */}
        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paso 2: Seleccionar Servicio</h3>
            
            {selectedPatient && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-900">Paciente Seleccionado:</h4>
                <p className="text-gray-600">{selectedPatient.nombre_completo}</p>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map((service) => (
                <div
                  key={service.id}
                  onClick={() => handleSelectService(service)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <h4 className="font-medium text-gray-900 mb-2">{service.nombre}</h4>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex items-center">
                      <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                      ${service.precio_base.toLocaleString()}
                    </div>
                    {service.duracion_minutos && (
                      <div className="flex items-center">
                        <Clock className="w-4 h-4 mr-1 text-blue-600" />
                        {service.duracion_minutos} min
                      </div>
                    )}
                    {service.sesiones_recomendadas && (
                      <div className="flex items-center">
                        <Scissors className="w-4 h-4 mr-1 text-purple-600" />
                        {service.sesiones_recomendadas} sesiones
                      </div>
                    )}
                  </div>
                  <span className="inline-block mt-2 px-2 py-1 text-xs bg-pink-100 text-pink-800 rounded-full capitalize">
                    {service.zona.replace('_', ' ')}
                  </span>
                </div>
              ))}
            </div>
            
            {services.length === 0 && (
              <div className="text-center py-8">
                <Scissors className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay servicios disponibles</p>
                <p className="text-gray-400 text-sm">Contacta al administrador para agregar servicios</p>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Agendar Cita */}
        {currentStep === 3 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paso 3: Agendar Cita</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Paciente:</h4>
                <p className="text-gray-600">{selectedPatient?.nombre_completo}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Servicio:</h4>
                <p className="text-gray-600">{selectedService?.nombre}</p>
                <p className="text-green-600 font-medium">${selectedService?.precio_base.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha y Hora *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={appointmentData.fecha_hora}
                    onChange={(e) => setAppointmentData(prev => ({ ...prev, fecha_hora: e.target.value }))}
                    min={new Date().toISOString().slice(0, 16)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Número de Sesión
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={appointmentData.numero_sesion}
                    onChange={(e) => setAppointmentData(prev => ({ ...prev, numero_sesion: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  value={appointmentData.observaciones_caja}
                  onChange={(e) => setAppointmentData(prev => ({ ...prev, observaciones_caja: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Notas especiales para la cita..."
                />
              </div>

              {/* Indicador de progreso durante la creación de cita */}
              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Agendando cita...</p>
                </div>
              )}

              <button
                onClick={handleCreateAppointment}
                disabled={loading || !appointmentData.fecha_hora || !selectedService}
                className="w-full px-4 py-2 bg-pink-600 text-white rounded-lg hover:bg-pink-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Agendando Cita...' : 'Agendar Cita y Continuar'}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Procesar Pago */}
        {currentStep === 4 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Paso 4: Procesar Pago</h3>
            
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h4 className="font-medium text-gray-900">Paciente:</h4>
                  <p className="text-gray-600">{selectedPatient?.nombre_completo}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Servicio:</h4>
                  <p className="text-gray-600">{selectedService?.nombre}</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Cita:</h4>
                  <p className="text-gray-600">
                    {appointmentData.fecha_hora && format(new Date(appointmentData.fecha_hora), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de Pago
                  </label>
                  <select
                    value={paymentData.metodo_pago}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, metodo_pago: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  >
                    <option value="efectivo">Efectivo</option>
                    <option value="transferencia">Transferencia</option>
                    <option value="bbva">BBVA</option>
                    <option value="clip">Clip</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descuento
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.descuento}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, descuento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {paymentData.metodo_pago === 'efectivo' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monto Recibido
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentData.monto_recibido}
                    onChange={(e) => setPaymentData(prev => ({ ...prev, monto_recibido: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones del Pago
                </label>
                <textarea
                  rows={2}
                  value={paymentData.observaciones}
                  onChange={(e) => setPaymentData(prev => ({ ...prev, observaciones: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                  placeholder="Notas del pago..."
                />
              </div>

              {/* Resumen de pago */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${selectedService?.precio_base.toLocaleString()}</span>
                </div>
                {paymentData.descuento && (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Descuento:</span>
                    <span>-${parseFloat(paymentData.descuento).toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>Total:</span>
                  <span className="text-green-600">${calculateTotal().toLocaleString()}</span>
                </div>
                {paymentData.metodo_pago === 'efectivo' && paymentData.monto_recibido && (
                  <div className="flex justify-between text-md text-blue-600">
                    <span>Cambio:</span>
                    <span>${calculateChange().toLocaleString()}</span>
                  </div>
                )}
              </div>

              {/* Indicador de progreso durante el pago */}
              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">Procesando pago...</p>
                </div>
              )}

              <button
                onClick={handleProcessPayment}
                disabled={loading || calculateTotal() <= 0}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
              >
                {loading ? 'Procesando Pago...' : `Procesar Pago ($${calculateTotal().toLocaleString()})`}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Completado */}
        {currentStep === 5 && (
          <div className="text-center">
            <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-gray-900 mb-4">¡Proceso Completado!</h3>
            
            <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
              <h4 className="font-medium text-green-900 mb-4">Resumen del Proceso:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-green-700"><strong>Paciente:</strong> {selectedPatient?.nombre_completo}</p>
                  <p className="text-sm text-green-700"><strong>Servicio:</strong> {selectedService?.nombre}</p>
                  <p className="text-sm text-green-700"><strong>Monto:</strong> ${calculateTotal().toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-green-700">
                    <strong>Cita:</strong> {appointmentData.fecha_hora && format(new Date(appointmentData.fecha_hora), 'dd MMM yyyy HH:mm', { locale: es })}
                  </p>
                  <p className="text-sm text-green-700"><strong>Método:</strong> {paymentData.metodo_pago}</p>
                  <p className="text-sm text-green-700"><strong>Estado:</strong> Completado</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <FileText className="w-8 h-8 text-blue-600" />
                  </div>
                  <p className="text-blue-800 font-medium">Expediente</p>
                  <p className="text-blue-600 text-sm">Actualizado</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <Calendar className="w-8 h-8 text-purple-600" />
                  </div>
                  <p className="text-purple-800 font-medium">Próxima Cita</p>
                  <p className="text-purple-600 text-sm">
                    {appointmentData.fecha_hora && format(addWeeks(new Date(appointmentData.fecha_hora), 4), 'dd MMM yyyy', { locale: es })}
                  </p>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center justify-center mb-2">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                  </div>
                  <p className="text-green-800 font-medium">Pago</p>
                  <p className="text-green-600 text-sm">Procesado</p>
                </div>
              </div>

              {/* Acciones adicionales */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={() => window.location.href = '/patients'}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
                >
                  <User className="w-4 h-4 mr-2" />
                  Ver Expediente del Paciente
                </button>
                <button
                  onClick={() => window.location.href = '/reports'}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center justify-center"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Ver Reportes
                </button>
              </div>

              <button
                onClick={resetWorkflow}
                className="px-6 py-3 bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
              >
                Nuevo Proceso
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      {currentStep > 1 && currentStep < 5 && (
        <div className="mt-6 flex justify-between">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
          >
            Anterior
          </button>
          
          <button
            onClick={resetWorkflow}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reiniciar Proceso
          </button>
        </div>
      )}
    </div>
  )
}