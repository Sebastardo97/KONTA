'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DiscountInput } from '@/components/DiscountInput'
import { SellerSelect } from '@/components/SellerSelect'
import { Search, Trash2, Save, Users, UserCheck } from 'lucide-react'

type OrderItem = {
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    discount: number
}

export default function NewSalesOrderPage() {
    const router = useRouter()

    const [products, setProducts] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [selectedSeller, setSelectedSeller] = useState<string>('')
    const [items, setItems] = useState<OrderItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [customerSearch, setCustomerSearch] = useState('')
    const [loading, setLoading] = useState(false)
    const [showCustomerList, setShowCustomerList] = useState(false)
    const [notes, setNotes] = useState('')

    useEffect(() => {
        fetchProducts()
        fetchCustomers()
    }, [])

    const fetchProducts = async () => {
        const { data } = await supabase
            .from('products')
            .select('*')
            .order('name')
            .limit(50)
        if (data) setProducts(data)
    }

    const fetchCustomers = async () => {
        const { data } = await supabase
            .from('customers')
            .select('*')
            .order('name')
            .limit(10)
        if (data) {
            setCustomers(data)
            const general = data.find(c => c.name === 'Cliente General')
            setSelectedCustomer(general || data[0])
        }
    }

    const searchProducts = async (term: string) => {
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
            fetchCustomers()
        }
    }

    const addProduct = (product: any) => {
        const existing = items.find(i => i.productId === product.id)
        if (existing) {
            updateQuantity(product.id, existing.quantity + 1)
        } else {
            setItems([...items, {
                productId: product.id,
                productName: product.name,
                quantity: 1,
                unitPrice: product.price,
                discount: 0
            }])
        }
    }

    const updateQuantity = (productId: string, quantity: number) => {
        if (quantity <= 0) {
            setItems(items.filter(i => i.productId !== productId))
        } else {
            setItems(items.map(i =>
                i.productId === productId ? { ...i, quantity } : i
            ))
        }
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
        if (items.length === 0) {
            alert('Agrega al menos un producto')
            return
        }
        if (!selectedCustomer) {
            alert('Selecciona un cliente')
            return
        }
        if (!selectedSeller) {
            alert('Asigna un vendedor a esta preventa')
            return
        }

        setLoading(true)
        try {
            // 1. Create sales order
            const { data: order, error: orderError } = await supabase
                .from('sales_orders')
                .insert({
                    customer_id: selectedCustomer.id,
                    seller_id: selectedSeller,
                    total_amount: calculateTotal(),
                    status: 'pending',
                    notes: notes || null
                })
                .select()
                .single()

            if (orderError) throw orderError

            // 2. Create order items
            const orderItems = items.map(item => ({
                sales_order_id: order.id,
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount_percentage: item.discount,
                total: item.unitPrice * item.quantity * (1 - item.discount / 100)
            }))

            const { error: itemsError } = await supabase
                .from('sales_order_items')
                .insert(orderItems)

            if (itemsError) throw itemsError

            alert('¡Preventa creada exitosamente!')
            router.push('/dashboard/sales-orders')
        } catch (error: any) {
            console.error('Error creating sales order:', error)
            alert('Error al crear la preventa: ' + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Nueva Preventa</h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Crea una orden de venta para asignar a un vendedor
                    </p>
                </div>
                <div className="bg-amber-100 text-amber-800 px-4 py-2 rounded-lg font-semibold text-sm">
                    PREVENTA
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

                {/* Seller Assignment */}
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                    <SellerSelect
                        value={selectedSeller}
                        onChange={setSelectedSeller}
                        label="Asignar a Vendedor"
                    />
                    {selectedSeller && (
                        <p className="text-xs text-green-600 mt-2 flex items-center">
                            <UserCheck className="h-3 w-3 mr-1" />
                            Vendedor asignado
                        </p>
                    )}
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
                            <p className="text-blue-600 font-bold">${product.price.toLocaleString()}</p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Order Items */}
            <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-4 border-b">
                    <h3 className="font-bold text-gray-900">Productos en la Preventa</h3>
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

            {/* Notes */}
            <div className="bg-white p-4 rounded-lg border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                    Notas (Opcional)
                </label>
                <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Instrucciones especiales para el vendedor..."
                    className="w-full p-3 border border-gray-300 rounded-lg resize-none"
                    rows={3}
                />
            </div>

            {/* Total and Submit */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 space-y-4">
                <div className="flex justify-between text-xl font-bold">
                    <span>Total Estimado:</span>
                    <span className="text-amber-600">${calculateTotal().toLocaleString()}</span>
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
                        disabled={loading || items.length === 0 || !selectedSeller}
                        className="flex-1 py-3 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Save className="h-5 w-5" />
                        {loading ? 'Guardando...' : 'Crear Preventa'}
                    </button>
                </div>
            </div>
        </div>
    )
}
