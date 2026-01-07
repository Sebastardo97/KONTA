'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ClipboardList, Plus, Loader2, Eye, CheckCircle } from 'lucide-react'
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
    assigned_to_user: { full_name: string } | null
    created_by_user: { full_name: string } | null
}

import { useRouter } from 'next/navigation'

export default function SalesOrdersPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<SalesOrder[]>([])
    const [loading, setLoading] = useState(true)
    const { isAdmin, isSeller } = useRole()

    useEffect(() => {
        // Now sellers can see all orders too
        fetchOrders()
    }, [isSeller])

    const fetchOrders = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('sales_orders')
                .select(`
                    *,
                    customer:customers(name)
                `)
                .order('created_at', { ascending: false })

            if (error) throw error
            setOrders(data || [])
        } catch (error) {
            console.error('Error fetching sales orders:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800'
            case 'assigned': return 'bg-blue-100 text-blue-800'
            case 'completed': return 'bg-green-100 text-green-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'Pendiente'
            case 'assigned': return 'Asignada'
            case 'completed': return 'Completada'
            case 'cancelled': return 'Cancelada'
            default: return status
        }
    }

    if (!isAdmin && !isSeller) {
        return (
            <div className="p-8 text-center">
                <p className="text-red-600">No tienes permisos para ver esta página</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Órdenes de Venta (Preventas)</h1>
                    <p className="text-sm text-gray-500 mt-1">Crea preventas para que los vendedores las ejecuten</p>
                </div>
                <Link
                    href="/dashboard/sales-orders/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-medium"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Orden de Venta
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-gray-500">Cargando órdenes...</p>
                    </div>
                ) : orders.length === 0 ? (
                    <div className="p-12 text-center">
                        <ClipboardList className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No hay órdenes de venta</h3>
                        <p className="mt-1 text-gray-500">Crea tu primera preventa para asignar a vendedores</p>
                        <Link
                            href="/dashboard/sales-orders/new"
                            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Crear Orden
                        </Link>
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
                                    Asignado a
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo Factura
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
                                            {order.assigned_to_user?.full_name || 'Sin asignar'}
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
                                            href={`/dashboard/sales-orders/detail?id=${order.id}`}
                                            className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                                        >
                                            <Eye className="h-4 w-4 mr-1" />
                                            Ver
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
