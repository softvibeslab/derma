import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Scissors, 
  Plus, 
  Edit, 
  Clock,
  DollarSign,
  Zap,
  X
} from 'lucide-react'

interface Service {
  id: string
  nombre: string
  descripcion: string | null
  zona: string
  precio_base: number
  duracion_minutos: number | null
  sesiones_recomendadas: number | null
  tecnologia: string
  is_active: boolean
  created_at: string
}

const ZONAS_DISPONIBLES = [
  'axilas',
  'piernas',
  'brazos',
  'bikini_brasileno',
  'bikini_full',
  'ingles',
  'labio_superior',
  'menton',
  'espalda',
  'pecho',
  'cara_completa',
  'cuerpo_completo'
]

export default function Services() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    zona: '',
    precio_base: '',
    duracion_minutos: '',
    sesiones_recomendadas: '',
    tecnologia: 'Sopranoice'
  })

  useEffect(() => {
    fetchServices()
  }, [])

  const fetchServices = async () => {
    try {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('is_active', true)
        .order('zona', { ascending: true })

      if (error) throw error
      setServices(data || [])
    } catch (error) {
      console.error('Error fetching services:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const serviceData = {
        ...formData,
        precio_base: parseFloat(formData.precio_base),
        duracion_minutos: formData.duracion_minutos ? parseInt(formData.duracion_minutos) : null,
        sesiones_recomendadas: formData.sesiones_recomendadas ? parseInt(formData.sesiones_recomendadas) : null,
        descripcion: formData.descripcion || null
      }

      if (isEditing && selectedService) {
        const { error } = await supabase
          .from('services')
          .update(serviceData)
          .eq('id', selectedService.id)

        if (error) throw error
      } else {
        const { error } = await supabase
          .from('services')
          .insert([serviceData])

        if (error) throw error
      }

      await fetchServices()
      setShowModal(false)
      resetForm()
    } catch (error) {
      console.error('Error saving service:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      nombre: '',
      descripcion: '',
      zona: '',
      precio_base: '',
      duracion_minutos: '',
      sesiones_recomendadas: '',
      tecnologia: 'Sopranoice'
    })
    setSelectedService(null)
    setIsEditing(false)
  }

  const openModal = (service?: Service) => {
    if (service) {
      setSelectedService(service)
      setIsEditing(true)
      setFormData({
        nombre: service.nombre,
        descripcion: service.descripcion || '',
        zona: service.zona,
        precio_base: service.precio_base.toString(),
        duracion_minutos: service.duracion_minutos?.toString() || '',
        sesiones_recomendadas: service.sesiones_recomendadas?.toString() || '',
        tecnologia: service.tecnologia
      })
    } else {
      resetForm()
    }
    setShowModal(true)
  }

  const toggleServiceStatus = async (serviceId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !currentStatus })
        .eq('id', serviceId)

      if (error) throw error
      await fetchServices()
    } catch (error) {
      console.error('Error updating service status:', error)
    }
  }

  if (loading && services.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const groupedServices = services.reduce((acc, service) => {
    if (!acc[service.zona]) {
      acc[service.zona] = []
    }
    acc[service.zona].push(service)
    return acc
  }, {} as Record<string, Service[]>)

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="sm:flex sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Scissors className="w-7 h-7 mr-3 text-pink-600" />
            Catálogo de Servicios
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra los servicios de depilación láser con tecnología Sopranoice
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
        >
          <Plus className="w-4 h-4 mr-2" />
          Nuevo Servicio
        </button>
      </div>

      {/* Services Grid */}
      {Object.keys(groupedServices).length > 0 ? (
        <div className="space-y-8">
          {Object.entries(groupedServices).map(([zona, zoneServices]) => (
            <div key={zona}>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 capitalize">
                {zona.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {zoneServices.map((service) => (
                  <div key={service.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {service.nombre}
                          </h3>
                          {service.descripcion && (
                            <p className="text-sm text-gray-600 mb-3">
                              {service.descripcion}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => openModal(service)}
                          className="p-2 text-gray-400 hover:text-pink-600 hover:bg-pink-50 rounded-lg transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-600">
                            <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                            Precio base
                          </div>
                          <span className="text-lg font-bold text-green-600">
                            ${service.precio_base.toLocaleString()}
                          </span>
                        </div>

                        {service.duracion_minutos && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-600">
                              <Clock className="w-4 h-4 mr-1 text-blue-600" />
                              Duración
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {service.duracion_minutos} min
                            </span>
                          </div>
                        )}

                        {service.sesiones_recomendadas && (
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-gray-600">
                              <Scissors className="w-4 h-4 mr-1 text-purple-600" />
                              Sesiones
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {service.sesiones_recomendadas} recomendadas
                            </span>
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-gray-600">
                            <Zap className="w-4 h-4 mr-1 text-yellow-600" />
                            Tecnología
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            {service.tecnologia}
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">
                            Estado del servicio
                          </span>
                          <button
                            onClick={() => toggleServiceStatus(service.id, service.is_active)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2 ${
                              service.is_active ? 'bg-pink-600' : 'bg-gray-200'
                            }`}
                          >
                            <span
                              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                                service.is_active ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Scissors className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay servicios</h3>
          <p className="mt-1 text-sm text-gray-500">
            Comienza agregando tu primer servicio de depilación láser.
          </p>
          <div className="mt-6">
            <button
              onClick={() => openModal()}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Servicio
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
                      {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowModal(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nombre del Servicio *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.nombre}
                        onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Ej: Depilación Láser Axilas"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Zona Corporal *
                      </label>
                      <select
                        required
                        value={formData.zona}
                        onChange={(e) => setFormData(prev => ({ ...prev, zona: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                      >
                        <option value="">Seleccionar zona</option>
                        {ZONAS_DISPONIBLES.map(zona => (
                          <option key={zona} value={zona}>
                            {zona.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Precio Base *
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <span className="text-gray-500 sm:text-sm">$</span>
                        </div>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={formData.precio_base}
                          onChange={(e) => setFormData(prev => ({ ...prev, precio_base: e.target.value }))}
                          className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="0.00"
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

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Sesiones Recomendadas
                        </label>
                        <input
                          type="number"
                          value={formData.sesiones_recomendadas}
                          onChange={(e) => setFormData(prev => ({ ...prev, sesiones_recomendadas: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          placeholder="8"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tecnología
                      </label>
                      <input
                        type="text"
                        value={formData.tecnologia}
                        onChange={(e) => setFormData(prev => ({ ...prev, tecnologia: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Sopranoice"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Descripción
                      </label>
                      <textarea
                        rows={3}
                        value={formData.descripcion}
                        onChange={(e) => setFormData(prev => ({ ...prev, descripcion: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        placeholder="Descripción detallada del servicio..."
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
                    {loading ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear Servicio')}
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