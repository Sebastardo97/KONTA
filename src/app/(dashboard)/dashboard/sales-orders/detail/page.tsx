'use client'

import { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/hooks/useRole'
import {
    ArrowLeft,
    CheckCircle,
    XCircle,
    User,
    Calendar,
    Package,
    DollarSign,
    FileText,
    AlertCircle
} from 'lucide-react'

type SalesOrder = {
    id: string
    customer: any
    seller: any
    created_by_user?: any
    created_by?: string
    total: number
    status: string
    notes: string | null
    created_at: string
    updated_at: string
    executed_invoice_id: string | null
}

type OrderItem = {
    id: string
    product: any
    quantity: number
    unit_price: number
    discount_percentage: number
    total: number
}

function SalesOrderDetailContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const { isAdmin, userId } = useRole()
    const orderId = searchParams.get('id')

    const [order, setOrder] = useState<SalesOrder | null>(null)
    const [items, setItems] = useState<OrderItem[]>([])
    const [loading, setLoading] = useState(true)
    const [executing, setExecuting] = useState(false)

    useEffect(() => {
        if (orderId) {
            fetchOrderDetails()
        }
    }, [orderId])

    const fetchOrderDetails = async () => {
        try {
            let finalOrder = null;

            const { data: orderData, error: orderError } = await supabase
                .from('sales_orders')
                .select(`
                    *,
                    customer:customers(*),
                    seller:profiles!sales_orders_assigned_to_profiles_fkey(*)
                `)
                .eq('id', orderId)
                .single()

            if (orderError) {
                console.warn('Primary fetch failed, trying fallback...', orderError);
                const { data: fallbackOrder, error: fallbackError } = await supabase
                    .from('sales_orders')
                    .select(`*, customer:customers(*)`)
                    .eq('id', orderId)
                    .single()

                if (fallbackError) throw orderError

                if (fallbackOrder.assigned_to) {
                    const { data: sellerProfile } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', fallbackOrder.assigned_to)
                        .single();
                    (fallbackOrder as any).seller = sellerProfile
                }
                finalOrder = fallbackOrder;
            } else {
                finalOrder = orderData;
            }

            setOrder(finalOrder);

            if (finalOrder && finalOrder.created_by) {
                const { data: creatorProfile } = await supabase
                    .from('profiles')
                    .select('*')
                    .eq('id', finalOrder.created_by)
                    .single()

                if (creatorProfile) {
                    setOrder((prev: any) => ({ ...prev, created_by_user: creatorProfile }))
                }
            }

            const { data: itemsData, error: itemsError } = await supabase
                .from('sales_order_items')
                .select(`
                    *,
                    product:products(*)
                `)
                .eq('sales_order_id', orderId)

            if (itemsError) throw itemsError
            setItems(itemsData || [])

        } catch (error) {
            console.error('Error fetching order:', error)
            alert('Error al cargar la orden. Por favor intenta recargar.')
            router.push('/dashboard/sales-orders');
        } finally {
            setLoading(false)
        }
    }

    const executeOrder = async () => {
        if (!order) return

        const confirm = window.confirm(
            '¿Estás seguro de ejecutar esta preventa? Se creará una factura y se actualizará el inventario.'
        )
        if (!confirm) return

        setExecuting(true)
        try {
            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    customer_id: order.customer.id,
                    seller_id: order.seller.id,
                    invoice_type: 'POS',
                    total: order.total,
                    status: 'paid'
                })
                .select()
                .single()

            if (invoiceError) throw invoiceError

            const invoiceItems = items.map(item => ({
                invoice_id: invoice.id,
                product_id: item.product.id,
                quantity: item.quantity,
                unit_price: item.unit_price,
                discount_percentage: item.discount_percentage,
                total: item.total
            }))

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(invoiceItems)

            if (itemsError) throw itemsError

            for (const item of items) {
                await supabase.rpc('decrement_stock', {
                    row_id: item.product.id,
                    quantity: item.quantity
                })
            }

            const { error: updateError } = await supabase
                .from('sales_orders')
                .update({
                    status: 'completed',
                    executed_invoice_id: invoice.id
                })
                .eq('id', orderId)

            if (updateError) throw updateError

            alert('¡Preventa ejecutada exitosamente! Se ha creado la factura.')
            router.push('/dashboard/sales-orders')
        } catch (error: any) {
            console.error('Error executing order:', error)
            alert('Error al ejecutar la preventa: ' + error.message)
        } finally {
            setExecuting(false)
        }
    }

    const cancelOrder = async () => {
        if (!order) return

        const confirm = window.confirm(
            '¿Estás seguro de cancelar esta preventa? Esta acción no se puede deshacer.'
        )
        if (!confirm) return

        try {
            const { error } = await supabase
                .from('sales_orders')
                .update({ status: 'cancelled' })
                .eq('id', orderId)

            if (error) throw error

            alert('Preventa cancelada')
            router.push('/dashboard/sales-orders')
        } catch (error: any) {
            console.error('Error cancelling order:', error)
            alert('Error al cancelar: ' + error.message)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Cargando...</div>
            </div>
        )
    }

    if (!order) {
        return (
            <div className="flex flex-col items-center justify-center h-96 space-y-4">
                <AlertCircle className="h-12 w-12 text-gray-400" />
                <p className="text-gray-500">Preventa no encontrada</p>
                <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:underline"
                >
                    Volver
                </button>
            </div>
        )
    }

    const canExecute = order.status === 'pending' && (isAdmin || (order.seller && order.seller.id === userId))
    const canCancel = order.status === 'pending' && isAdmin

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Preventa #{order.id.slice(0, 8)}
                        </h1>
                        <p className="text-sm text-gray-600">
                            Creada el {new Date(order.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${order.status === 'pending' ? 'bg-amber-100 text-amber-800' :
                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                    }`}>
                    {order.status === 'pending' ? 'PENDIENTE' :
                        order.status === 'completed' ? 'EJECUTADA' :
                            'CANCELADA'}
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Customer */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700">Cliente</span>
                    </div>
                    <p className="font-medium">{order.customer?.name || 'Cliente desconocido'}</p>
                    <p className="text-sm text-gray-600">{order.customer?.nit_cedula || ''}</p>
                </div>

                {/* Seller */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-bold text-gray-700">Vendedor</span>
                    </div>
                    <p className="font-medium">{order.seller?.full_name || 'Sin asignar'}</p>
                    <p className="text-sm text-gray-600">{order.seller?.email || ''}</p>
                </div>

                {/* Creator - The source of our focus */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-900">Asignado Por</span>
                    </div>
                    <p className="font-medium text-blue-900">
                        {order.created_by_user?.full_name || 'Admin Sistema'}
                    </p>
                    <p className="text-sm text-blue-700">
                        {order.created_by_user?.email || ''}
                    </p>
                </div>
            </div>

            {/* Notes */}
            {order.notes && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                        <FileText className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-bold text-blue-900">Notas</span>
                    </div>
                    <p className="text-sm text-blue-800">{order.notes}</p>
                </div>
            )}

            {/* Items */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b flex items-center gap-2">
                    <Package className="h-5 w-5 text-gray-500" />
                    <h3 className="font-bold text-gray-900">Productos</h3>
                </div>
                <div className="p-4 space-y-3">
                    {items.map(item => (
                        <div key={item.id} className="flex justify-between items-start p-3 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                                <h4 className="font-medium">{item.product.name}</h4>
                                <p className="text-sm text-gray-600">
                                    ${item.unit_price.toLocaleString()} x {item.quantity}
                                    {item.discount_percentage > 0 && (
                                        <span className="text-green-600 ml-2">
                                            (-{item.discount_percentage}%)
                                        </span>
                                    )}
                                </p>
                            </div>
                            <div className="text-right">
                                <p className="font-bold text-blue-600">
                                    ${item.total.toLocaleString()}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Total */}
            <div className="bg-white p-6 rounded-lg border border-gray-200">
                <div className="flex justify-between items-center text-xl font-bold">
                    <span className="flex items-center gap-2">
                        <DollarSign className="h-6 w-6" />
                        Total
                    </span>
                    <span className="text-green-600">
                        ${order.total.toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Actions */}
            {order.status === 'pending' && (
                <div className="flex gap-3">
                    {canCancel && (
                        <button
                            onClick={cancelOrder}
                            className="flex-1 py-3 border border-red-300 text-red-600 rounded-lg font-medium hover:bg-red-50 flex items-center justify-center gap-2"
                        >
                            <XCircle className="h-5 w-5" />
                            Cancelar Preventa
                        </button>
                    )}
                    {canExecute && (
                        <button
                            onClick={executeOrder}
                            disabled={executing}
                            className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            <CheckCircle className="h-5 w-5" />
                            {executing ? 'Ejecutando...' : 'Ejecutar Preventa'}
                        </button>
                    )}
                </div>
            )}

            {order.status === 'completed' && order.executed_invoice_id && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                    <p className="text-green-800 font-medium">
                        ✓ Esta preventa fue ejecutada exitosamente
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                        Factura creada el {new Date(order.updated_at).toLocaleDateString()}
                    </p>
                </div>
            )}
        </div>
    )
}

export default function SalesOrderDetailPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center h-96">Cargando...</div>}>
            <SalesOrderDetailContent />
        </Suspense>
    )
}
