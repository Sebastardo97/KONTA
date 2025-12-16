'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
    TrendingUp,
    DollarSign,
    Package,
    Users,
    Calendar,
    Award,
    BarChart3
} from 'lucide-react'

type SellerStats = {
    seller_id: string
    seller_name: string
    seller_email: string
    total_sales: number
    total_orders: number
    avg_order_value: number
}

type DateRange = '7d' | '30d' | '90d' | 'all'

export default function SalesBySellerPage() {
    const [stats, setStats] = useState<SellerStats[]>([])
    const [loading, setLoading] = useState(true)
    const [dateRange, setDateRange] = useState<DateRange>('30d')
    const [totalRevenue, setTotalRevenue] = useState(0)

    useEffect(() => {
        fetchStats()
    }, [dateRange])

    const fetchStats = async () => {
        setLoading(true)
        try {
            // Query invoices directly instead of the view
            let query = supabase
                .from('invoices')
                .select(`
                    id,
                    total,
                    created_at,
                    seller_id,
                    seller:profiles!invoices_seller_id_fkey(id, full_name, email)
                `)

            // Apply date filter based on selected range
            if (dateRange !== 'all') {
                const days = dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90
                const startDate = new Date()
                startDate.setDate(startDate.getDate() - days)

                query = query.gte('created_at', startDate.toISOString())
            }

            const { data, error } = await query

            if (error) throw error

            // Group by seller and calculate totals
            const grouped = (data || []).reduce((acc: any, invoice: any) => {
                const sellerId = invoice.seller_id
                if (!sellerId || !invoice.seller) return acc

                if (!acc[sellerId]) {
                    acc[sellerId] = {
                        seller_id: sellerId,
                        seller_name: invoice.seller.full_name || 'Sin nombre',
                        seller_email: invoice.seller.email,
                        total_sales: 0,
                        total_orders: 0,
                        items: []
                    }
                }
                acc[sellerId].total_sales += invoice.total || 0
                acc[sellerId].total_orders += 1
                acc[sellerId].items.push(invoice)
                return acc
            }, {})

            const statsArray: SellerStats[] = Object.values(grouped).map((seller: any) => ({
                seller_id: seller.seller_id,
                seller_name: seller.seller_name,
                seller_email: seller.seller_email,
                total_sales: seller.total_sales,
                total_orders: seller.total_orders,
                avg_order_value: seller.total_sales / seller.total_orders
            }))

            // Sort by total sales descending
            statsArray.sort((a, b) => b.total_sales - a.total_sales)

            setStats(statsArray)
            setTotalRevenue(statsArray.reduce((sum, s) => sum + s.total_sales, 0))
        } catch (error) {
            console.error('Error fetching stats:', error)
        } finally {
            setLoading(false)
        }
    }

    const getDateRangeLabel = () => {
        switch (dateRange) {
            case '7d': return 'Últimos 7 días'
            case '30d': return 'Últimos 30 días'
            case '90d': return 'Últimos 90 días'
            case 'all': return 'Todo el tiempo'
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <BarChart3 className="h-7 w-7 text-blue-600" />
                        Ventas por Vendedor
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Análisis de desempeño y métricas de ventas
                    </p>
                </div>

                {/* Date Range Selector */}
                <div className="flex gap-2">
                    {(['7d', '30d', '90d', 'all'] as DateRange[]).map(range => (
                        <button
                            key={range}
                            onClick={() => setDateRange(range)}
                            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${dateRange === range
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {range === '7d' ? '7 días' :
                                range === '30d' ? '30 días' :
                                    range === '90d' ? '90 días' :
                                        'Todo'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <DollarSign className="h-8 w-8 opacity-80" />
                        <span className="text-sm font-medium opacity-80">Total</span>
                    </div>
                    <p className="text-3xl font-bold">
                        ${totalRevenue.toLocaleString()}
                    </p>
                    <p className="text-sm opacity-80 mt-1">{getDateRangeLabel()}</p>
                </div>

                <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Users className="h-8 w-8 opacity-80" />
                        <span className="text-sm font-medium opacity-80">Vendedores</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {stats.length}
                    </p>
                    <p className="text-sm opacity-80 mt-1">Activos</p>
                </div>

                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
                    <div className="flex items-center justify-between mb-2">
                        <Package className="h-8 w-8 opacity-80" />
                        <span className="text-sm font-medium opacity-80">Órdenes</span>
                    </div>
                    <p className="text-3xl font-bold">
                        {stats.reduce((sum, s) => sum + s.total_orders, 0)}
                    </p>
                    <p className="text-sm opacity-80 mt-1">Total</p>
                </div>
            </div>

            {/* Seller Rankings */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Award className="h-5 w-5 text-amber-500" />
                        Ranking de Vendedores
                    </h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        Cargando datos...
                    </div>
                ) : stats.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No hay datos de ventas para el período seleccionado
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {stats.map((seller, index) => (
                            <div
                                key={seller.seller_id}
                                className="p-6 hover:bg-gray-50 transition-colors"
                            >
                                <div className="flex items-center justify-between">
                                    {/* Rank and Name */}
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${index === 0 ? 'bg-amber-100 text-amber-600' :
                                            index === 1 ? 'bg-gray-100 text-gray-600' :
                                                index === 2 ? 'bg-orange-100 text-orange-600' :
                                                    'bg-blue-50 text-blue-600'
                                            }`}>
                                            {index === 0 ? '🥇' :
                                                index === 1 ? '🥈' :
                                                    index === 2 ? '🥉' :
                                                        index + 1}
                                        </div>
                                        <div>
                                            <p className="font-semibold text-gray-900">
                                                {seller.seller_name}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {seller.seller_email}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="flex items-center gap-8">
                                        {/* Total Sales */}
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">Ventas Totales</p>
                                            <p className="text-xl font-bold text-green-600">
                                                ${seller.total_sales.toLocaleString()}
                                            </p>
                                        </div>

                                        {/* Orders */}
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">Órdenes</p>
                                            <p className="text-xl font-bold text-blue-600">
                                                {seller.total_orders}
                                            </p>
                                        </div>

                                        {/* Avg Order */}
                                        <div className="text-right">
                                            <p className="text-sm text-gray-500 mb-1">Promedio</p>
                                            <p className="text-xl font-bold text-purple-600">
                                                ${seller.avg_order_value.toLocaleString(undefined, {
                                                    maximumFractionDigits: 0
                                                })}
                                            </p>
                                        </div>

                                        {/* Performance Bar */}
                                        <div className="w-32">
                                            <div className="bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-500 h-2 rounded-full transition-all"
                                                    style={{
                                                        width: `${(seller.total_sales / stats[0].total_sales) * 100}%`
                                                    }}
                                                />
                                            </div>
                                            <p className="text-xs text-gray-500 text-center mt-1">
                                                {((seller.total_sales / totalRevenue) * 100).toFixed(1)}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Performance Insights */}
            {stats.length > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-200">
                    <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-blue-600" />
                        Insights de Desempeño
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Mejor Vendedor</p>
                            <p className="font-bold text-gray-900">
                                {stats[0]?.seller_name}
                            </p>
                            <p className="text-sm text-green-600">
                                ${stats[0]?.total_sales.toLocaleString()}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Promedio por Vendedor</p>
                            <p className="font-bold text-gray-900">
                                ${(totalRevenue / stats.length).toLocaleString(undefined, {
                                    maximumFractionDigits: 0
                                })}
                            </p>
                        </div>
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Ticket Promedio General</p>
                            <p className="font-bold text-gray-900">
                                ${(totalRevenue / stats.reduce((sum, s) => sum + s.total_orders, 0)).toLocaleString(undefined, {
                                    maximumFractionDigits: 0
                                })}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
