import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Search, 
  Plus, 
  Edit, 
  Eye,
  Phone,
  MapPin,
  Calendar,
  Filter,
  X,
  Star,
  FileText,
  Activity
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface Patient {
  id: string
  numero_cliente: string | null
  nombre_completo: string
  telefono: string | null
  cumpleanos: string | null
  sexo: string | null
  localidad: string | null
  zonas_tratamiento: string[] | null
  precio_total: number | null
  metodo_pago_preferido: string | null
  observaciones: string | null
  consentimiento_firmado: boolean
  fecha_consentimiento: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

const ZONAS_TRATAMIENTO = [
  'axilas',
  'piernas',
  'brazos',
  'bikini_brasileno',
  'bikini_full',
  'ingles',
  'labio_superior',
  'menton',
  'espalda',
  'pecho'
]

export default function Patients() {
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedZone, setSelectedZone] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showPatientDetails, setShowPatientDetails] = useState(false)
  const [patientStats, setPatientStats] = useState<any>({})
  const [formData, setFormData] = useState({
    nombre_completo: '',
    telefono: '',
    cumpleanos: '',
    sexo: '',
    localidad: '',
    zonas_tratamiento: [] as string[],
    precio_total: '',
    metodo_pago_preferido: '',
    observaciones: '',
    consentimiento_firmado: false
  })

  useEffect(() => {
    fetchPatients()
  }, [])

  useEffect(() => {
    if (selectedPatient) {
      fetchPatientStats(selectedPatient.id)
    }
  }, [selectedPatient])

  const fetchPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPatients(data || [])
    } catch (error) {
      console.error('Error fetching patients:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchPatientStats = async (patientId: string) => {
    try {
      const [appointmentsRes, paymentsRes, treatmentsRes] = await Promise.all([
        supabase
          .from('appointments')
          .select('id, status, precio_sesion, fecha_hora, services(nombre)')
          .eq('patient_id', patientId)
          .order('fecha_hora', { ascending: false }),
        supabase
          .from('payments')
          .select('id, monto, fecha_pago, metodo_pago')
          .eq('patient_id', patientId)
          .order('fecha_pago', { ascending: false }),
        supabase
          .from('patient_treatments')
          .select('id, sesiones_contratadas, sesiones_completadas, status, services(nombre)')
          .eq('patient_id', patientId)
      ])

      const totalAppointments = appointmentsRes.data?.length || 0
      const completedAppointments = appointmentsRes.data?.filter(a => a.status === 'completada').length || 0
      const totalSpent = paymentsRes.data?.reduce((sum, p) => sum + p.monto, 0) || 0
      const activeTreatments = treatmentsRes.data?.filter(t => t.status === 'activo').length || 0

      setPatientStats({
        totalAppointments,
        completedAppointments,
        totalSpent,
        activeTreatments,
        recentAppointments: appointmentsRes.data?.slice(0, 5) || [],
        recentPayments: paymentsRes.data?.slice(0, 5) || []
      })
    } catch (error) {
      console.error('Error fetching patient stats:', error)
    }
  }

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = patient.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         patient.telefono?.includes(searchTerm) ||
                         patient.numero_cliente?.includes(searchTerm)
    
    const matchesZone = !selectedZone || 
                       patient.zonas_tratamiento?.includes(selectedZone)

    return matchesSearch && matchesZone
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    // Validaciones básicas
    if (!formData.nombre_completo.trim()) {
      alert('El nombre completo es requerido')
      setLoading(false)
      return
    }

    // Validación de teléfono si está presente
    if (formData.telefono && formData.telefono.trim() && !/^\d{10}$/.test(formData.telefono.replace(/\D/g, ''))) {
      alert('El teléfono debe tener 10 dígitos')
      setLoading(false)
      return
    }

    // Validación de fecha de nacimiento
    if (formData.cumpleanos) {
      const birthDate = new Date(formData.cumpleanos)
      const today = new Date()
      const age = today.getFullYear() - birthDate.getFullYear()
      
      if (age < 0 || age > 120) {
        alert('Fecha de nacimiento inválida')
        setLoading(false)
        return
      }
    }

    try {
      const patientData = {
        nombre_completo: formData.nombre_completo.trim(),
        telefono: formData.telefono?.trim() || null,
        cumpleanos: formData.cumpleanos || null,
        sexo: formData.sexo || null,
        localidad: formData.localidad?.trim() || null,
        zonas_tratamiento: formData.zonas_tratamiento.length > 0 ? formData.zonas_tratamiento : null,
        precio_total: formData.precio_total ? parseFloat(formData.precio_total) : null,
        metodo_pago_preferido: formData.metodo_pago_preferido || null,
        observaciones: formData.observaciones?.trim() || null
        // Nota: numero_cliente se genera automáticamente por la base de datos
      }

      if (isEditing && selectedPatient) {
        const { error } = await supabase
          .from('patients')
          .update(patientData)
          .eq('id', selectedPatient.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('patients')
          .insert([patientData])

        if (error) throw error
      }

      await fetchPatients()
      setShowModal(false)
      resetForm()
      alert(isEditing ? 'Paciente actualizado exitosamente' : 'Paciente creado exitosamente')
    } catch (error) {
      console.error('Error saving patient:', error)
      alert('Error al guardar el paciente. Por favor intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre_completo: '',
      telefono: '',
      cumpleanos: '',
      sexo: '',
      localidad: '',
      zonas_tratamiento: [],
      precio_total: '',
      metodo_pago_preferido: '',
      observaciones: '',
      consentimiento_firmado: false
    })
    setSelectedPatient(null)
    setIsEditing(false)
  }

  const openModal = (patient?: Patient, mode: 'edit' | 'view' = 'edit') => {
    if (patient) {
      setSelectedPatient(patient)
      setIsEditing(mode === 'edit')
      setShowPatientDetails(mode === 'view')
      setFormData({
        nombre_completo: patient.nombre_completo,
        telefono: patient.telefono || '',
        cumpleanos: patient.cumpleanos || '',
        sexo: patient.sexo || '',
        localidad: patient.localidad || '',
        zonas_tratamiento: patient.zonas_tratamiento || [],
        precio_total: patient.precio_total?.toString() || '',
        metodo_pago_preferido: patient.metodo_pago_preferido || '',
        observaciones: patient.observaciones || '',
        consentimiento_firmado: patient.consentimiento_firmado
      })
    } else {
      resetForm()
    }
    if (mode === 'edit') {
      setShowModal(true)
    }
  }

  const handleZoneToggle = (zone: string) => {
    setFormData(prev => ({
      ...prev,
      zonas_tratamiento: prev.zonas_tratamiento.includes(zone)
        ? prev.zonas_tratamiento.filter(z => z !== zone)
        : [...prev.zonas_tratamiento, zone]
    }))
  }

  const deletePatient = async (patientId: string, patientName: string) => {
    if (!confirm(`¿Estás seguro de que quieres desactivar al paciente "${patientName}"?`)) {
      return
    }

    try {
      setLoading(true)
      const { error } = await supabase
        .from('patients')
        .update({ is_active: false })
        .eq('id', patientId)

      if (error) throw error
      
      await fetchPatients()
      alert('Paciente desactivado exitosamente')
    } catch (error) {
      console.error('Error deleting patient:', error)
      alert('Error al desactivar el paciente')
    } finally {
      setLoading(false)
    }
  }

  if (loading && patients.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Users className="w-7 h-7 mr-3 text-pink-600" />
            Gestión de Pacientes
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra la información de tus pacientes y su historial de tratamientos
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Paciente
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por nombre, teléfono o número de cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={selectedZone}
              onChange={(e) => setSelectedZone(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none"
            >
              <option value="">Todas las zonas</option>
              {ZONAS_TRATAMIENTO.map(zone => (
                <option key={zone} value={zone}>
                  {zone.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </option>
              ))}
            </select>
          </div>
          <div className="text-sm text-gray-600 flex items-center">
            <span className="font-medium">{filteredPatients.length}</span>
            <span className="ml-1">pacientes encontrados</span>
          </div>
        </div>
      </div>

      {/* Patients List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {filteredPatients.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                        <span className="text-lg font-bold text-white">
                          {patient.nombre_completo.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900">
                          {patient.nombre_completo}
                        </h3>
                        <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                          {patient.telefono && (
                            <div className="flex items-center">
                              <Phone className="w-4 h-4 mr-1" />
                              {patient.telefono}
                            </div>
                          )}
                          {patient.localidad && (
                            <div className="flex items-center">
                              <MapPin className="w-4 h-4 mr-1" />
                              {patient.localidad}
                            </div>
                          )}
                          {patient.cumpleanos && (
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(patient.cumpleanos), 'dd MMM yyyy', { locale: es })}
                            </div>
                          )}
                        </div>
                        {patient.zonas_tratamiento && patient.zonas_tratamiento.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {patient.zonas_tratamiento.map((zone) => (
                              <span
                                key={zone}
                                className="px-2 py-1 text-xs font-medium bg-pink-100 text-pink-800 rounded-full"
                              >
                                {zone.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {patient.precio_total && (
                      <div className="text-right mr-4">
                        <p className="text-lg font-bold text-green-600">
                          ${patient.precio_total.toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-500">Precio total</p>
                      </div>
                    )}
                    <button
                      onClick={() => openModal(patient, 'view')}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Ver detalles"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openModal(patient, 'edit')}
                      className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                      title="Editar paciente"
                    >
                      <Edit className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => deletePatient(patient.id, patient.nombre_completo)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
                      title="Desactivar paciente"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pacientes</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || selectedZone ? 'No se encontraron pacientes con los filtros aplicados.' : 'Comienza agregando tu primer paciente.'}
            </p>
            {!searchTerm && !selectedZone && (
              <div className="mt-6">
                <button
                  onClick={() => openModal()}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Paciente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Patient Details Modal */}
      {showPatientDetails && selectedPatient && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPatientDetails(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <FileText className="w-6 h-6 mr-2 text-pink-600" />
                    Expediente del Paciente
                  </h3>
                  <button
                    onClick={() => setShowPatientDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Patient Info Header */}
                <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-lg p-6 mb-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-2xl font-bold text-white">
                        {selectedPatient.nombre_completo.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900">{selectedPatient.nombre_completo}</h2>
                      <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        {selectedPatient.telefono && (
                          <div className="flex items-center">
                            <Phone className="w-4 h-4 mr-1" />
                            {selectedPatient.telefono}
                          </div>
                        )}
                        {selectedPatient.localidad && (
                          <div className="flex items-center">
                            <MapPin className="w-4 h-4 mr-1" />
                            {selectedPatient.localidad}
                          </div>
                        )}
                        {selectedPatient.cumpleanos && (
                          <div className="flex items-center">
                            <Calendar className="w-4 h-4 mr-1" />
                            {format(new Date(selectedPatient.cumpleanos), 'dd MMM yyyy', { locale: es })}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                    <Activity className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-blue-900">{patientStats.totalAppointments || 0}</p>
                    <p className="text-blue-600 text-sm">Total Citas</p>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                    <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-green-900">{patientStats.completedAppointments || 0}</p>
                    <p className="text-green-600 text-sm">Completadas</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 text-center">
                    <Star className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-purple-900">{patientStats.activeTreatments || 0}</p>
                    <p className="text-purple-600 text-sm">Tratamientos</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-center">
                    <DollarSign className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-yellow-900">${(patientStats.totalSpent || 0).toLocaleString()}</p>
                    <p className="text-yellow-600 text-sm">Total Gastado</p>
                  </div>
                </div>

                {/* Treatment Zones */}
                {selectedPatient.zonas_tratamiento && selectedPatient.zonas_tratamiento.length > 0 && (
                  <div className="mb-6">
                    <h4 className="font-medium text-gray-900 mb-3">Zonas de Tratamiento</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedPatient.zonas_tratamiento.map((zona) => (
                        <span
                          key={zona}
                          className="px-3 py-1 text-sm font-medium bg-pink-100 text-pink-800 rounded-full"
                        >
                          {zona.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Recent Appointments */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <Calendar className="w-5 h-5 mr-2 text-blue-600" />
                      Citas Recientes
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {patientStats.recentAppointments?.length > 0 ? (
                        patientStats.recentAppointments.map((appointment: any) => (
                          <div key={appointment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-gray-900">{appointment.services?.nombre}</p>
                                <p className="text-sm text-gray-600">
                                  {format(new Date(appointment.fecha_hora), 'dd MMM yyyy HH:mm', { locale: es })}
                                </p>
                              </div>
                              <span className={`px-2 py-1 text-xs rounded-full ${
                                appointment.status === 'completada' ? 'bg-green-100 text-green-800' :
                                appointment.status === 'agendada' ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {appointment.status}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No hay citas registradas</p>
                      )}
                    </div>
                  </div>

                  {/* Recent Payments */}
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                      <CreditCard className="w-5 h-5 mr-2 text-green-600" />
                      Pagos Recientes
                    </h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {patientStats.recentPayments?.length > 0 ? (
                        patientStats.recentPayments.map((payment: any) => (
                          <div key={payment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-medium text-green-600">${payment.monto.toLocaleString()}</p>
                                <p className="text-sm text-gray-600 capitalize">{payment.metodo_pago}</p>
                              </div>
                              <p className="text-sm text-gray-500">
                                {format(new Date(payment.fecha_pago), 'dd MMM yyyy', { locale: es })}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-sm">No hay pagos registrados</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => {
                    setShowPatientDetails(false)
                    openModal(selectedPatient, 'edit')
                  }}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-base font-medium text-white hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Editar Paciente
                </button>
                <button
                  onClick={() => setShowPatientDetails(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
              <form onSubmit={handleSubmit}>
                <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900">
                      {isEditing ? 'Editar Paciente' : 'Nuevo Paciente'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
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
                        value={formData.nombre_completo}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre_completo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Teléfono
                      </label>
                      <input
                        type="tel"
                        value={formData.telefono}
                        onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Fecha de Nacimiento
                      </label>
                      <input
                        type="date"
                        value={formData.cumpleanos}
                        onChange={(e) => setFormData(prev => ({ ...prev, cumpleanos: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Sexo
                      </label>
                      <select
                        value={formData.sexo}
                        onChange={(e) => setFormData(prev => ({ ...prev, sexo: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Seleccionar</option>
                        <option value="F">Femenino</option>
                        <option value="M">Masculino</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Localidad
                      </label>
                      <input
                        type="text"
                        value={formData.localidad}
                        onChange={(e) => setFormData(prev => ({ ...prev, localidad: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio Total
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.precio_total}
                        onChange={(e) => setFormData(prev => ({ ...prev, precio_total: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Zonas de Tratamiento
                    </label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                      {ZONAS_TRATAMIENTO.map((zone) => (
                        <label key={zone} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.zonas_tratamiento.includes(zone)}
                            onChange={() => handleZoneToggle(zone)}
                            className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                          />
                          <span className="ml-2 text-sm text-gray-700">
                            {zone.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Método de Pago Preferido
                    </label>
                    <select
                      value={formData.metodo_pago_preferido}
                      onChange={(e) => setFormData(prev => ({ ...prev, metodo_pago_preferido: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                    >
                      <option value="">Seleccionar</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="transferencia">Transferencia</option>
                      <option value="bbva">BBVA</option>
                      <option value="clip">Clip</option>
                    </select>
                  </div>

                  <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Observaciones
                    </label>
                    <textarea
                      rows={3}
                      value={formData.observaciones}
                      onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      placeholder="Notas adicionales sobre el paciente..."
                    />
                  </div>

                  <div className="mt-4">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.consentimiento_firmado}
                        onChange={(e) => setFormData(prev => ({ ...prev, consentimiento_firmado: e.target.checked }))}
                        className="rounded border-gray-300 text-pink-600 focus:ring-pink-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">
                        Consentimiento informado firmado
                      </span>
                    </label>
                  </div>
                </div>

                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-base font-medium text-white hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                  >
                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Paciente')}
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