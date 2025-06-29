import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  Users, 
  Calendar, 
  CreditCard, 
  TrendingUp,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react'
import { format, startOfDay, endOfDay, startOfMonth, endOfMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface DashboardStats {
  totalPatients: number
  todayAppointments: number
  monthlyRevenue: number
  pendingAppointments: number
  completedAppointments: number
  recentPayments: any[]
  upcomingAppointments: any[]
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalPatients: 0,
    todayAppointments: 0,
    monthlyRevenue: 0,
    pendingAppointments: 0,
    completedAppointments: 0,
    recentPayments: [],
    upcomingAppointments: []
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const today = new Date()
      const startOfToday = startOfDay(today)
      const endOfToday = endOfDay(today)
      const startOfCurrentMonth = startOfMonth(today)
      const endOfCurrentMonth = endOfMonth(today)

      // Total patients
      const { count: totalPatients } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)

      // Today's appointments
      const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .gte('fecha_hora', startOfToday.toISOString())
        .lte('fecha_hora', endOfToday.toISOString())

      // Monthly revenue
      const { data: monthlyPayments } = await supabase
        .from('payments')
        .select('monto')
        .gte('fecha_pago', startOfCurrentMonth.toISOString())
        .lte('fecha_pago', endOfCurrentMonth.toISOString())

      const monthlyRevenue = monthlyPayments?.reduce((sum, payment) => sum + payment.monto, 0) || 0

      // Pending appointments
      const { count: pendingAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'agendada')

      // Completed appointments this month
      const { count: completedAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completada')
        .gte('fecha_hora', startOfCurrentMonth.toISOString())
        .lte('fecha_hora', endOfCurrentMonth.toISOString())

      // Recent payments
      const { data: recentPayments } = await supabase
        .from('payments')
        .select(`
          *,
          patients(nombre_completo)
        `)
        .order('fecha_pago', { ascending: false })
        .limit(5)

      // Upcoming appointments
      const { data: upcomingAppointments } = await supabase
        .from('appointments')
        .select(`
          *,
          patients(nombre_completo),
          services(nombre, zona)
        `)
        .gte('fecha_hora', new Date().toISOString())
        .eq('status', 'agendada')
        .order('fecha_hora', { ascending: true })
        .limit(5)

      setStats({
        totalPatients: totalPatients || 0,
        todayAppointments: todayAppointments || 0,
        monthlyRevenue,
        pendingAppointments: pendingAppointments || 0,
        completedAppointments: completedAppointments || 0,
        recentPayments: recentPayments || [],
        upcomingAppointments: upcomingAppointments || []
      })
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-6">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const statCards = [
    {
      name: 'Total Pacientes',
      value: stats.totalPatients,
      icon: Users,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      name: 'Citas Hoy',
      value: stats.todayAppointments,
      icon: Calendar,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      name: 'Ingresos del Mes',
      value: `$${stats.monthlyRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: 'bg-purple-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-600'
    },
    {
      name: 'Citas Pendientes',
      value: stats.pendingAppointments,
      icon: Clock,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ]

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          ¡Bienvenido a Dermacielo!
        </h1>
        <p className="text-gray-600">
          Aquí tienes un resumen de la actividad de tu clínica de depilación láser.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.name} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center">
              <div className={`${stat.bgColor} rounded-lg p-3`}>
                <stat.icon className={`w-6 h-6 ${stat.textColor}`} />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recent Payments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <CreditCard className="w-5 h-5 mr-2 text-green-600" />
              Pagos Recientes
            </h3>
          </div>
          <div className="p-6">
            {stats.recentPayments.length > 0 ? (
              <div className="space-y-4">
                {stats.recentPayments.map((payment) => (
                  <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {payment.patients?.nombre_completo}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {payment.metodo_pago} • {format(new Date(payment.fecha_pago), 'dd MMM yyyy', { locale: es })}
                      </p>
                    </div>
                    <span className="text-lg font-bold text-green-600">
                      ${payment.monto.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay pagos recientes</p>
            )}
          </div>
        </div>

        {/* Upcoming Appointments */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-blue-600" />
              Próximas Citas
            </h3>
          </div>
          <div className="p-6">
            {stats.upcomingAppointments.length > 0 ? (
              <div className="space-y-4">
                {stats.upcomingAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">
                        {appointment.patients?.nombre_completo}
                      </p>
                      <p className="text-sm text-gray-500">
                        {appointment.services?.nombre} • {appointment.services?.zona}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(appointment.fecha_hora), 'dd MMM yyyy HH:mm', { locale: es })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        Sesión {appointment.numero_sesion || 1}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No hay citas programadas</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-gradient-to-r from-pink-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
        <h3 className="text-lg font-medium mb-4">Acciones Rápidas</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <button 
            onClick={() => window.location.href = '/workflow'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-left transition-colors hover:scale-105 transform"
          >
            <div className="flex items-center mb-2">
              <Calendar className="w-6 h-6 mr-2" />
              <span className="px-2 py-1 bg-white bg-opacity-30 rounded-full text-xs font-bold">360°</span>
            </div>
            <p className="font-medium">Flujo Completo</p>
            <p className="text-sm opacity-90">Paciente → Servicio → Cita → Pago</p>
          </button>
          <button 
            onClick={() => window.location.href = '/patients'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-left transition-colors hover:scale-105 transform"
          >
            <Users className="w-6 h-6 mb-2" />
            <p className="font-medium">Nuevo Paciente</p>
            <p className="text-sm opacity-90">Registrar un nuevo cliente</p>
          </button>
          <button 
            onClick={() => window.location.href = '/appointments'}
            className="bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg p-4 text-left transition-colors hover:scale-105 transform"
          >
            <Clock className="w-6 h-6 mb-2" />
            <p className="font-medium">Agendar Cita</p>
            <p className="text-sm opacity-90">Programar nueva sesión</p>
          </button>
        </div>
      </div>
    </div>
  )
}