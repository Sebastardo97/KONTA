'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/hooks/useRole'
import {
    DollarSign,
    FileText,
    Users,
    ShoppingCart,
    TrendingUp,
    TrendingDown,
    ArrowUpRight,
    Package,
    Award,
    ClipboardList,
    UserCheck
} from 'lucide-react'
import Link from 'next/link'

const Card = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
        {children}
    </div>
)

const StatCard = ({ title, value, icon: Icon, trend, color, subValue, href }: any) => {
    const CardContent = (
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
    )

    const TrendIndicator = trend !== undefined && (
        <div className={`mt-4 flex items-center text-sm ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {trend > 0 ? <TrendingUp className="w-4 h-4 mr-1" /> : trend < 0 ? <TrendingDown className="w-4 h-4 mr-1" /> : null}
            <span className="font-medium">{Math.abs(trend)}%</span>
            <span className="text-gray-400 ml-1">vs mes anterior</span>
        </div>
    )

    if (href) {
        return (
            <Link href={href}>
                <Card className="p-6 transition-all hover:shadow-md hover:translate-y-[-2px] duration-200 cursor-pointer">
                    {CardContent}
                    {TrendIndicator}
                </Card>
            </Link>
        )
    }

    return (
        <Card className="p-6 transition-all hover:shadow-md hover:translate-y-[-2px] duration-200">
            {CardContent}
            {TrendIndicator}
        </Card>
    )
}

export default function Dashboard() {
    const { isAdmin, isSeller, userId, loading: roleLoading } = useRole()
    const [stats, setStats] = useState({
        totalSales: 0,
        totalExpenses: 0,
        pendingInvoices: 0,
        totalCustomers: 0,
        activeSellers: 0,
        pendingOrders: 0,
        avgTicket: 0,
        topSeller: { name: '', sales: 0 },
        // Seller-specific
        mySalesToday: 0,
        mySalesMonth: 0,
        myPendingOrders: 0,
        myRank: 0
    })
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!roleLoading && userId) {
            fetchDashboardData()
        }
    }, [roleLoading, userId, isAdmin])

    const fetchDashboardData = async () => {
        const today = new Date()
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()
        const startOfToday = new Date(today.setHours(0, 0, 0, 0)).toISOString()

        if (isAdmin) {
            // ADMIN DASHBOARD
            // 1. Fetch Sales (Invoices)
            const { data: invoices } = await supabase
                .from('invoices')
                .select('total, created_at, status, seller_id')
                .gte('created_at', firstDayOfMonth)

            // 2. Fetch Expenses
            const { data: purchases } = await supabase
                .from('purchases')
                .select('total, created_at')
                .gte('created_at', firstDayOfMonth)

            // 3. Fetch Customers count
            const { count: customersCount } = await supabase
                .from('customers')
                .select('*', { count: 'exact', head: true })

            // 4. Fetch Active Sellers (sellers with role)
            const { count: sellersCount } = await supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .in('role', ['seller', 'admin'])

            // 5. Fetch Pending Sales Orders
            const { count: pendingOrdersCount } = await supabase
                .from('sales_orders')
                .select('*', { count: 'exact', head: true })
                .in('status', ['pending', 'assigned'])

            // 6. Calculate Top Seller
            const sellerSales: Record<string, { name: string, sales: number }> = {}
            for (const inv of invoices || []) {
                if (inv.seller_id) {
                    if (!sellerSales[inv.seller_id]) {
                        const { data: seller } = await supabase
                            .from('profiles')
                            .select('full_name')
                            .eq('id', inv.seller_id)
                            .single()
                        sellerSales[inv.seller_id] = { name: seller?.full_name || 'Unknown', sales: 0 }
                    }
                    sellerSales[inv.seller_id].sales += inv.total || 0
                }
            }

            const topSeller = Object.values(sellerSales).sort((a, b) => b.sales - a.sales)[0] || { name: 'N/A', sales: 0 }

            const totalSales = invoices?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0
            const totalExpenses = purchases?.reduce((sum, pur) => sum + (pur.total || 0), 0) || 0
            const pendingCount = invoices?.filter(inv => inv.status === 'draft').length || 0
            const avgTicket = invoices && invoices.length > 0 ? totalSales / invoices.length : 0

            setStats({
                ...stats,
                totalSales,
                totalExpenses,
                pendingInvoices: pendingCount,
                totalCustomers: customersCount || 0,
                activeSellers: sellersCount || 0,
                pendingOrders: pendingOrdersCount || 0,
                avgTicket,
                topSeller
            })
        } else if (isSeller) {
            // SELLER DASHBOARD
            // 1. My Sales Today
            const { data: todaySales } = await supabase
                .from('invoices')
                .select('total')
                .eq('seller_id', userId)
                .gte('created_at', startOfToday)

            // 2. My Sales This Month
            const { data: monthSales } = await supabase
                .from('invoices')
                .select('total')
                .eq('seller_id', userId)
                .gte('created_at', firstDayOfMonth)

            // 3. My Pending Orders
            const { count: myPendingCount } = await supabase
                .from('sales_orders')
                .select('*', { count: 'exact', head: true })
                .eq('assigned_to', userId)
                .in('status', ['pending', 'assigned'])

            // 4. My Rank (simplified - compare with other sellers)
            const { data: allSales } = await supabase
                .from('invoices')
                .select('seller_id, total')
                .gte('created_at', firstDayOfMonth)

            const sellerTotals: Record<string, number> = {}
            allSales?.forEach(inv => {
                if (inv.seller_id) {
                    sellerTotals[inv.seller_id] = (sellerTotals[inv.seller_id] || 0) + (inv.total || 0)
                }
            })

            const myTotal = sellerTotals[userId] || 0
            const myRank = Object.values(sellerTotals).filter(total => total > myTotal).length + 1

            setStats({
                ...stats,
                mySalesToday: todaySales?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0,
                mySalesMonth: monthSales?.reduce((sum, inv) => sum + (inv.total || 0), 0) || 0,
                myPendingOrders: myPendingCount || 0,
                myRank
            })
        }

        setLoading(false)
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    if (loading || roleLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-center">
                    <div className="h-12 w-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                    <p className="text-gray-500">Cargando dashboard...</p>
                </div>
            </div>
        )
    }

    // ADMIN DASHBOARD
    if (isAdmin) {
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

                {/* Main Stats Grid - Row 1 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
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
                        title="Vendedores Activos"
                        value={stats.activeSellers}
                        icon={UserCheck}
                        color="bg-purple-500"
                        href="/dashboard/sellers"
                    />
                </div>

                {/* Stats Grid - Row 2 */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <StatCard
                        title="Órdenes Pendientes"
                        value={stats.pendingOrders}
                        subValue="Por ejecutar"
                        icon={ClipboardList}
                        color="bg-blue-500"
                        href="/dashboard/sales-orders"
                    />
                    <StatCard
                        title="Ticket Promedio"
                        value={formatCurrency(stats.avgTicket)}
                        icon={TrendingUp}
                        color="bg-indigo-500"
                    />
                    <StatCard
                        title="Clientes Totales"
                        value={stats.totalCustomers}
                        icon={Users}
                        color="bg-cyan-500"
                        trend={8}
                        href="/dashboard/customers"
                    />
                    <Card className="p-6 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
                        <div className="flex items-center gap-3 mb-2">
                            <Award className="h-5 w-5 text-amber-600" />
                            <p className="text-sm font-medium text-amber-900">Top Vendedor</p>
                        </div>
                        <p className="text-xl font-bold text-amber-900">{stats.topSeller.name}</p>
                        <p className="text-sm text-amber-700 mt-1">{formatCurrency(stats.topSeller.sales)}</p>
                    </Card>
                </div>

                {/* Quick Links */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Link href="/dashboard/reports/sales-by-seller" className="block">
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                            <div className="flex items-center gap-3">
                                <Package className="h-8 w-8 text-blue-500" />
                                <div>
                                    <p className="font-semibold text-gray-900">Ver Reportes de Ventas</p>
                                    <p className="text-sm text-gray-500">Análisis por vendedor</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                    <Link href="/dashboard/sales-orders/new" className="block">
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
                            <div className="flex items-center gap-3">
                                <ClipboardList className="h-8 w-8 text-green-500" />
                                <div>
                                    <p className="font-semibold text-gray-900">Crear Preventa</p>
                                    <p className="text-sm text-gray-500">Asignar a vendedor</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                    <Link href="/dashboard/sellers" className="block">
                        <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-purple-500">
                            <div className="flex items-center gap-3">
                                <Users className="h-8 w-8 text-purple-500" />
                                <div>
                                    <p className="font-semibold text-gray-900">Gestionar Vendedores</p>
                                    <p className="text-sm text-gray-500">Ver y editar perfiles</p>
                                </div>
                            </div>
                        </Card>
                    </Link>
                </div>
            </div>
        )
    }

    // SELLER DASHBOARD
    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Mi Dashboard</h1>
                    <p className="text-gray-500 mt-1">Resumen de tu desempeño</p>
                </div>
                <Link
                    href="/dashboard/pos"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-md hover:shadow-lg transition-all"
                >
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Nueva Venta
                </Link>
            </div>

            {/* Seller Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                    title="Ventas de Hoy"
                    value={formatCurrency(stats.mySalesToday)}
                    icon={DollarSign}
                    color="bg-green-500"
                />
                <StatCard
                    title="Ventas del Mes"
                    value={formatCurrency(stats.mySalesMonth)}
                    icon={TrendingUp}
                    color="bg-blue-500"
                />
                <StatCard
                    title="Órdenes Pendientes"
                    value={stats.myPendingOrders}
                    subValue="Por ejecutar"
                    icon={ClipboardList}
                    color="bg-amber-500"
                    href="/dashboard/my-orders"
                />
                <Card className="p-6 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                    <div className="flex items-center gap-3 mb-2">
                        <Award className="h-5 w-5 text-purple-600" />
                        <p className="text-sm font-medium text-purple-900">Mi Ranking</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">#{stats.myRank}</p>
                    <p className="text-sm text-purple-700 mt-1">Este mes</p>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/dashboard/my-orders" className="block">
                    <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-blue-500">
                        <div className="flex items-center gap-4">
                            <ClipboardList className="h-10 w-10 text-blue-500" />
                            <div>
                                <p className="font-semibold text-gray-900 text-lg">Mis Órdenes</p>
                                <p className="text-gray-500">Ver preventas asignadas</p>
                            </div>
                        </div>
                    </Card>
                </Link>
                <Link href="/dashboard/my-performance" className="block">
                    <Card className="p-6 hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-green-500">
                        <div className="flex items-center gap-4">
                            <TrendingUp className="h-10 w-10 text-green-500" />
                            <div>
                                <p className="font-semibold text-gray-900 text-lg">Mi Desempeño</p>
                                <p className="text-gray-500">Ver mi historial y métricas</p>
                            </div>
                        </div>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
