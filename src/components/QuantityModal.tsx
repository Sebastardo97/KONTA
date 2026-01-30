'use client'

import { useState, useEffect, useRef } from 'react'
import { X, ShoppingCart, Package } from 'lucide-react'

type QuantityModalProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: (quantity: number) => void
    product: {
        name: string
        code: string
        price: number
        stock: number
    } | null
}

export function QuantityModal({ isOpen, onClose, onConfirm, product }: QuantityModalProps) {
    const [quantity, setQuantity] = useState(1)
    const [error, setError] = useState('')
    const inputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (isOpen) {
            setQuantity(1)
            setError('')
            // Focus input after modal opens
            setTimeout(() => {
                inputRef.current?.focus()
                inputRef.current?.select()
            }, 100)
        }
    }, [isOpen])

    if (!isOpen || !product) return null

    const handleQuantityChange = (value: number) => {
        setError('')

        if (value < 1) {
            setError('La cantidad debe ser mayor a 0')
            setQuantity(1)
            return
        }

        if (value > product.stock) {
            setError(`Solo hay ${product.stock} unidades disponibles`)
            setQuantity(product.stock)
            return
        }

        setQuantity(value)
    }

    const handleConfirm = () => {
        if (quantity < 1) {
            setError('La cantidad debe ser mayor a 0')
            return
        }

        if (quantity > product.stock) {
            setError(`Solo hay ${product.stock} unidades disponibles`)
            return
        }

        onConfirm(quantity)
        onClose()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault()
            handleConfirm()
        } else if (e.key === 'Escape') {
            e.preventDefault()
            onClose()
        }
    }

    const setQuickQuantity = (value: number) => {
        handleQuantityChange(value)
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 animate-in fade-in duration-200">
            <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-100 p-2 rounded-lg">
                            <ShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">Cantidad a Vender</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                        <X className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Product Info */}
                <div className="p-6 bg-gray-50 border-b border-gray-200">
                    <div className="flex items-start gap-3">
                        <div className="bg-white p-3 rounded-lg border border-gray-200">
                            <Package className="h-6 w-6 text-gray-600" />
                        </div>
                        <div className="flex-1">
                            <h3 className="font-bold text-gray-900 text-lg mb-1">{product.name}</h3>
                            <div className="flex items-center gap-3 text-sm">
                                <span className="text-gray-500 font-mono">{product.code}</span>
                                <span className="text-blue-600 font-bold">${product.price.toLocaleString()}</span>
                            </div>
                            <div className="mt-2 flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${product.stock > 10
                                        ? 'bg-green-100 text-green-800'
                                        : product.stock > 0
                                            ? 'bg-amber-100 text-amber-800'
                                            : 'bg-red-100 text-red-800'
                                    }`}>
                                    Stock: {product.stock} unidades
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quantity Input */}
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">
                            ¿Cuántas unidades vas a vender?
                        </label>
                        <input
                            ref={inputRef}
                            type="number"
                            min="1"
                            max={product.stock}
                            value={quantity}
                            onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                            onKeyDown={handleKeyDown}
                            className="w-full px-4 py-3 text-2xl font-bold text-center border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                        {error && (
                            <p className="mt-2 text-sm text-red-600 font-medium">⚠️ {error}</p>
                        )}
                    </div>

                    {/* Quick Quantity Buttons */}
                    <div>
                        <p className="text-xs text-gray-500 mb-2 font-medium">Cantidades rápidas:</p>
                        <div className="grid grid-cols-5 gap-2">
                            {[1, 5, 10, 20, 50].map((qty) => (
                                <button
                                    key={qty}
                                    onClick={() => setQuickQuantity(qty)}
                                    disabled={qty > product.stock}
                                    className={`py-2 px-3 rounded-lg font-bold text-sm transition-all ${quantity === qty
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : qty > product.stock
                                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {qty}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Total Preview */}
                    <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex justify-between items-center">
                            <span className="text-sm font-medium text-gray-700">Total de esta línea:</span>
                            <span className="text-xl font-bold text-blue-600">
                                ${(product.price * quantity).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex gap-3 p-6 bg-gray-50 rounded-b-xl">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:bg-gray-100 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!!error || quantity < 1 || quantity > product.stock}
                        className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
                    >
                        Agregar al Carrito
                    </button>
                </div>

                {/* Keyboard Shortcuts Hint */}
                <div className="px-6 pb-4 text-center">
                    <p className="text-xs text-gray-400">
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono">Enter</kbd> para confirmar ·
                        <kbd className="px-2 py-1 bg-gray-100 rounded text-xs font-mono ml-1">Esc</kbd> para cancelar
                    </p>
                </div>
            </div>
        </div>
    )
}
