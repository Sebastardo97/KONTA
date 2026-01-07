'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, FileText, Calendar, DollarSign, Wallet, ArrowUpRight, TrendingDown } from 'lucide-react'
import Link from 'next/link'

export default function ExpensesPage() {
    const [expenses, setExpenses] = useState<any[]>([])
    const [viaticosStats, setViaticosStats] = useState<any[]>([])
    const [generalStats, setGeneralStats] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchExpenses()
        fetchStats()
    }, [])

    const fetchExpenses = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('expenses')
            .select(`
                *,
                profiles:user_id (full_name)
            `)
            .order('date', { ascending: false })
            .limit(50)

        if (data) setExpenses(data)
        setLoading(false)
    }

    const fetchStats = async () => {
        // Fetch Viaticos Stats
        const { data: viaticos } = await supabase.from('monthly_seller_viaticos').select('*').limit(5)
        if (viaticos) setViaticosStats(viaticos)

        // Fetch General Stats
        const { data: general } = await supabase.from('monthly_general_expenses').select('*').limit(5)
        if (general) setGeneralStats(general)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Wallet className="h-6 w-6 text-purple-600" />
                        Control de Gastos
                    </h1>
                    <p className="text-gray-500">Gestiona viáticos y gastos operativos (No inventario)</p>
                </div>
                <Link
                    href="/dashboard/expenses/new"
                    className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Registrar Gasto
                </Link>
            </div>

            {/* Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Viaticos Summary Card */}
                <div className="glass-card p-4 rounded-xl border border-gray-100 bg-white">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-orange-500" />
                        Viáticos del Mes (Top Vendedores)
                    </h3>
                    <div className="space-y-3">
                        {viaticosStats.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No hay datos de viáticos aún</p>
                        ) : (
                            viaticosStats.map((stat, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="font-medium text-gray-800">{stat.seller_name}</span>
                                        <span className="text-xs text-gray-500">{stat.month}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 bg-orange-50 px-2 py-1 rounded text-xs border border-orange-100">
                                        ${stat.total_viaticos.toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* General Expenses Summary Card */}
                <div className="glass-card p-4 rounded-xl border border-gray-100 bg-white">
                    <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <ArrowUpRight className="h-4 w-4 text-blue-500" />
                        Gastos por Categoría (Mes Actual)
                    </h3>
                    <div className="space-y-3">
                        {generalStats.length === 0 ? (
                            <p className="text-sm text-gray-400 italic">No hay gastos registrados aún</p>
                        ) : (
                            generalStats.map((stat, idx) => (
                                <div key={idx} className="flex justify-between items-center text-sm">
                                    <div className="flex flex-col">
                                        <span className="capitalize font-medium text-gray-800">{stat.category}</span>
                                        <span className="text-xs text-gray-500">{stat.month}</span>
                                    </div>
                                    <span className="font-bold text-gray-900 bg-blue-50 px-2 py-1 rounded text-xs border border-blue-100">
                                        ${stat.total_amount.toLocaleString()}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50">
                    <h2 className="font-semibold text-gray-700">Historial de Gastos</h2>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Categoría</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Descripción</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Responsable</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Monto</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando gastos...</td>
                                </tr>
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No hay gastos registrados
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(expense.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize border ${expense.category === 'viaticos'
                                                    ? 'bg-orange-100 text-orange-800 border-orange-200'
                                                    : 'bg-gray-100 text-gray-800 border-gray-200'
                                                }`}>
                                                {expense.category}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-900 font-medium">
                                            {expense.description || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">
                                            {expense.profiles?.full_name || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${expense.amount.toLocaleString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
