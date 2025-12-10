'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, FileText, Calendar, DollarSign, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'

export default function PurchasesPage() {
    const [purchases, setPurchases] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        fetchPurchases()
    }, [])

    const fetchPurchases = async () => {
        setLoading(true)
        const { data, error } = await supabase
            .from('purchases')
            .select(`
                *,
                suppliers (name)
            `)
            .order('date', { ascending: false })
            .limit(50)

        if (data) setPurchases(data)
        setLoading(false)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <ArrowUpRight className="h-6 w-6 text-red-600" />
                        Gastos y Compras
                    </h1>
                    <p className="text-gray-500">Registra tus gastos y reabastece inventario</p>
                </div>
                <Link
                    href="/dashboard/purchases/new"
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Compra
                </Link>
            </div>

            {/* Stats Cards (Simplified for now) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="glass-card p-4 rounded-xl flex items-center gap-4">
                    <div className="p-3 bg-red-100 rounded-lg text-red-600">
                        <DollarSign className="h-6 w-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500">Gastos del Mes</p>
                        <p className="text-xl font-bold text-gray-900">
                            ${purchases.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0).toLocaleString()}
                        </p>
                    </div>
                </div>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-gray-50 border-b border-gray-100">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-gray-700">Fecha</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Proveedor</th>
                                <th className="px-6 py-4 font-semibold text-gray-700">Obs.</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-right">Total</th>
                                <th className="px-6 py-4 font-semibold text-gray-700 text-center">Estado</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">Cargando compras...</td>
                                </tr>
                            ) : purchases.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        No hay compras registradas
                                    </td>
                                </tr>
                            ) : (
                                purchases.map((purchase) => (
                                    <tr key={purchase.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-gray-600">
                                            {new Date(purchase.date).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-gray-900">
                                            {purchase.suppliers?.name || 'Proveedor General'}
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 max-w-xs truncate">
                                            {purchase.notes || '-'}
                                        </td>
                                        <td className="px-6 py-4 text-right font-bold text-gray-900">
                                            ${purchase.total.toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                Completado
                                            </span>
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
