'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Loader2, Eye, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { useRole } from '@/hooks/useRole'

type SalesOrder = {
    id: string
    number: number
    date: string
    total: number
    status: string
    invoice_type: string
    customer: { name: string } | null
    created_by_user: { full_name: string } | null
    notes: string | null
}

export default function MyOrdersPage() {
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [loading, setLoading] = useState(true)
    const { userId, isSeller } = useRole()

    useEffect(() => {
        if (userId) {
            fetchMyOrders()
        }
    }, [userId])

    const fetchMyOrders = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('sales_orders')
                .select(`
                    *,
                    customer:customers(name)
                `)
                .eq('assigned_to', userId)
                .in('status', ['pending', 'assigned'])
                .order('created_at', { ascending: false })

            if (error) throw error
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching my orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'assigned': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente'
            case 'assigned': return 'Asignada'
            default: return status
        }
    }

    if (!isSeller) {
        return (
            <div className="p-8 text-center">
                <AlertCircle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
                <p className="text-gray-600">Esta página es solo para vendedores</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Mis Órdenes de Venta</h1>
                    <p className="text-sm text-gray-500 mt-1">Órdenes asignadas a ti para ejecutar</p>
                </div>
            </div>

            {orders.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                        <p className="text-sm text-blue-800">
                            Tienes <strong>{orders.length}</strong> orden(es) pendiente(s) de ejecutar
                        </p>
                    </div>
                </div>
            )}

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-gray-500">Cargando órdenes...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No tienes órdenes pendientes</h3>
                        <p className="mt-1 text-gray-500">Cuando el administrador te asigne una orden, aparecerá aquí</p>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    # Orden
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Creada Por
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {orders.map((order) => (
                                <tr key={order.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">#{order.number}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(order.date).toLocaleDateString('es-CO')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{order.customer?.name || 'N/A'}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {order.created_by_user?.full_name || 'N/A'}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 py-1 text-xs rounded ${order.invoice_type === 'POS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                                            {order.invoice_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            ${order.total.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}`}>
                                            {getStatusText(order.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link
                                            href={`/dashboard/sales-orders/${order.id}`}
                                            className="text-blue-600 hover:text-blue-900 inline-flex items-center font-medium"
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            Ver y Ejecutar
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
