import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { 
  CreditCard, 
  Plus, 
  Search,
  Filter,
  Download,
  DollarSign,
  Calendar,
  User,
  Receipt,
  TrendingUp,
  ShoppingCart,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Minus
} from 'lucide-react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface Payment {
  id: string
  patient_id: string
  appointment_id: string | null
  monto: number
  metodo_pago: string
  fecha_pago: string
  cajera_id: string | null
  banco: string | null
  referencia: string | null
  observaciones: string | null
  tipo_pago: string
  created_at: string
  patients: {
    nombre_completo: string
    telefono: string | null
  }
  users: {
    full_name: string
  } | null
  appointments?: {
    numero_sesion: number
    services: {
      nombre: string
      zona: string
    }
  }
}

interface PendingAppointment {
  id: string
  patient_id: string
  service_id: string
  fecha_hora: string
  numero_sesion: number
  precio_sesion: number
  patients: {
    nombre_completo: string
    telefono: string | null
  }
  services: {
    nombre: string
    zona: string
    precio_base: number
  }
}

interface CartItem {
  appointment_id: string
  patient_id: string
  patient_name: string
  service_name: string
  service_zone: string
  session_number: number
  amount: number
  original_amount: number
}

const PAYMENT_METHODS = [
  { value: 'efectivo', label: 'Efectivo', color: 'bg-green-100 text-green-800' },
  { value: 'transferencia', label: 'Transferencia', color: 'bg-blue-100 text-blue-800' },
  { value: 'bbva', label: 'BBVA', color: 'bg-indigo-100 text-indigo-800' },
  { value: 'clip', label: 'Clip', color: 'bg-purple-100 text-purple-800' }
]

