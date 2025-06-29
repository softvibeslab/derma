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
  X
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
  precio_sesion: number | null
  observaciones_caja: string | null
  observaciones_operadora: string | null
  patients: {
    nombre_completo: string
    telefono: string | null
  }
  services: {
    nombre: string
    zona: string
    duracion_minutos: number | null
  }
  users: {
    full_name: string
  } | null
}
import { validateAppointmentData, sanitizeAppointmentData, getValidUserId } from '../utils/databaseValidation'
import { useAuth } from '../contexts/AuthContext'

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
  const { userProfile } = useAuth()
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [loadingPatients, setLoadingPatients] = useState(true)
  const [loadingServices, setLoadingServices] = useState(true)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    patient_id: '',
    service_id: '',
    operadora_id: '',
    fecha_hora: '',
    numero_sesion: 1,
    status: 'agendada',
    observaciones_caja: '',
    observaciones_operadora: '',
    duracion_minutos: ''
  })

  useEffect(() => {
    fetchData()
  }, [currentDate])

  const fetchData = async () => {
    try {
      setLoadingPatients(true)
      setLoadingServices(true)
      setLoadingUsers(true)
      
      const startDate = startOfMonth(currentDate)
      const endDate = endOfMonth(currentDate)

      // Fetch appointments for the current month
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          patients(nombre_completo, telefono),
          services(nombre, zona, duracion_minutos),
          users(full_name)
        `)
        .gte('fecha_hora', startDate.toISOString())
        .lte('fecha_hora', endDate.toISOString())
        .order('fecha_hora', { ascending: true })

      if (appointmentsError) throw appointmentsError

      // Fetch patients, services, and users for the form
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
          .select('id, full_name, role_id, roles(name)')
          .eq('is_active', true)
          .order('full_name')
      ])

      console.log('Fetched data:', { 
        patients: patientsRes.data?.length, 
        services: servicesRes.data?.length, 
        users: usersRes.data?.length 
      })

      if (patientsRes.error) {
        console.error('Error fetching patients:', patientsRes.error)
      }
      if (servicesRes.error) {
        console.error('Error fetching services:', servicesRes.error)
      }
      if (usersRes.error) {
        console.error('Error fetching users:', usersRes.error)
      }

      setAppointments(appointmentsData || [])
      setPatients(patientsRes.data || [])
      setServices(servicesRes.data || [])
      setUsers(usersRes.data || [])
      
    } catch (error) {
      console.error('Error fetching data:', error)
      alert('Error al cargar los datos. Por favor recarga la página.')
    } finally {
      setLoading(false)
      setLoadingPatients(false)
      setLoadingServices(false)
      setLoadingUsers(false)
    }
  }

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    return eachDayOfInterval({ start, end })
  }

  const getAppointmentsForDate = (date: Date) => {
    return appointments.filter(appointment => 
      isSameDay(new Date(appointment.fecha_hora), date) &&
      (!statusFilter || appointment.status === statusFilter)
    )
  }

  const deleteAppointment = async (appointmentId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta cita?')) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelada' })
        .eq('id', appointmentId)

      if (error) throw error
      
      await fetchData()
      alert('Cita cancelada exitosamente')
    } catch (error) {
      console.error('Error canceling appointment:', error)
      alert('Error al cancelar la cita')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validar datos del formulario
    const validation = await validateAppointmentData(formData)
    
    if (!validation.isValid) {
      alert(`Errores en el formulario:\n${validation.errors.join('\n')}`)
      return
    }

    // Mostrar advertencias si las hay
    if (validation.warnings.length > 0) {
      const proceed = confirm(`Advertencias:\n${validation.warnings.join('\n')}\n\n¿Desea continuar?`)
      if (!proceed) return
    }
    
    setLoading(true)

    try {
      // Obtener un cajera_id válido
      const validCajeraId = await getValidUserId(userProfile?.id)
      
      const appointmentData = await sanitizeAppointmentData({
        patient_id: formData.patient_id,
        service_id: formData.service_id,
        operadora_id: formData.operadora_id || null, // Can be null if no operadora selected
        cajera_id: validCajeraId, // Valid user ID or null
        fecha_hora: formData.fecha_hora,
        duracion_minutos: formData.duracion_minutos ? parseInt(formData.duracion_minutos) : null,
        numero_sesion: formData.numero_sesion,
        status: formData.status,
        observaciones_caja: formData.observaciones_caja?.trim() || null,
        observaciones_operadora: formData.observaciones_operadora?.trim() || null,
        is_paid: false
      })

      console.log('Creating appointment with data:', appointmentData)
      if (isEditing && selectedAppointment) {
        const { error } = await supabase
          .from('appointments')
          .update(appointmentData)
          .eq('id', selectedAppointment.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('appointments')
          .insert([appointmentData])

        if (error) throw error
      }

      await fetchData()
      setShowModal(false)
      resetForm()
      alert(isEditing ? 'Cita actualizada exitosamente' : 'Cita creada exitosamente')
    } catch (error) {
      console.error('Error saving appointment:', error)
      
      // More specific error handling
      if (error?.code === '23503') {
        if (error.message.includes('operadora_id_fkey')) {
          alert('La operadora seleccionada no existe. Por favor selecciona otra o deja el campo vacío.')
        } else if (error.message.includes('patient_id_fkey')) {
          alert('El paciente seleccionado no existe. Por favor selecciona otro paciente.')
        } else if (error.message.includes('service_id_fkey')) {
          alert('El servicio seleccionado no existe. Por favor selecciona otro servicio.')
        } else {
          alert('Error de relación en la base de datos. Verifica que todos los datos sean válidos.')
        }
      } else {
        alert(`Error al guardar la cita: ${error?.message || 'Error desconocido'}`)
      }
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
      observaciones_caja: '',
      observaciones_operadora: '',
      duracion_minutos: ''
    })
    setSelectedAppointment(null)
    setIsEditing(false)
  }

  const openModal = (appointment?: Appointment, date?: Date) => {
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
        observaciones_caja: appointment.observaciones_caja || '',
        observaciones_operadora: appointment.observaciones_operadora || '',
        duracion_minutos: appointment.duracion_minutos?.toString() || ''
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

  const updateAppointmentStatus = async (appointmentId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId)

      if (error) throw error
      await fetchData()
    } catch (error) {
      console.error('Error updating appointment status:', error)
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
        <button
          onClick={() => openModal()}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nueva Cita
        </button>
      </div>

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
          {/* Day headers */}
          {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-500">
              {day}
            </div>
          ))}
          
          {/* Calendar days */}
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
                          {appointment.patients.nombre_completo}
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

      {/* Appointments List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Citas del Mes
          </h3>
        </div>
        <div className="divide-y divide-gray-200">
          {appointments.length > 0 ? (
            appointments
              .filter(appointment => !statusFilter || appointment.status === statusFilter)
              .map((appointment) => {
                const StatusIcon = STATUS_ICONS[appointment.status as keyof typeof STATUS_ICONS]
                return (
                  <div key={appointment.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                            <Calendar className="w-6 h-6 text-white" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-medium text-gray-900">
                              {appointment.patients.nombre_completo}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                              <span>{appointment.services.nombre}</span>
                              <span>•</span>
                              <span>{appointment.services.zona}</span>
                              <span>•</span>
                              <span>Sesión {appointment.numero_sesion}</span>
                              {appointment.users && (
                                <>
                                  <span>•</span>
                                  <span>{appointment.users.full_name}</span>
                                </>
                              )}
                            </div>
                            <div className="flex items-center space-x-2 mt-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <span className="text-sm text-gray-600">
                                {format(new Date(appointment.fecha_hora), 'dd MMM yyyy HH:mm', { locale: es })}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        {appointment.precio_sesion && (
                          <div className="text-right">
                            <p className="text-lg font-bold text-green-600">
                              ${appointment.precio_sesion.toLocaleString()}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center space-x-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_COLORS[appointment.status as keyof typeof STATUS_COLORS]
                          }`}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}
                          </span>
                          <button
                            onClick={() => openModal(appointment)}
                            className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                            title="Editar cita"
                          >
                            <Calendar className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteAppointment(appointment.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                            title="Cancelar cita"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })
          ) : (
            <div className="text-center py-12">
              <Calendar className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay citas</h3>
              <p className="mt-1 text-sm text-gray-500">
                Comienza programando tu primera cita.
              </p>
              <div className="mt-6">
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nueva Cita
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

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
                      <XCircle className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Paciente *
                      </label>
                      {loadingPatients ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          Cargando pacientes...
                        </div>
                      ) : (
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
                              {patient.telefono && ` - ${patient.telefono}`}
                            </option>
                          ))}
                        </select>
                      )}
                      {patients.length === 0 && !loadingPatients && (
                        <p className="text-sm text-red-600 mt-1">
                          No hay pacientes disponibles. <a href="/patients" className="underline">Crear paciente</a>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Servicio *
                      </label>
                      {loadingServices ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          Cargando servicios...
                        </div>
                      ) : (
                        <select
                          required
                          value={formData.service_id}
                          onChange={(e) => {
                            const service = services.find(s => s.id === e.target.value)
                            setFormData(prev => ({ 
                              ...prev, 
                              service_id: e.target.value,
                              duracion_minutos: service?.duracion_minutos?.toString() || ''
                            }))
                          }}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Seleccionar servicio</option>
                          {services.map((service) => (
                            <option key={service.id} value={service.id}>
                              {service.nombre} - {service.zona} (${service.precio_base?.toLocaleString()})
                            </option>
                          ))}
                        </select>
                      )}
                      {services.length === 0 && !loadingServices && (
                        <p className="text-sm text-red-600 mt-1">
                          No hay servicios disponibles. <a href="/services" className="underline">Crear servicio</a>
                        </p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Operadora (Opcional)
                      </label>
                      {loadingUsers ? (
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50">
                          Cargando usuarios...
                        </div>
                      ) : (
                        <select
                          value={formData.operadora_id}
                          onChange={(e) => setFormData(prev => ({ ...prev, operadora_id: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        >
                          <option value="">Sin asignar</option>
                          {users.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.full_name} ({user.roles?.name || 'Sin rol'})
                            </option>
                          ))}
                        </select>
                      )}
                      {users.length === 0 && !loadingUsers && (
                        <p className="text-sm text-yellow-600 mt-1">
                          No hay usuarios disponibles para asignar como operadora.
                        </p>
                      )}
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

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Duración (minutos)
                        </label>
                        <input
                          type="number"
                          value={formData.duracion_minutos}
                          onChange={(e) => setFormData(prev => ({ ...prev, duracion_minutos: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="60"
                        />
                      </div>
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


                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Observaciones de Operadora
                      </label>
                      <textarea
                        rows={3}
                        value={formData.observaciones_operadora}
                        onChange={(e) => setFormData(prev => ({ ...prev, observaciones_operadora: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Notas técnicas del tratamiento..."
                      />
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
                        <option value="completada">Completada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                        Observaciones de Caja
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