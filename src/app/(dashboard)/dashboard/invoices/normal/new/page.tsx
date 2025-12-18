'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DiscountInput } from '@/components/DiscountInput'
import { SellerSelect } from '@/components/SellerSelect'
import { InvoiceConfirmationModal } from '@/components/InvoiceConfirmationModal'
import { Search, Plus, Trash2, Save, Users } from 'lucide-react'
import { useRole } from '@/hooks/useRole'

type InvoiceItem = {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    discount: number
    stock: number // [NEW] Added for validation
}

export default function NewNormalInvoicePage() {
    // ... existing code ...

    const addProduct = (product: any) => {
        // VALIDATION: Check stock before adding
        if (!product.stock || product.stock <= 0) {
            alert(`❌ "${product.name}" está agotado. No hay unidades disponibles.`)
            return
        }

        const existing = items.find(i => i.productId === product.id)
        if (existing) {
            // Check if adding one more would exceed stock
            if (existing.quantity + 1 > product.stock) {
                alert(`⚠️ Solo hay ${product.stock} unidades disponibles de "${product.name}"`)
                return
            }
            updateQuantity(product.id, existing.quantity + 1)
        } else {
            setItems([...items, {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price,
                discount: 0,
                stock: product.stock // Store stock limit
            }])
        }
    }

    const updateQuantity = (productId: string, quantity: number) => {
        setItems(currentItems => {
            if (quantity <= 0) {
                return currentItems.filter(i => i.productId !== productId)
            }

            return currentItems.map(i => {
                if (i.productId === productId) {
                    const currentStock = Number(i.stock ?? 0)

                    // VALIDATION on update (Strict Check)
                    if (quantity > currentStock) {
                        // Alert AFTER render to avoid confusing UI state
                        setTimeout(() => {
                            alert(`⚠️ Solo hay ${currentStock} unidades disponibles de "${i.productName}"`)
                        }, 0)
                        return { ...i, quantity: currentStock } // Clamp to max stock
                    }
                    return { ...i, quantity }
                }
                return i
            })
        })
    }

    const updateDiscount = (productId: string, discount: number) => {
        setItems(items.map(i =>
            i.productId === productId ? { ...i, discount } : i
        ))
    }

    const removeItem = (productId: string) => {
        setItems(items.filter(i => i.productId !== productId))
    }

    const calculateTotal = () => {
        return items.reduce((acc, item) => {
            const discountedPrice = item.unitPrice * (1 - item.discount / 100)
            return acc + (discountedPrice * item.quantity)
        }, 0)
    }

    const handleSubmit = async () => {
        // Validation only - don't submit yet
        if (items.length === 0) {
            alert('Agrega al menos un producto')
            return
        }
        if (!selectedCustomer) {
            alert('Selecciona un cliente')
            return
        }
        if (!selectedSeller) {
            alert('Selecciona un vendedor')
            return
        }

        // Fetch seller name for modal display
        const { data: seller } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', selectedSeller)
            .single()

        setSellerName(seller?.full_name || 'Vendedor')
        setShowConfirmModal(true)
    }

    const confirmAndSubmit = async () => {
        setLoading(true)
        try {
            // Prepare items payload for RPC
            const rpcItems = items.map(item => ({
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount_percentage: item.discount || 0
            }))

            // Call atomic transaction function
            const { data: invoiceId, error } = await supabase.rpc('create_pos_invoice', {
                p_customer_id: selectedCustomer.id,
                p_seller_id: selectedSeller,
                p_items: rpcItems,
                p_total: calculateTotal(),
                p_invoice_type: 'NORMAL'
            })

            if (error) throw error

            alert('¡Factura Normal creada exitosamente!')
            router.push('/dashboard/invoices/normal')
        } catch (error: any) {
            console.error('Error creating invoice:', error)
            alert('Error al crear la factura: ' + (error.message || 'Error desconocido'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Factura Normal</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Factura interna - No reporta a DIAN
                    </p>
                </div>
                <div className="bg-gray-100 text-gray-800 px-4 py-2 rounded-lg font-semibold text-sm">
                    FACTURA INTERNA
                </div>
            </div>

            {/* Customer and Seller Selection */}
            <div className="grid grid-cols-2 gap-4">
                {/* Customer */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <label className="block text-sm font-bold text-gray-700 mb-2">
                        <Users className="inline h-4 w-4 mr-1" />
                        Cliente
                    </label>
                    <div className="relative">
                        <div
                            className="flex items-center justify-between p-2 border rounded-lg cursor-pointer hover:border-blue-400"
                            onClick={() => setShowCustomerList(!showCustomerList)}
                        >
                            <div>
                                <p className="font-medium">{selectedCustomer?.name || 'Seleccionar'}</p>
                                {selectedCustomer && (
                                    <p className="text-xs text-gray-500">{selectedCustomer.nit_cedula}</p>
                                )}
                            </div>
                            <span className="text-blue-600 text-xs font-bold">Cambiar</span>
                        </div>
                        {showCustomerList && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto">
                                <div className="p-2 sticky top-0 bg-white border-b">
                                    <input
                                        type="text"
                                        placeholder="Buscar..."
                                        className="w-full p-2 border rounded-md text-sm"
                                        value={customerSearch}
                                        onChange={(e) => searchCustomers(e.target.value)}
                                    />
                                </div>
                                {customers.map(c => (
                                    <div
                                        key={c.id}
                                        onClick={() => {
                                            setSelectedCustomer(c)
                                            setShowCustomerList(false)
                                            setCustomerSearch('')
                                        }}
                                        className="px-3 py-2 hover:bg-blue-50 cursor-pointer"
                                    >
                                        <p className="font-medium text-sm">{c.name}</p>
                                        <p className="text-xs text-gray-500">{c.nit_cedula}</p>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Seller */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <SellerSelect
                        value={selectedSeller}
                        onChange={(sellerId) => setSelectedSeller(sellerId || '')}
                        disabled={!isAdmin}
                        label="Vendedor Asignado"
                    />
                </div>
            </div>

            {/* Product Search */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Buscar Productos
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Buscar por nombre o SKU..."
                        value={searchTerm}
                        onChange={(e) => searchProducts(e.target.value)}
                    />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {products.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="p-2 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left text-sm"
                        >
                            <p className="font-medium truncate">{product.name}</p>
                            <div className="flex justify-between items-center w-full mt-1">
                                <p className="text-blue-600 font-bold">${product.price.toLocaleString()}</p>
                                <span className={`text-xs px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                    {product.stock} und
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Invoice Items */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">Productos en la Factura</h3>
                </div>
                <div className="p-4 space-y-3">
                    {items.length === 0 ? (
                        <p className="text-center text-gray-500 py-8">
                            No hay productos agregados
                        </p>
                    ) : (
                        items.map(item => (
                            <div key={item.productId} className="border rounded-lg p-3 space-y-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <h4 className="font-medium">{item.productName}</h4>
                                        <p className="text-sm text-gray-600">
                                            ${item.unitPrice.toLocaleString()} x {item.quantity} = ${(item.unitPrice * item.quantity * (1 - item.discount / 100)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            max={item.stock}
                                            value={item.quantity}
                                            onChange={(e) => updateQuantity(item.productId, parseInt(e.target.value) || 1)}
                                            className="w-20 px-2 py-1 border rounded text-center"
                                        />
                                        <button
                                            onClick={() => removeItem(item.productId)}
                                            className="p-1 text-red-500 hover:bg-red-50 rounded"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                                <DiscountInput
                                    value={item.discount}
                                    unitPrice={item.unitPrice}
                                    quantity={item.quantity}
                                    onChange={(discount) => updateDiscount(item.productId, discount)}
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Total and Submit */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
                <div className="flex justify-between text-xl font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">${calculateTotal().toLocaleString()}</span>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => router.back()}
                        className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || items.length === 0}
                        className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Save className="h-5 w-5" />
                        {loading ? 'Guardando...' : 'Crear Factura Normal'}
                    </button>
                </div>
            </div>


            {/* Invoice Confirmation Modal */}
            <InvoiceConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmAndSubmit}
                loading={loading}
                invoiceData={{
                    customerName: selectedCustomer?.name || 'Cliente',
                    sellerName: sellerName,
                    items: items.map(item => ({
                        productName: item.productName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                        total: item.unitPrice * item.quantity * (1 - item.discount / 100)
                    })),
                    subtotal: items.reduce((acc, item) => {
                        const discountedPrice = item.unitPrice * (1 - item.discount / 100)
                        return acc + (discountedPrice * item.quantity)
                    }, 0),
                    total: calculateTotal(),
                    invoiceType: 'Normal'
                }}
            />
        </div >
    )
}
