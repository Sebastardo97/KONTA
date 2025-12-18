'use client'

import { useState } from 'react'
import { X, Loader2, AlertTriangle } from 'lucide-react'
import { processReturn, ReturnItem } from '@/lib/returns'
import { supabase } from '@/lib/supabase'

interface Product {
    id: string
    name: string
}

interface InvoiceItem {
    id: string
    product_id: string
    products: Product
    quantity: number
    unit_price: number
    total: number
}

interface ReturnModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
    invoiceId: string
    items: InvoiceItem[]
}

export default function ReturnModal({ isOpen, onClose, onSuccess, invoiceId, items }: ReturnModalProps) {
    const [returnItems, setReturnItems] = useState<{ [key: string]: number }>({})
    const [reason, setReason] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    if (!isOpen) return null

    const handleQuantityChange = (itemId: string, maxQty: number, value: string) => {
        const qty = parseInt(value) || 0
        if (qty < 0) return
        if (qty > maxQty) return

        setReturnItems(prev => ({
            ...prev,
            [itemId]: qty
        }))
    }

    const calculateTotalRefund = () => {
        let total = 0
        items.forEach(item => {
            const qty = returnItems[item.id] || 0
            total += qty * item.unit_price
        })
        return total
    }

    const handleSubmit = async () => {
        try {
            setLoading(true)
            setError(null)

            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('No authenticated user')

            const itemsToProcess: ReturnItem[] = items
                .filter(item => (returnItems[item.id] || 0) > 0)
                .map(item => ({
                    product_id: item.product_id,
                    quantity: returnItems[item.id],
                    unit_price: item.unit_price
                }))

            if (itemsToProcess.length === 0) {
                setError('Seleccione al menos un producto para devolver')
                return
            }

            if (!reason.trim()) {
                setError('Por favor ingrese una razón para la devolución')
                return
            }

            await processReturn(invoiceId, itemsToProcess, reason, user.id)
            onSuccess()
            onClose()

        } catch (err: any) {
            console.error(err)
            setError(err.message || 'Error processing return')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold">Procesar Devolución</h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
                            <X className="h-6 w-6" />
                        </button>
                    </div>

                    {error && (
                        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                            <div className="flex">
                                <div className="flex-shrink-0">
                                    <AlertTriangle className="h-5 w-5 text-red-400" />
                                </div>
                                <div className="ml-3">
                                    <p className="text-sm text-red-700">{error}</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div className="border rounded-lg overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Producto</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Comprado</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Devolver</th>
                                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Subtotal</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {items.map((item) => {
                                        const returnQty = returnItems[item.id] || 0
                                        return (
                                            <tr key={item.id}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.products?.name}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-right">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.quantity}
                                                        value={returnQty}
                                                        onChange={(e) => handleQuantityChange(item.id, item.quantity, e.target.value)}
                                                        className="w-20 border rounded px-2 py-1 text-right focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    />
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                                                    ${(returnQty * item.unit_price).toLocaleString()}
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Razón de la Devolución</label>
                            <textarea
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                className="w-full border rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                                rows={3}
                                placeholder="Ej: Producto defectuoso, Error en el pedido..."
                            />
                        </div>

                        <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg">
                            <span className="text-lg font-bold">Total a Reembolsar:</span>
                            <span className="text-2xl font-bold text-blue-600">${calculateTotalRefund().toLocaleString()}</span>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 border rounded-md hover:bg-gray-50"
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={loading || calculateTotalRefund() === 0}
                                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                            >
                                {loading && <Loader2 className="animate-spin h-4 w-4 mr-2" />}
                                Confirmar Devolución (Crear Nota Crédito)
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