export default function Payments() {
  const { userProfile } = useAuth()
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [dateFilter, setDateFilter] = useState('')
  const [showPOSModal, setShowPOSModal] = useState(false)
  const [stats, setStats] = useState({
    totalToday: 0,
    totalMonth: 0,
    totalPayments: 0,
    averagePayment: 0
  })

  // POS State
  const [pendingAppointments, setPendingAppointments] = useState<PendingAppointment[]>([])
  const [cart, setCart] = useState<CartItem[]>([])
  const [paymentMethod, setPaymentMethod] = useState('efectivo')
  const [amountPaid, setAmountPaid] = useState('')
  const [discount, setDiscount] = useState('')
  const [searchPatient, setSearchPatient] = useState('')

  useEffect(() => {
    fetchPayments()
    fetchStats()
  }, [])

  const fetchPayments = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          patients(nombre_completo, telefono),
          users(full_name),
          appointments(
            numero_sesion,
            services(nombre, zona)
          )
        `)
        .order('fecha_pago', { ascending: false })
        .limit(100)

      if (error) throw error
      setPayments(data || [])
    } catch (error) {
      console.error('Error fetching payments:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const today = new Date()
      const startOfToday = new Date(today.setHours(0, 0, 0, 0))
      const endOfToday = new Date(today.setHours(23, 59, 59, 999))
      const startOfCurrentMonth = startOfMonth(new Date())
      const endOfCurrentMonth = endOfMonth(new Date())

      // Today's payments
      const { data: todayPayments } = await supabase
        .from('payments')
        .select('monto')
        .gte('fecha_pago', startOfToday.toISOString())
        .lte('fecha_pago', endOfToday.toISOString())

      // Month's payments
      const { data: monthPayments } = await supabase
        .from('payments')
        .select('monto')
        .gte('fecha_pago', startOfCurrentMonth.toISOString())
        .lte('fecha_pago', endOfCurrentMonth.toISOString())

      // All payments for average
      const { data: allPayments } = await supabase
        .from('payments')
        .select('monto')

      const totalToday = todayPayments?.reduce((sum, p) => sum + p.monto, 0) || 0
      const totalMonth = monthPayments?.reduce((sum, p) => sum + p.monto, 0) || 0
      const totalPayments = allPayments?.length || 0
      const averagePayment = totalPayments > 0 ? 
        (allPayments?.reduce((sum, p) => sum + p.monto, 0) || 0) / totalPayments : 0

      setStats({
        totalToday,
        totalMonth,
        totalPayments,
        averagePayment
      })
    } catch (error) {
      console.error('Error fetching stats:', error)
    }
  }

  const fetchPendingAppointments = async () => {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_id,
          service_id,
          fecha_hora,
          numero_sesion,
          precio_sesion,
          patients(nombre_completo, telefono),
          services(nombre, zona, precio_base)
        `)
        .in('status', ['agendada', 'confirmada', 'completada'])
        .is('metodo_pago', null)
        .order('fecha_hora', { ascending: true })

      if (error) throw error
      setPendingAppointments(data || [])
    } catch (error) {
      console.error('Error fetching pending appointments:', error)
    }
  }

  const addToCart = (appointment: PendingAppointment) => {
    const existingItem = cart.find(item => item.appointment_id === appointment.id)
    if (!existingItem) {
      const amount = appointment.precio_sesion || appointment.services.precio_base
      setCart(prev => [...prev, {
        appointment_id: appointment.id,
        patient_id: appointment.patient_id,
        patient_name: appointment.patients.nombre_completo,
        service_name: appointment.services.nombre,
        service_zone: appointment.services.zona,
        session_number: appointment.numero_sesion,
        amount: amount,
        original_amount: amount
      }])
    }
  }

  const removeFromCart = (appointmentId: string) => {
    setCart(prev => prev.filter(item => item.appointment_id !== appointmentId))
  }

  const updateCartItemAmount = (appointmentId: string, newAmount: number) => {
    setCart(prev => prev.map(item => 
      item.appointment_id === appointmentId 
        ? { ...item, amount: Math.max(0, newAmount) }
        : item
    ))
  }

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.amount, 0)
  }

  const calculateTotal = () => {
    const subtotal = calculateSubtotal()
    const discountAmount = discount ? parseFloat(discount) : 0
    return Math.max(0, subtotal - discountAmount)
  }

  const calculateChange = () => {
    if (paymentMethod !== 'efectivo' || !amountPaid) return 0
    const total = calculateTotal()
    const paid = parseFloat(amountPaid)
    return Math.max(0, paid - total)
  }

  const processPayment = async () => {
    if (cart.length === 0) return
    
    // Validaciones
    const total = calculateTotal()
    if (total <= 0) {
      alert('El total debe ser mayor a 0')
      return
    }
    
    if (paymentMethod === 'efectivo' && amountPaid) {
      const paid = parseFloat(amountPaid)
      if (paid < total) {
        alert('La cantidad recibida debe ser igual o mayor al total')
        return
      }
    }

    // Validación de método de pago
    if (!paymentMethod) {
      alert('Debe seleccionar un método de pago')
      return
    }

    // Validación para métodos que requieren referencia
    if (['transferencia', 'bbva', 'clip'].includes(paymentMethod)) {
      // Generar referencia automática si no existe
      if (!amountPaid) {
        setAmountPaid(total.toString())
      }
    }
    try {
      setLoading(true)
      const ticketNumber = `TKT-${Date.now()}`

      // Group cart items by patient
      const patientGroups = cart.reduce((groups, item) => {
        if (!groups[item.patient_id]) {
          groups[item.patient_id] = []
        }
        groups[item.patient_id].push(item)
        return groups
      }, {} as Record<string, CartItem[]>)

      // Create payment records for each patient
      for (const [patientId, items] of Object.entries(patientGroups)) {
        const patientTotal = items.reduce((sum, item) => sum + item.amount, 0)
        
        // Create main payment record
        const { data: paymentData, error: paymentError } = await supabase
          .from('payments')
          .insert([{
            patient_id: patientId,
            monto: patientTotal,
            metodo_pago: paymentMethod,
            cajera_id: userProfile?.id,
            observaciones: `Ticket: ${ticketNumber} - ${items.length} sesión(es)`,
            tipo_pago: 'pago_sesion',
            banco: paymentMethod === 'bbva' ? 'BBVA' : paymentMethod === 'clip' ? 'Clip' : null,
            referencia: paymentMethod !== 'efectivo' ? `REF-${Date.now()}` : null
          }])
          .select()
          .single()

        if (paymentError) throw paymentError

        // Update each appointment with payment info
        for (const item of items) {
          await supabase
            .from('appointments')
            .update({ 
              metodo_pago: paymentMethod,
              status: 'completada',
              precio_sesion: item.amount
            })
            .eq('id', item.appointment_id)

          // Create individual payment record for each appointment
          await supabase
            .from('payments')
            .insert([{
              patient_id: patientId,
              appointment_id: item.appointment_id,
              monto: item.amount,
              metodo_pago: paymentMethod,
              cajera_id: userProfile?.id,
              observaciones: `${item.service_name} - Sesión ${item.session_number}`,
              tipo_pago: 'pago_sesion',
              banco: paymentMethod === 'bbva' ? 'BBVA' : paymentMethod === 'clip' ? 'Clip' : null,
              referencia: paymentMethod !== 'efectivo' ? `REF-${Date.now()}-${item.appointment_id.slice(-4)}` : null
            }])
        }

        // Generate ticket for this patient
        generateTicket(paymentData, items, patientTotal, ticketNumber)
      }

      // Reset cart and close modal
      setCart([])
      setAmountPaid('')
      setDiscount('')
      setSearchPatient('')
      setShowPOSModal(false)
      
      // Refresh data
      await fetchPayments()
      await fetchStats()
      await fetchPendingAppointments()
      
      alert('Pago procesado exitosamente')
    } catch (error) {
      console.error('Error processing payment:', error)
      alert('Error al procesar el pago. Inténtalo de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const generateTicket = (payment: any, items: CartItem[], total: number, ticketNumber: string) => {
    const ticketContent = `
      DERMACIELO - DEPILACIÓN LÁSER
      ================================
      
      Ticket: ${ticketNumber}
      Fecha: ${format(new Date(), 'dd/MM/yyyy HH:mm')}
      Cajero: ${userProfile?.full_name}
      
      Cliente: ${items[0]?.patient_name}
      
      ================================
      SERVICIOS PAGADOS:
      
      ${items.map(item => `
      ${item.service_name}
      Zona: ${item.service_zone}
      Sesión: ${item.session_number}
      Precio: $${item.amount.toLocaleString()}
      ${item.amount !== item.original_amount ? `(Precio original: $${item.original_amount.toLocaleString()})` : ''}
      `).join('\n')}
      
      ================================
      
      Subtotal: $${calculateSubtotal().toLocaleString()}
      ${discount ? `Descuento: -$${parseFloat(discount).toLocaleString()}` : ''}
      TOTAL: $${total.toLocaleString()}
      
      Método de pago: ${paymentMethod.toUpperCase()}
      ${paymentMethod === 'efectivo' && amountPaid ? `
      Recibido: $${parseFloat(amountPaid).toLocaleString()}
      Cambio: $${calculateChange().toLocaleString()}
      ` : ''}
      ${payment.referencia ? `Referencia: ${payment.referencia}` : ''}
      
      ================================
      
      Tecnología Sopranoice
      ¡Gracias por su preferencia!
      
      Próxima cita recomendada:
      4-6 semanas después
      
      Para reagendar: ${userProfile?.sucursal || 'Contactar sucursal'}
    `

    // Create and download ticket
    const blob = new Blob([ticketContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `ticket-${ticketNumber}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.patients.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.patients.telefono?.includes(searchTerm)
    
    const matchesMethod = !methodFilter || payment.metodo_pago === methodFilter
    
    const matchesDate = !dateFilter || 
                       format(new Date(payment.fecha_pago), 'yyyy-MM-dd') === dateFilter

    return matchesSearch && matchesMethod && matchesDate
  })

  const filteredAppointments = pendingAppointments.filter(appointment => {
    if (!searchPatient) return true
    return appointment.patients.nombre_completo.toLowerCase().includes(searchPatient.toLowerCase()) ||
           appointment.patients.telefono?.includes(searchPatient)
  })

  const exportPayments = () => {
    if (loading) {
      alert('Por favor espera a que terminen de cargar los datos')
      return
    }
    
    const csvContent = [
      ['Fecha', 'Cliente', 'Teléfono', 'Monto', 'Método de Pago', 'Cajero', 'Referencia', 'Servicio', 'Sesión'].join(','),
      ...filteredPayments.map(payment => [
        format(new Date(payment.fecha_pago), 'dd/MM/yyyy HH:mm'),
        payment.patients.nombre_completo,
        payment.patients.telefono || '',
        payment.monto,
        payment.metodo_pago,
        payment.users?.full_name || '',
        payment.referencia || '',
        payment.appointments?.services?.nombre || '',
        payment.appointments?.numero_sesion || ''
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pagos-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading && payments.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
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
            <CreditCard className="w-7 h-7 mr-3 text-pink-600" />
            Gestión de Pagos
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Administra los pagos y procesa nuevas transacciones
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <button
            onClick={exportPayments}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </button>
          <button
            onClick={() => {
              setShowPOSModal(true)
              fetchPendingAppointments()
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Punto de Venta
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-50 rounded-lg p-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos Hoy</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalToday.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
              <p className="text-2xl font-bold text-gray-900">${stats.totalMonth.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-50 rounded-lg p-3">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Pagos</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-orange-50 rounded-lg p-3">
              <TrendingUp className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Promedio</p>
              <p className="text-2xl font-bold text-gray-900">${stats.averagePayment.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Buscar por cliente o teléfono..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>
          
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none"
            >
              <option value="">Todos los métodos</option>
              {PAYMENT_METHODS.map(method => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
            />
          </div>

          <div className="text-sm text-gray-600 flex items-center">
            <span className="font-medium">{filteredPayments.length}</span>
            <span className="ml-1">pagos encontrados</span>
          </div>
        </div>
      </div>

      {/* Payments List */}
      <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
        {filteredPayments.length > 0 ? (
          <div className="divide-y divide-gray-200">
            {filteredPayments.map((payment) => {
              const method = PAYMENT_METHODS.find(m => m.value === payment.metodo_pago)
              return (
                <div key={payment.id} className="p-6 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
                          <CreditCard className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900">
                            {payment.patients.nombre_completo}
                          </h3>
                          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                            <div className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(payment.fecha_pago), 'dd MMM yyyy HH:mm', { locale: es })}
                            </div>
                            {payment.users && (
                              <div className="flex items-center">
                                <User className="w-4 h-4 mr-1" />
                                {payment.users.full_name}
                              </div>
                            )}
                            {payment.appointments?.services && (
                              <div className="flex items-center">
                                <Receipt className="w-4 h-4 mr-1" />
                                {payment.appointments.services.nombre} - Sesión {payment.appointments.numero_sesion}
                              </div>
                            )}
                            {payment.referencia && (
                              <div className="flex items-center">
                                <Receipt className="w-4 h-4 mr-1" />
                                {payment.referencia}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-2xl font-bold text-green-600">
                          ${payment.monto.toLocaleString()}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          method?.color || 'bg-gray-100 text-gray-800'
                        }`}>
                          {method?.label || payment.metodo_pago}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay pagos</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || methodFilter || dateFilter ? 'No se encontraron pagos con los filtros aplicados.' : 'Comienza procesando tu primer pago.'}
            </p>
            {!searchTerm && !methodFilter && !dateFilter && (
              <div className="mt-6">
                <button
                  onClick={() => {
                    setShowPOSModal(true)
                    fetchPendingAppointments()
                  }}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-lg text-white bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Punto de Venta
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced POS Modal */}
      {showPOSModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowPOSModal(false)} />
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium text-gray-900 flex items-center">
                    <ShoppingCart className="w-6 h-6 mr-2 text-pink-600" />
                    Punto de Venta - Dermacielo
                  </h3>
                  <button
                    onClick={() => setShowPOSModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Pending Appointments */}
                  <div className="lg:col-span-2">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-900">Citas Pendientes de Pago</h4>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                          type="text"
                          placeholder="Buscar paciente..."
                          value={searchPatient}
                          onChange={(e) => setSearchPatient(e.target.value)}
                          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                        />
                      </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {filteredAppointments.map((appointment) => (
                        <div
                          key={appointment.id}
                          className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                          onClick={() => addToCart(appointment)}
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <p className="font-medium text-gray-900">
                                  {appointment.patients.nombre_completo}
                                </p>
                                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                  Sesión {appointment.numero_sesion}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mb-1">
                                {appointment.services.nombre}
                              </p>
                              <p className="text-sm text-gray-500">
                                Zona: {appointment.services.zona}
                              </p>
                              <div className="flex items-center space-x-2 mt-2 text-xs text-gray-500">
                                <Clock className="w-3 h-3" />
                                <span>{format(new Date(appointment.fecha_hora), 'dd MMM yyyy HH:mm', { locale: es })}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-green-600">
                                ${(appointment.precio_sesion || appointment.services.precio_base).toLocaleString()}
                              </p>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  addToCart(appointment)
                                }}
                                className="mt-2 px-3 py-1 text-xs bg-pink-500 text-white rounded-lg hover:bg-pink-600 transition-colors"
                              >
                                Agregar
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                      {filteredAppointments.length === 0 && (
                        <div className="text-center py-8">
                          <AlertCircle className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            {searchPatient ? 'No se encontraron citas para este paciente' : 'No hay citas pendientes de pago'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cart and Payment */}
                  <div>
                    <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center">
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Carrito ({cart.length})
                    </h4>
                    
                    {/* Cart Items */}
                    <div className="space-y-3 mb-6 max-h-64 overflow-y-auto">
                      {cart.map((item) => (
                        <div key={item.appointment_id} className="p-3 bg-gray-50 rounded-lg">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 text-sm">
                                {item.patient_name}
                              </p>
                              <p className="text-xs text-gray-600">
                                {item.service_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Sesión {item.session_number}
                              </p>
                            </div>
                            <button
                              onClick={() => removeFromCart(item.appointment_id)}
                              className="text-red-500 hover:text-red-700 p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={item.amount}
                              onChange={(e) => updateCartItemAmount(item.appointment_id, parseFloat(e.target.value) || 0)}
                              className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-1 focus:ring-pink-500 focus:border-pink-500"
                            />
                          </div>
                        </div>
                      ))}
                      {cart.length === 0 && (
                        <div className="text-center py-6">
                          <ShoppingCart className="mx-auto h-8 w-8 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500">
                            Carrito vacío
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Payment Details */}
                    {cart.length > 0 && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Método de Pago
                          </label>
                          <select
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                          >
                            {PAYMENT_METHODS.map(method => (
                              <option key={method.value} value={method.value}>
                                {method.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Descuento
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={discount}
                              onChange={(e) => setDiscount(e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                              placeholder="0.00"
                            />
                          </div>

                          {paymentMethod === 'efectivo' && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Recibido
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                value={amountPaid}
                                onChange={(e) => setAmountPaid(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500"
                                placeholder="0.00"
                              />
                            </div>
                          )}
                        </div>

                        {/* Totals */}
                        <div className="border-t pt-4 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Subtotal:</span>
                            <span>${calculateSubtotal().toLocaleString()}</span>
                          </div>
                          {discount && (
                            <div className="flex justify-between text-sm text-red-600">
                              <span>Descuento:</span>
                              <span>-${parseFloat(discount).toLocaleString()}</span>
                            </div>
                          )}
                          <div className="flex justify-between text-lg font-bold border-t pt-2">
                            <span>Total:</span>
                            <span className="text-green-600">${calculateTotal().toLocaleString()}</span>
                          </div>
                          {paymentMethod === 'efectivo' && amountPaid && (
                            <div className="flex justify-between text-md text-blue-600">
                              <span>Cambio:</span>
                              <span>${calculateChange().toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={processPayment}
                  disabled={cart.length === 0 || loading || (paymentMethod === 'efectivo' && parseFloat(amountPaid || '0') < calculateTotal())}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-gradient-to-r from-pink-500 to-purple-600 text-base font-medium text-white hover:from-pink-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </div>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Procesar Pago (${calculateTotal().toLocaleString()})
                    </>
                  )}
                </button>
                <button
                  onClick={() => setShowPOSModal(false)}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}