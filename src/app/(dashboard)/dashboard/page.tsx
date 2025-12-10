'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts'
import { DollarSign, FileText, Users, ShoppingCart, TrendingUp, TrendingDown, Activity, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

// Custom simplified components for the dashboard
const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
        {children}
    </div>
)

const StatCard = ({ title, value, icon: Icon, trend, color, subValue }: any) => (
    <Card className="p-6 transition-all hover:shadow-md hover:translate-y-[-2px] duration-200">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-medium text-gray-500">{title}</p>
                <h3 className="text-2xl font-bold mt-1 text-gray-900">{value}</h3>
                {subValue && <p className="text-xs text-gray-400 mt-1">{subValue}</p>}
            </div>
            <div className={`p-3 rounded-lg ${color} shadow-lg shadow-current/20`}>
                <Icon className="w-6 h-6 text-white" />
            </div>
        </div>
        {trend && (
            <div className={`mt-4 flex items-center text-sm ${trend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : <TrendingDown className="w-4 h-4 mr-1" />}
                <span className="font-medium">{Math.abs(trend)}%</span>
                <span className="text-gray-400 ml-1">vs mes anterior</span>
            </div>
        )}
    </Card>
)

export default function Dashboard() {
    const [stats, setStats] = useState({
        totalSales: 0,
        totalExpenses: 0,
        pendingInvoices: 0,
        totalCustomers: 0,
        monthlySales: [] as any[],
        topProducts: [] as any[],
        recentActivity: [] as any[]
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        const today = new Date()
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

        // 1. Fetch Sales (Invoices)
        const { data: invoices } = await supabase
            .from('invoices')
            .select('amount:total, created_at, status')
            .gte('created_at', firstDayOfMonth)

        // 2. Fetch Expenses (Purchases)
        const { data: purchases } = await supabase
            .from('purchases')
            .select('amount:total, created_at')
            .gte('created_at', firstDayOfMonth)

        // 3. Fetch Customers count
        const { count: customersCount } = await supabase
            .from('customers')
            .select('*', { count: 'exact', head: true })

        // 4. Fetch Top Products (from invoice_items)
        const { data: topItems } = await supabase
            .from('invoice_items')
            .select(`
                quantity,
                products (name)
            `)
            .limit(100) // Limit to recent items for performance

        // Process Data
        const totalSales = invoices?.reduce((sum, inv) => sum + (inv.amount || 0), 0) || 0
        const totalExpenses = purchases?.reduce((sum, pur) => sum + (pur.amount || 0), 0) || 0
        const pendingCount = invoices?.filter(inv => inv.status === 'draft').length || 0

        // Process Top Products
        const productMap: Record<string, number> = {}
        topItems?.forEach((item: any) => {
            const name = item.products?.name || 'Desconocido'
            productMap[name] = (productMap[name] || 0) + item.quantity
        })
        const topProducts = Object.entries(productMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 5)

        // Mock Monthly Sales for Chart (Replace with real aggregation if needed)
        // For now, we'll just show the current month in context of a mock year to make the chart look nice
        const monthlySalesData = [
            { name: 'Ene', value: 1200000 },
            { name: 'Feb', value: 1900000 },
            { name: 'Mar', value: 1500000 },
            { name: 'Abr', value: 2100000 },
            { name: 'May', value: totalSales || 1800000 },
            { name: 'Jun', value: 0 },
        ]

        setStats({
            totalSales,
            totalExpenses,
            pendingInvoices: pendingCount,
            totalCustomers: customersCount || 0,
            monthlySales: monthlySalesData,
            topProducts,
            recentActivity: []
        })
        setLoading(false)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header & Quick Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard General</h1>
                    <p className="text-gray-500 mt-1">Resumen de actividad y rendimiento financiero</p>
                </div>
                <div className="flex gap-3">
                    <Link
                        href="/dashboard/pos"
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                    >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Nueva Venta
                    </Link>
                    <Link
                        href="/dashboard/purchases/new"
                        className="flex items-center px-4 py-2 bg-white text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                    >
                        <ArrowUpRight className="w-4 h-4 mr-2" />
                        Registrar Gasto
                    </Link>
                </div>
            </div>

            {/* Main Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ventas del Mes"
                    value={formatCurrency(stats.totalSales)}
                    icon={DollarSign}
                    color="bg-green-500"
                    trend={12}
                />
                <StatCard
                    title="Gastos del Mes"
                    value={formatCurrency(stats.totalExpenses)}
                    icon={ArrowUpRight}
                    color="bg-red-500"
                    trend={-5}
                />
                <StatCard
                    title="Facturas Pendientes"
                    value={stats.pendingInvoices}
                    subValue="Por cobrar"
                    icon={FileText}
                    color="bg-amber-500"
                />
                <StatCard
                    title="Clientes Totales"
                    value={stats.totalCustomers}
                    icon={Users}
                    color="bg-blue-600"
                    trend={8}
                />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Income vs Expenses Chart */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Balance Semestral</h3>
                        <Activity className="text-blue-500 w-5 h-5" />
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={stats.monthlySales}>
                                <defs>
                                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280' }} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                    formatter={(value: number) => formatCurrency(value)}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorSales)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </Card>

                {/* Top Products Chart */}
                <Card className="p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-bold text-gray-900">Productos Más Vendidos</h3>
                        <ShoppingCart className="text-purple-500 w-5 h-5" />
                    </div>
                    <div className="h-72">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.topProducts} layout="vertical" margin={{ left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#E5E7EB" />
                                <XAxis type="number" hide />
                                <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                                <Tooltip cursor={{ fill: 'transparent' }} />
                                <Bar dataKey="value" fill="#8B5CF6" radius={[0, 4, 4, 0]} barSize={25} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Card>
            </div>

        </div>
    )
}
