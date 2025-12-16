'use client'

import { X, AlertCircle, FileText, User, ShoppingCart } from 'lucide-react'
import { useEffect } from 'react'

interface InvoiceItem {
    productName: string
    quantity: number
    unitPrice: number
    discount: number
    total: number
}

interface InvoiceConfirmationModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    invoiceData: {
        customerName: string
        sellerName: string
        items: InvoiceItem[]
        subtotal: number
        total: number
        invoiceType: 'POS' | 'Normal'
    }
    loading?: boolean
}

export function InvoiceConfirmationModal({
    isOpen,
    onClose,
    onConfirm,
    invoiceData,
    loading = false
}: InvoiceConfirmationModalProps) {
    // Close on Escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !loading) onClose()
        }
        if (isOpen) {
            document.addEventListener('keydown', handleEscape)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleEscape)
            document.body.style.overflow = 'unset'
        }
    }, [isOpen, loading, onClose])

    if (!isOpen) return null

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('es-CO', {
            style: 'currency',
            currency: 'COP',
            minimumFractionDigits: 0
        }).format(amount)
    }

    const calculateIVA = () => {
        return invoiceData.total - invoiceData.subtotal
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="bg-white bg-opacity-20 p-2 rounded-lg">
                            <FileText className="h-6 w-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Confirmar Factura</h2>
                            <p className="text-blue-100 text-sm">
                                {invoiceData.invoiceType === 'POS' ? 'Factura POS Legal' : 'Factura Normal'}
                            </p>
                        </div>
                    </div>
                    {!loading && (
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Customer & Seller Info */}
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <User className="h-4 w-4" />
                                <span className="text-sm font-medium">Cliente</span>
                            </div>
                            <p className="font-semibold text-gray-900">{invoiceData.customerName}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center gap-2 text-gray-600 mb-2">
                                <User className="h-4 w-4" />
                                <span className="text-sm font-medium">Vendedor</span>
                            </div>
                            <p className="font-semibold text-gray-900">{invoiceData.sellerName}</p>
                        </div>
                    </div>

                    {/* Items */}
                    <div className="mb-6">
                        <div className="flex items-center gap-2 text-gray-700 mb-3">
                            <ShoppingCart className="h-5 w-5" />
                            <h3 className="font-semibold">Productos ({invoiceData.items.length})</h3>
                        </div>
                        <div className="border border-gray-200 rounded-lg overflow-hidden">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="text-left px-4 py-2 font-medium text-gray-600">Producto</th>
                                        <th className="text-center px-4 py-2 font-medium text-gray-600">Cant.</th>
                                        <th className="text-right px-4 py-2 font-medium text-gray-600">P. Unit.</th>
                                        <th className="text-right px-4 py-2 font-medium text-gray-600">Desc.</th>
                                        <th className="text-right px-4 py-2 font-medium text-gray-600">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {invoiceData.items.map((item, index) => (
                                        <tr key={index} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 font-medium text-gray-900">{item.productName}</td>
                                            <td className="px-4 py-3 text-center text-gray-700">{item.quantity}</td>
                                            <td className="px-4 py-3 text-right text-gray-700">{formatCurrency(item.unitPrice)}</td>
                                            <td className="px-4 py-3 text-right text-gray-500">{item.discount > 0 ? `${item.discount}%` : '-'}</td>
                                            <td className="px-4 py-3 text-right font-semibold text-gray-900">{formatCurrency(item.total)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Totals */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg p-5 mb-5">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Subtotal</span>
                                <span className="font-medium text-gray-900">{formatCurrency(invoiceData.subtotal)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">IVA (19%)</span>
                                <span className="font-medium text-gray-900">{formatCurrency(calculateIVA())}</span>
                            </div>
                            <div className="border-t border-gray-300 pt-2 mt-2">
                                <div className="flex justify-between items-center">
                                    <span className="text-lg font-bold text-gray-900">TOTAL</span>
                                    <span className="text-2xl font-bold text-blue-600">{formatCurrency(invoiceData.total)}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Warning */}
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-semibold text-amber-900 mb-1">¡Importante!</p>
                            <p className="text-amber-700">
                                Esta acción descontará el stock de los productos y creará una factura legal.
                                Asegúrate de que la información sea correcta antes de confirmar.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t border-gray-200">
                    <button
                        onClick={onClose}
                        disabled={loading}
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-blue-500/30"
                    >
                        {loading ? (
                            <span className="flex items-center justify-center gap-2">
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                Procesando...
                            </span>
                        ) : (
                            '✓ Confirmar Factura'
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
