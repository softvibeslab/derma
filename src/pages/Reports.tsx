import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Calendar,
  DollarSign,
  Download,
  Filter,
  AlertCircle
} from 'lucide-react'
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns'
import { es } from 'date-fns/locale'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'

interface ReportData {
  monthlyRevenue: any[]
  paymentMethods: any[]
  servicePopularity: any[]
  dailyAppointments: any[]
  patientGrowth: any[]
}

const COLORS = ['#ec4899', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData>({
    monthlyRevenue: [],
    paymentMethods: [],
    servicePopularity: [],
    dailyAppointments: [],
    patientGrowth: []
  })
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('6months')
  const [error, setError] = useState('')
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPatients: 0,
    totalAppointments: 0,
    averageSessionPrice: 0,
    growthRate: 0
  })

  useEffect(() => {
    fetchReportData()
  }, [dateRange])

  const fetchReportData = async () => {
    try {
      setLoading(true)
      setError('')
      
      const now = new Date()
      let startDate: Date
      
      switch (dateRange) {
        case '3months':
          startDate = subMonths(now, 3)
          break
        case '6months':
          startDate = subMonths(now, 6)
          break
        case '1year':
          startDate = subMonths(now, 12)
          break
        case 'thisyear':
          startDate = startOfYear(now)
          break
        default:
          startDate = subMonths(now, 6)
      }

      console.log('Fetching report data for date range:', startDate.toISOString())

      // Fetch payments for revenue analysis
      const { data: payments, error: paymentsError } = await supabase
        .from('payments')
        .select('*')
        .gte('fecha_pago', startDate.toISOString())
        .order('fecha_pago', { ascending: true })

      if (paymentsError) {
        console.error('Error fetching payments:', paymentsError)
        throw paymentsError
      }

      // Fetch appointments for service analysis - using explicit foreign key names
      const { data: appointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select(`
          *,
          services!appointments_service_id_fkey(nombre, zona),
          patients!appointments_patient_id_fkey(nombre_completo)
        `)
        .gte('fecha_hora', startDate.toISOString())

      if (appointmentsError) {
        console.error('Error fetching appointments:', appointmentsError)
        throw appointmentsError
      }

      // Fetch patients for growth analysis
      const { data: patients, error: patientsError } = await supabase
        .from('patients')
        .select('created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })

      if (patientsError) {
        console.error('Error fetching patients:', patientsError)
        throw patientsError
      }

      // Process monthly revenue
      const monthlyRevenue = processMonthlyRevenue(payments || [])
      
      // Process payment methods
      const paymentMethods = processPaymentMethods(payments || [])
      
      // Process service popularity
      const servicePopularity = processServicePopularity(appointments || [])
      
      // Process daily appointments
      const dailyAppointments = processDailyAppointments(appointments || [])
      
      // Process patient growth
      const patientGrowth = processPatientGrowth(patients || [])

      // Calculate stats
      const totalRevenue = (payments || []).reduce((sum, p) => sum + p.monto, 0)
      const totalPatients = patients?.length || 0
      const totalAppointments = appointments?.length || 0
      const averageSessionPrice = totalAppointments > 0 ? totalRevenue / totalAppointments : 0
      
      // Calculate growth rate (comparing last month vs previous month)
      const lastMonth = subMonths(now, 1)
      const previousMonth = subMonths(now, 2)
      
      const lastMonthRevenue = (payments || [])
        .filter(p => new Date(p.fecha_pago) >= lastMonth)
        .reduce((sum, p) => sum + p.monto, 0)
      
      const previousMonthRevenue = (payments || [])
        .filter(p => new Date(p.fecha_pago) >= previousMonth && new Date(p.fecha_pago) < lastMonth)
        .reduce((sum, p) => sum + p.monto, 0)
      
      const growthRate = previousMonthRevenue > 0 ? 
        ((lastMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100 : 0

      setReportData({
        monthlyRevenue,
        paymentMethods,
        servicePopularity,
        dailyAppointments,
        patientGrowth
      })

      setStats({
        totalRevenue,
        totalPatients,
        totalAppointments,
        averageSessionPrice,
        growthRate
      })

      console.log('Report data processed successfully')

    } catch (error) {
      console.error('Error fetching report data:', error)
      setError('Error al cargar los datos del reporte: ' + (error as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const processMonthlyRevenue = (payments: any[]) => {
    const monthlyData: { [key: string]: number } = {}
    
    payments.forEach(payment => {
      const month = format(new Date(payment.fecha_pago), 'MMM yyyy', { locale: es })
      monthlyData[month] = (monthlyData[month] || 0) + payment.monto
    })

    return Object.entries(monthlyData).map(([month, revenue]) => ({
      month,
      revenue
    }))
  }

  const processPaymentMethods = (payments: any[]) => {
    const methodData: { [key: string]: number } = {}
    
    payments.forEach(payment => {
      methodData[payment.metodo_pago] = (methodData[payment.metodo_pago] || 0) + payment.monto
    })

    return Object.entries(methodData).map(([method, value]) => ({
      name: method.charAt(0).toUpperCase() + method.slice(1),
      value
    }))
  }

  const processServicePopularity = (appointments: any[]) => {
    const serviceData: { [key: string]: number } = {}
    
    appointments.forEach(appointment => {
      if (appointment.services) {
        const serviceName = appointment.services.nombre
        serviceData[serviceName] = (serviceData[serviceName] || 0) + 1
      }
    })

    return Object.entries(serviceData)
      .map(([service, count]) => ({ service, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
  }

  const processDailyAppointments = (appointments: any[]) => {
    const dailyData: { [key: string]: number } = {}
    
    appointments.forEach(appointment => {
      const day = format(new Date(appointment.fecha_hora), 'dd MMM', { locale: es })
      dailyData[day] = (dailyData[day] || 0) + 1
    })

    return Object.entries(dailyData)
      .map(([day, count]) => ({ day, count }))
      .slice(-30) // Last 30 days
  }

  const processPatientGrowth = (patients: any[]) => {
    const monthlyData: { [key: string]: number } = {}
    
    patients.forEach(patient => {
      const month = format(new Date(patient.created_at), 'MMM yyyy', { locale: es })
      monthlyData[month] = (monthlyData[month] || 0) + 1
    })

    return Object.entries(monthlyData).map(([month, count]) => ({
      month,
      count
    }))
  }

  const exportReport = () => {
    if (loading) {
      alert('Por favor espera a que terminen de cargar los datos')
      return
    }
    
    const reportContent = `
REPORTE DERMACIELO - ${format(new Date(), 'dd/MM/yyyy')}
================================================

RESUMEN EJECUTIVO
-----------------
Período: ${dateRange}
Ingresos Totales: $${stats.totalRevenue.toLocaleString()}
Total Pacientes: ${stats.totalPatients}
Total Citas: ${stats.totalAppointments}
Precio Promedio por Sesión: $${stats.averageSessionPrice.toLocaleString()}
Tasa de Crecimiento: ${stats.growthRate.toFixed(1)}%

INGRESOS MENSUALES
------------------
${reportData.monthlyRevenue.map(item => 
  `${item.month}: $${item.revenue.toLocaleString()}`
).join('\n')}

MÉTODOS DE PAGO
---------------
${reportData.paymentMethods.map(item => 
  `${item.name}: $${item.value.toLocaleString()}`
).join('\n')}

SERVICIOS MÁS POPULARES
-----------------------
${reportData.servicePopularity.map((item, index) => 
  `${index + 1}. ${item.service}: ${item.count} citas`
).join('\n')}

CRECIMIENTO DE PACIENTES
------------------------
${reportData.patientGrowth.map(item => 
  `${item.month}: ${item.count} nuevos pacientes`
).join('\n')}

================================================
Reporte generado automáticamente por Dermacielo
Tecnología Sopranoice
    `

    const blob = new Blob([reportContent], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reporte-dermacielo-${format(new Date(), 'yyyy-MM-dd')}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-64 bg-gray-200 rounded-lg"></div>
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
            <BarChart3 className="w-7 h-7 mr-3 text-pink-600" />
            Reportes y Estadísticas
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Análisis detallado del rendimiento de tu clínica
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-pink-500 focus:border-pink-500 appearance-none"
            >
              <option value="3months">Últimos 3 meses</option>
              <option value="6months">Últimos 6 meses</option>
              <option value="1year">Último año</option>
              <option value="thisyear">Este año</option>
            </select>
          </div>
          <button
            onClick={exportReport}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 transition-all"
          >
            <Download className="w-4 h-4 mr-2" />
            Exportar
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

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-green-50 rounded-lg p-3">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
              <p className="text-xl font-bold text-gray-900">${stats.totalRevenue.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-blue-50 rounded-lg p-3">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pacientes</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalPatients}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-purple-50 rounded-lg p-3">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Citas</p>
              <p className="text-xl font-bold text-gray-900">{stats.totalAppointments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="bg-orange-50 rounded-lg p-3">
              <BarChart3 className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Precio Promedio</p>
              <p className="text-xl font-bold text-gray-900">${stats.averageSessionPrice.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center">
            <div className={`${stats.growthRate >= 0 ? 'bg-green-50' : 'bg-red-50'} rounded-lg p-3`}>
              <TrendingUp className={`w-6 h-6 ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Crecimiento</p>
              <p className={`text-xl font-bold ${stats.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {stats.growthRate >= 0 ? '+' : ''}{stats.growthRate.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Monthly Revenue */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Ingresos Mensuales</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.monthlyRevenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Ingresos']} />
              <Bar dataKey="revenue" fill="#ec4899" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Payment Methods */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Métodos de Pago</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.paymentMethods}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {reportData.paymentMethods.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => [`$${Number(value).toLocaleString()}`, 'Total']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Service Popularity */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Servicios Más Populares</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.servicePopularity} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="service" type="category" width={120} />
              <Tooltip />
              <Bar dataKey="count" fill="#8b5cf6" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Patient Growth */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Crecimiento de Pacientes</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.patientGrowth}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Appointments Chart */}
      <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Citas Diarias (Últimos 30 días)</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={reportData.dailyAppointments}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" />
            <YAxis />
            <Tooltip />
            <Line type="monotone" dataKey="count" stroke="#06b6d4" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}