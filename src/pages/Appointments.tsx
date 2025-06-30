import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Calendar, 
  Clock, 
  User, 
  Plus,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  XCircle,
  AlertCircle,
  X,
  Edit,
  Trash2
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, addMonths, subMonths } from 'date-fns'
import { es } from 'date-fns/locale'

interface Appointment {
  id: string
  patient_id: string
  service_id: string
  operadora_id: string | null
  fecha_hora: string
  numero_sesion: number | null
  status: string
  observaciones_caja: string | null
  observaciones_operadora: string | null
  patients: {
    nombre_completo: string
    telefono: string | null
  } | null
  services: {
    nombre: string
    zona: string
    duracion_minutos: number | null
  } | null
  users: {
    full_name: string
  } | null
}

const STATUS_COLORS = {
  agendada: 'bg-blue-100 text-blue-800',
  confirmada: 'bg-green-100 text-green-800',
  completada: 'bg-purple-100 text-purple-800',
  cancelada: 'bg-red-100 text-red-800',
  no_agendada: 'bg-gray-100 text-gray-800'
}

const STATUS_ICONS = {
  agendada: Clock,
  confirmada: CheckCircle,
  completada: CheckCircle,
  cancelada: XCircle,
  no_agendada: AlertCircle
}

export default function Appointments() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    patient_id: '',
    service_id: '',
    operadora_id: '',
    fecha_hora: '',
    numero_sesion: 1,
    status: 'agendada',
    observaciones_caja: ''
  })

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const fetchData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      console.log('🔍 Fetching appointments for:', {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        currentDate: currentDate.toISOString()
      })

      // Fetch appointments with detailed logging
      const appointmentsQuery = supabase
        .from('appointments')
        .select(`
          *,
          patients!inner(nombre_completo, telefono),
          services!inner(nombre, zona, duracion_minutos),
          users(full_name)
        `)
        .gte('fecha_hora', startDate.toISOString())
        .lte('fecha_hora', endDate.toISOString())
        .order('fecha_hora', { ascending: true })

      const appointmentsRes = await appointmentsQuery

      console.log('📊 Appointments response:', {
        data: appointmentsRes.data,
        error: appointmentsRes.error,
        count: appointmentsRes.data?.length || 0
      })

      // Fetch other data concurrently
      const [patientsRes, servicesRes, usersRes] = await Promise.all([
        supabase
          .from('patients')
          .select('id, nombre_completo, telefono')
          .eq('is_active', true)
          .order('nombre_completo'),
        supabase
          .from('services')
          .select('id, nombre, zona, precio_base, duracion_minutos')
          .eq('is_active', true)
          .order('nombre'),
        supabase
          .from('users')
          .select('id, full_name')
          .eq('is_active', true)
          .order('full_name')
      ])

      // Check for errors
      if (appointmentsRes.error) {
        console.error('❌ Error fetching appointments:', appointmentsRes.error)
        throw appointmentsRes.error
      }

      if (patientsRes.error) {
        console.error('❌ Error fetching patients:', patientsRes.error)
        throw patientsRes.error
      }

      if (servicesRes.error) {
        console.error('❌ Error fetching services:', servicesRes.error)
        throw servicesRes.error
      }

      if (usersRes.error) {
        console.error('❌ Error fetching users:', usersRes.error)
        throw usersRes.error
      }

      // Set data
      const appointmentsData = appointmentsRes.data || []
      setAppointments(appointmentsData)
      setPatients(patientsRes.data || [])
      setServices(servicesRes.data || [])
      setUsers(usersRes.data || [])
      
      console.log('✅ Data loaded successfully:', {
        appointments: appointmentsData.length,
        patients: patientsRes.data?.length || 0,
        services: servicesRes.data?.length || 0,
        users: usersRes.data?.length || 0
      })
      
    } catch (error) {
      console.error('💥 Error fetching data:', error)
      setError('Error al cargar los datos: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }

  const getAppointmentsForDate = (date: Date) => {
    const dayAppointments = appointments.filter(appointment => {
      try {
        const appointmentDate = new Date(appointment.fecha_hora)
        const isSameDate = isSameDay(appointmentDate, date)
        const matchesFilter = !statusFilter || appointment.status === statusFilter
        
        return isSameDate && matchesFilter
      } catch (error) {
        console.error('Error processing appointment date:', error, appointment)
        return false
      }
    })
    
    return dayAppointments
  }

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelada' })
        .eq('id', appointmentId)

      if (error) {
        console.error('Error canceling appointment:', error)
        throw error
      }
      
      await fetchData()
      alert('Cita cancelada exitosamente')
    } catch (error) {
      console.error('Error canceling appointment:', error)
      const errorMessage = 'Error al cancelar la cita: ' + (error as Error).message
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    
    if (!formData.patient_id) {
      setError('Debe seleccionar un paciente')
      return
    }
    
    if (!formData.service_id) {
      setError('Debe seleccionar un servicio')
      return
    }
    
    if (!formData.fecha_hora) {
      setError('Debe seleccionar fecha y hora')
      return
    }
    
    setLoading(true)

    try {
      const appointmentData = {
        patient_id: formData.patient_id,
        service_id: formData.service_id,
        operadora_id: formData.operadora_id || null,
        fecha_hora: formData.fecha_hora,
        numero_sesion: formData.numero_sesion,
        status: formData.status,
        observaciones_caja: formData.observaciones_caja?.trim() || null
      }

      console.log('💾 Submitting appointment data:', appointmentData)

      let result
      if (isEditing && selectedAppointment) {
        result = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', selectedAppointment.id)
          .select()
      } else {
        result = await supabase
          .from('appointments')
          .insert([appointmentData])
          .select()
      }

      const { error } = result

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      await fetchData()
      setShowModal(false)
      resetForm()
      
      const message = isEditing ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente'
      alert(message)
    } catch (error) {
      console.error('Error saving appointment:', error)
      const errorMessage = `Error al guardar la cita: ${(error as Error).message}`
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      patient_id: '',
      service_id: '',
      operadora_id: '',
      fecha_hora: '',
      numero_sesion: 1,
      status: 'agendada',
      observaciones_caja: ''
    })
    setSelectedAppointment(null)
    setIsEditing(false)
    setError('')
  }

  const openModal = (appointment?: Appointment, date?: Date) => {
    setError('')
    if (appointment) {
      setSelectedAppointment(appointment)
      setIsEditing(true)
      setFormData({
        patient_id: appointment.patient_id,
        service_id: appointment.service_id,
        operadora_id: appointment.operadora_id || '',
        fecha_hora: appointment.fecha_hora.slice(0, 16),
        numero_sesion: appointment.numero_sesion || 1,
        status: appointment.status,
        observaciones_caja: appointment.observaciones_caja || ''
      })
    } else {
      resetForm()
      if (date) {
        const dateTime = new Date(date)
        dateTime.setHours(9, 0, 0, 0)
        setFormData(prev => ({
          ...prev,
          fecha_hora: dateTime.toISOString().slice(0, 16)
        }))
      }
    }
    setShowModal(true)
  }

  // Create sample appointment for testing
  const createSampleAppointment = async () => {
    if (patients.length === 0 || services.length === 0) {
      alert('Necesitas tener pacientes y servicios para crear una cita de prueba')
      return
    }

    try {
      setLoading(true)
      setError('')
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(10, 0, 0, 0)

      const sampleData = {
        patient_id: patients[0].id,
        service_id: services[0].id,
        fecha_hora: tomorrow.toISOString(),
        numero_sesion: 1,
        status: 'agendada',
        observaciones_caja: 'Cita de prueba creada automáticamente'
      }

      console.log('🧪 Creating sample appointment:', sampleData)

      const { error } = await supabase
        .from('appointments')
        .insert([sampleData])

      if (error) {
        console.error('Error creating sample appointment:', error)
        throw error
      }

      await fetchData()
      alert('Cita de prueba creada exitosamente')
    } catch (error) {
      console.error('Error creating sample appointment:', error)
      const errorMessage = 'Error al crear cita de prueba: ' + (error as Error).message
      setError(errorMessage)
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (loading && appointments.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-7 gap-4 mb-4">
            {[...Array(35)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const days = getDaysInMonth()

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Calendar className="w-7 h-7 mr-3 text-pink-600" />
            Gestión de Citas
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Programa y administra las citas de depilación láser
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={createSampleAppointment}
            className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            🧪 Crear Cita de Prueba
          </button>
          <button
            onClick={() => openModal()}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva Cita
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-red-800 font-medium">Error:</span>
          </div>
          <p className="text-red-700 mt-1">{error}</p>
        </div>
      )}

      {/* Calendar Navigation */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentDate(subMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900">
              {format(currentDate, 'MMMM yyyy', { locale: es })}
            </h2>
            <button
              onClick={() => setCurrentDate(addMonths(currentDate, 1))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-1 text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            >
              <option value="">Todos los estados</option>
              <option value="agendada">Agendada</option>
              <option value="confirmada">Confirmada</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-7 gap-1">
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {days.map((day) => {
            const dayAppointments = getAppointmentsForDate(day)
            const isToday = isSameDay(day, new Date())
            
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[100px] p-2 border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors ${
                  isToday ? 'bg-pink-50 border-pink-200' : ''
                }`}
                onClick={() => openModal(undefined, day)}
              >
                <div className={`text-sm font-medium mb-1 ${
                  isToday ? 'text-pink-600' : 'text-gray-900'
                }`}>
                  {format(day, 'd')}
                </div>
                <div className="space-y-1">
                  {dayAppointments.slice(0, 3).map((appointment) => {
                    const StatusIcon = STATUS_ICONS[appointment.status as keyof typeof STATUS_ICONS]
                    return (
                      <div
                        key={appointment.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          openModal(appointment)
                        }}
                        className={`text-xs p-1 rounded cursor-pointer hover:opacity-80 ${
                          STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS]
                        }`}
                      >
                        <div className="flex items-center space-x-1">
                          <StatusIcon className="w-3 h-3" />
                          <span className="truncate">
                            {format(new Date(appointment.fecha_hora), 'HH:mm')}
                          </span>
                        </div>
                        <div className="truncate font-medium">
                          {appointment.patients?.nombre_completo || 'Sin paciente'}
                        </div>
                      </div>
                    )
                  })}
                  {dayAppointments.length > 3 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayAppointments.length - 3} más
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Empty State */}
      {appointments.length === 0 && !loading && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No hay citas programadas</h3>
          <p className="text-gray-500 mb-4">
            No se encontraron citas para {format(currentDate, 'MMMM yyyy', { locale: es })}
          </p>
          <div className="space-y-2">
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Crear Primera Cita
            </button>
            <br />
            <button
              onClick={createSampleAppointment}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              🧪 Crear Cita de Prueba
            </button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isEditing ? 'Editar Cita' : 'Nueva Cita'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  {error && (
                    <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3">
                      <div className="flex items-center">
                        <AlertCircle className="w-4 h-4 text-red-600 mr-2" />
                        <span className="text-red-800 text-sm">{error}</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Paciente *
                      </label>
                      <select
                        required
                        value={formData.patient_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, patient_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Seleccionar paciente</option>
                        {patients.map((patient) => (
                          <option key={patient.id} value={patient.id}>
                            {patient.nombre_completo}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Servicio *
                      </label>
                      <select
                        required
                        value={formData.service_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, service_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Seleccionar servicio</option>
                        {services.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.nombre} - {service.zona} (${service.precio_base?.toLocaleString()})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Operadora
                      </label>
                      <select
                        value={formData.operadora_id}
                        onChange={(e) => setFormData(prev => ({ ...prev, operadora_id: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Sin asignar</option>
                        {users.map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fecha y Hora *
                        </label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.fecha_hora}
                          onChange={(e) => setFormData(prev => ({ ...prev, fecha_hora: e.target.value }))}
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
                          value={formData.numero_sesion}
                          onChange={(e) => setFormData(prev => ({ ...prev, numero_sesion: parseInt(e.target.value) }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Estado
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="agendada">Agendada</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones
                      </label>
                      <textarea
                        rows={3}
                        value={formData.observaciones_caja}
                        onChange={(e) => setFormData(prev => ({ ...prev, observaciones_caja: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Notas adicionales sobre la cita..."
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-base font-medium text-white hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Cita')}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}