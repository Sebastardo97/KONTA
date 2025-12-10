'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useCartStore } from '@/store/cartStore'
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function POSPage() {
    const [products, setProducts] = useState<any[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [loading, setLoading] = useState(false)
    const [processing, setProcessing] = useState(false)

    const { items, addItem, removeItem, updateQuantity, total, clearCart } = useCartStore()

    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [customerSearch, setCustomerSearch] = useState('')
    const [showCustomerList, setShowCustomerList] = useState(false)

    useEffect(() => {
        fetchProducts()
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        const { data } = await supabase
            .from('customers')
            .select('*')
            .order('name')
            .limit(10)

        if (data) {
            setCustomers(data)
            // Try to set 'Cliente General' as default if exists, else first one
            const general = data.find(c => c.name === 'Cliente General' || c.nit_cedula === '222222222222')
            setSelectedCustomer(general || data[0])
        }
    }

    const searchCustomers = async (term: string) => {
        setCustomerSearch(term)
        setShowCustomerList(true)
        if (term.length > 1) {
            const { data } = await supabase
                .from('customers')
                .select('*')
                .or(`name.ilike.%${term}%,nit_cedula.ilike.%${term}%`)
                .limit(5)
            if (data) setCustomers(data)
        } else {
            fetchCustomers() // Reset to default list
        }
    }

    const selectCustomer = (customer: any) => {
        setSelectedCustomer(customer)
        setCustomerSearch('')
        setShowCustomerList(false)
    }

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').limit(50)
        if (data) setProducts(data)
    }

    const handleSearch = async (term: string) => {
        setSearchTerm(term)
        if (term.length > 2) {
            const { data } = await supabase
                .from('products')
                .select('*')
                .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
                .limit(10)
            if (data) setProducts(data)
        } else if (term.length === 0) {
            fetchProducts()
        }
    }

    const handleCheckout = async () => {
        if (items.length === 0) return
        setProcessing(true)

        try {
            // 1. Create Invoice
            const { data: user } = await supabase.auth.getUser()
            if (!user.user) throw new Error('No user logged in')

            if (!selectedCustomer) {
                alert('Por favor selecciona un cliente')
                setProcessing(false)
                return
            }

            const { data: invoice, error: invoiceError } = await supabase
                .from('invoices')
                .insert({
                    seller_id: user.user.id,
                    customer_id: selectedCustomer.id,
                    total: total(),
                    status: 'paid'
                })
                .select()
                .single()

            if (invoiceError) throw invoiceError

            // 2. Create Invoice Items
            const invoiceItems = items.map(item => ({
                invoice_id: invoice.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.price,
                total: item.price * item.quantity
            }))

            const { error: itemsError } = await supabase
                .from('invoice_items')
                .insert(invoiceItems)

            if (itemsError) throw itemsError

            // 3. Update Stock
            for (const item of items) {
                await supabase.rpc('decrement_stock', {
                    row_id: item.productId,
                    quantity: item.quantity
                })
            }

            alert('¡Venta realizada con éxito!')
            clearCart()
            fetchProducts()
        } catch (error: any) {
            console.error('Checkout error:', error)
            alert('Error al procesar la venta: ' + error.message)
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="flex h-[calc(100vh-6rem)] gap-6">
            {/* Left: Product Catalog */}
            <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg leading-5 bg-gray-50 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            placeholder="Buscar productos..."
                            value={searchTerm}
                            onChange={(e) => handleSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map((product) => (
                            <button
                                key={product.id}
                                onClick={() => addItem(product)}
                                className="flex flex-col items-start p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:shadow-md transition-all text-left group bg-white"
                            >
                                <div className="w-full h-24 bg-gray-100 rounded-md mb-3 flex items-center justify-center text-gray-400 group-hover:text-blue-500 transition-colors">
                                    <ShoppingCart className="h-8 w-8" />
                                </div>
                                <h3 className="font-medium text-gray-900 line-clamp-2">{product.name}</h3>
                                <p className="text-sm text-gray-500 mb-2">{product.sku}</p>
                                <div className="mt-auto flex justify-between w-full items-center">
                                    <span className="font-bold text-lg text-blue-600">${product.price.toLocaleString()}</span>
                                    <span className={cn("text-xs px-2 py-1 rounded-full", product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800")}>
                                        {product.stock}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Right: Cart */}
            <div className="w-96 bg-white rounded-xl shadow-lg border border-gray-200 flex flex-col">
                <div className="p-4 border-b border-gray-200 bg-gray-50 rounded-t-xl">
                    <h2 className="text-lg font-bold text-gray-900 flex items-center">
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Carrito de Compras
                    </h2>
                </div>

                {/* Customer Selector */}
                <div className="p-4 bg-white border-b border-gray-100 relative">
                    <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">
                        Cliente Asignado
                    </label>
                    <div className="relative">
                        <div
                            className="flex items-center justify-between w-full p-2 border border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer bg-gray-50"
                            onClick={() => setShowCustomerList(!showCustomerList)}
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Users className="w-4 h-4 text-gray-500" />
                                <div className="flex flex-col items-start truncate">
                                    <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                                        {selectedCustomer ? selectedCustomer.name : 'Seleccionar Cliente'}
                                    </span>
                                    {selectedCustomer && (
                                        <span className="text-[10px] text-gray-500">{selectedCustomer.nit_cedula}</span>
                                    )}
                                </div>
                            </div>
                            <span className="text-blue-600 text-xs font-bold">Cambiar</span>
                        </div>

                        {/* Dropdown */}
                        {showCustomerList && (
                            <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-xl z-20 max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
                                <div className="p-2 sticky top-0 bg-white border-b border-gray-100">
                                    <input
                                        type="text"
                                        placeholder="Buscar nombre o cédula..."
                                        className="w-full text-sm p-2 border border-gray-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        value={customerSearch}
                                        onChange={(e) => searchCustomers(e.target.value)}
                                        autoFocus
                                    />
                                </div>
                                <div className="py-1">
                                    {customers.map(c => (
                                        <div
                                            key={c.id}
                                            onClick={() => selectCustomer(c)}
                                            className="px-3 py-2 hover:bg-blue-50 cursor-pointer transition-colors"
                                        >
                                            <p className="text-sm font-medium text-gray-900">{c.name}</p>
                                            <p className="text-xs text-gray-500">{c.nit_cedula}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {items.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-gray-400">
                            <ShoppingCart className="h-12 w-12 mb-2 opacity-20" />
                            <p>El carrito está vacío</p>
                        </div>
                    ) : (
                        items.map((item) => (
                            <div key={item.productId} className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                                <div className="flex-1">
                                    <h4 className="font-medium text-gray-900 text-sm">{item.name}</h4>
                                    <p className="text-blue-600 font-bold text-sm">${(item.price * item.quantity).toLocaleString()}</p>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                                        className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
                                    >
                                        <Minus className="h-4 w-4" />
                                    </button>
                                    <span className="w-8 text-center font-medium text-sm">{item.quantity}</span>
                                    <button
                                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                                        className="p-1 rounded-full hover:bg-gray-200 text-gray-600"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={() => removeItem(item.productId)}
                                        className="p-1 rounded-full hover:bg-red-100 text-red-500 ml-2"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 bg-gray-50 rounded-b-xl space-y-4">
                    <div className="space-y-2">
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Subtotal</span>
                            <span>${total().toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                            <span>Impuestos (Aprox 19%)</span>
                            <span>${(total() * 0.19).toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-200">
                            <span>Total</span>
                            <span>${(total() * 1.19).toLocaleString()}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleCheckout}
                        disabled={items.length === 0 || processing}
                        className="w-full flex items-center justify-center py-4 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                        {processing ? (
                            <span className="flex items-center">
                                Procesando...
                            </span>
                        ) : (
                            <span className="flex items-center">
                                <CreditCard className="h-6 w-6 mr-2" />
                                Cobrar ${(total() * 1.19).toLocaleString()}
                            </span>
                        )}
                    </button>
                </div>
            </div>
        </div>
    )
}
