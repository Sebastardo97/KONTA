'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/hooks/useRole'
import {
    TrendingUp,
    DollarSign,
    Package,
    Award,
    Calendar,
    Target,
    ShoppingBag,
    User
} from 'lucide-react'

type Stats = {
    total_sales: number
    total_orders: number
    avg_order: number
    this_month_sales: number
    this_month_orders: number
    last_month_sales: number
}

type RecentOrder = {
    id: string
    number: number
    customer_name: string
    total: number
    date: string
    status: string
}

export default function SellerDashboardPage() {
    const { userId, role } = useRole()
    const [stats, setStats] = useState<Stats>({
        total_sales: 0,
        total_orders: 0,
        avg_order: 0,
        this_month_sales: 0,
        this_month_orders: 0,
        last_month_sales: 0
    })
    const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [sellerInfo, setSellerInfo] = useState<any>(null)

    useEffect(() => {
        if (userId) {
            fetchDashboardData()
        }
    }, [userId])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // Get seller profile
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single()

            setSellerInfo(profile)

            // Get all invoices for this seller
            const { data: invoices } = await supabase
                .from('invoices')
                .select('*, customer:customers(*)')
                .eq('seller_id', userId)
                .order('created_at', { ascending: false })

            if (!invoices) return

            // Calculate date ranges
            const now = new Date()
            const firstDayThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
            const firstDayLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
            const lastDayLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

            // Calculate stats
            const total_sales = invoices.reduce((sum, inv) => sum + inv.total, 0)
            const total_orders = invoices.length

            const this_month = invoices.filter(inv => new Date(inv.created_at) >= firstDayThisMonth)
            const this_month_sales = this_month.reduce((sum, inv) => sum + inv.total, 0)
            const this_month_orders = this_month.length

            const last_month = invoices.filter(inv => {
                const date = new Date(inv.created_at)
                return date >= firstDayLastMonth && date <= lastDayLastMonth
            })
            const last_month_sales = last_month.reduce((sum, inv) => sum + inv.total, 0)

            setStats({
                total_sales,
                total_orders,
                avg_order: total_orders > 0 ? total_sales / total_orders : 0,
                this_month_sales,
                this_month_orders,
                last_month_sales
            })

            // Get recent orders
            const recent = invoices.slice(0, 10).map(inv => ({
                id: inv.id,
                number: inv.number,
                customer_name: inv.customer?.name || 'N/A',
                total: inv.total,
                date: inv.date,
                status: inv.status
            }))

            setRecentOrders(recent)
        } catch (error) {
            console.error('Error fetching dashboard data:', error)
        } finally {
            setLoading(false)
        }
    }

    const getPerformanceChange = () => {
        if (stats.last_month_sales === 0) return { percent: 100, isPositive: true }
        const change = ((stats.this_month_sales - stats.last_month_sales) / stats.last_month_sales) * 100
        return {
            percent: Math.abs(change),
            isPositive: change >= 0
        }
    }

    const performance = getPerformanceChange()

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Cargando dashboard...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-xl">
                <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                        <User className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">
                            {sellerInfo?.full_name || 'Vendedor'}
                        </h1>
                        <p className="text-blue-100">
                            {role === 'admin' ? 'Administrador' : 'Vendedor'}
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Stats */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <DollarSign className="h-8 w-8 text-green-500" />
                        <span className="text-xs text-gray-500 uppercase font-bold">Este Mes</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        ${stats.this_month_sales.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        {stats.this_month_orders} órdenes
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <TrendingUp className={`h-8 w-8 ${performance.isPositive ? 'text-green-500' : 'text-red-500'}`} />
                        <span className="text-xs text-gray-500 uppercase font-bold">Tendencia</span>
                    </div>
                    <p className={`text-2xl font-bold ${performance.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                        {performance.isPositive ? '↑' : '↓'} {performance.percent.toFixed(1)}%
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        vs. mes anterior
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <Package className="h-8 w-8 text-blue-500" />
                        <span className="text-xs text-gray-500 uppercase font-bold">Total</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        {stats.total_orders}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        órdenes vendidas
                    </p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <Target className="h-8 w-8 text-purple-500" />
                        <span className="text-xs text-gray-500 uppercase font-bold">Promedio</span>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">
                        ${stats.avg_order.toLocaleString(undefined, {
                            maximumFractionDigits: 0
                        })}
                    </p>
                    <p className="text-sm text-gray-600 mt-1">
                        por orden
                    </p>
                </div>
            </div>

            {/* All-Time Performance */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                <div className="flex items-center gap-3 mb-4">
                    <Award className="h-6 w-6 text-amber-600" />
                    <h2 className="text-lg font-bold text-gray-900">Desempeño Total</h2>
                </div>
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Ventas Totales Acumuladas</p>
                        <p className="text-3xl font-bold text-amber-600">
                            ${stats.total_sales.toLocaleString()}
                        </p>
                    </div>
                    <div>
                        <p className="text-sm text-gray-600 mb-1">Mes Anterior</p>
                        <p className="text-2xl font-bold text-gray-700">
                            ${stats.last_month_sales.toLocaleString()}
                        </p>
                        <p className="text-sm text-gray-500">
                            {((stats.this_month_sales / (stats.last_month_sales || 1)) * 100).toFixed(0)}% vs. actual
                        </p>
                    </div>
                </div>
            </div>

            {/* Recent Orders */}
            <div className="bg-white rounded-xl border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5 text-blue-600" />
                        Órdenes Recientes
                    </h2>
                </div>
                <div className="overflow-x-auto">
                    {recentOrders.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            No hay órdenes registradas
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        #
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Cliente
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Fecha
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Total
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                                        Estado
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentOrders.map((order) => (
                                    <tr key={order.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                            #{order.number}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {order.customer_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(order.date).toLocaleDateString('es-CO')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                            ${order.total.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                                {order.status === 'paid' ? 'Pagada' : order.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Motivational Message */}
            <div className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-6 rounded-xl text-center">
                <p className="text-lg font-semibold mb-2">
                    {performance.isPositive ? '🎉 ¡Excelente trabajo!' : '💪 ¡Sigue adelante!'}
                </p>
                <p className="text-blue-100">
                    {performance.isPositive
                        ? `Tus ventas han aumentado un ${performance.percent.toFixed(1)}% este mes`
                        : 'Cada oportunidad es un nuevo comienzo para crecer'}
                </p>
            </div>
        </div>
    )
}
