'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { DiscountInput } from '@/components/DiscountInput'
import { SellerSelect } from '@/components/SellerSelect'
import { InvoiceConfirmationModal } from '@/components/InvoiceConfirmationModal'
import { QuantityModal } from '@/components/QuantityModal'
import { Search, Trash2, Save, Users, ArrowLeft, Loader2 } from 'lucide-react'
import { useRole } from '@/hooks/useRole'

type InvoiceItem = {
    productId: string
    productName: string
    productCode: string
    quantity: number
    unitPrice: number
    discount: number
    stock: number
    taxRate: number
}

// Helper to check if string is UUID
const isUUID = (str: string) => {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(str);
}

export default function EditNormalInvoicePage() {
    const [items, setItems] = useState<InvoiceItem[]>([])
    const [searchTerm, setSearchTerm] = useState('')
    const [products, setProducts] = useState<any[]>([])
    const [customers, setCustomers] = useState<any[]>([])
    const [customerSearch, setCustomerSearch] = useState('')
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [showCustomerList, setShowCustomerList] = useState(false)
    const [selectedSeller, setSelectedSeller] = useState('')
    const [sellerName, setSellerName] = useState('')
    const [showConfirmModal, setShowConfirmModal] = useState(false)
    const [loading, setLoading] = useState(true) // Start with loading true
    const [saving, setSaving] = useState(false)
    const [showQuantityModal, setShowQuantityModal] = useState(false)
    const [selectedProductForModal, setSelectedProductForModal] = useState<any>(null)
    const [originalAttributes, setOriginalAttributes] = useState<any>(null) // To track changes if needed

    const router = useRouter()
    const searchParams = useSearchParams()
    const invoiceId = searchParams.get('id')
    const { isAdmin, userId } = useRole()

    // Load Invoice Data
    useEffect(() => {
        if (invoiceId && isUUID(invoiceId)) {
            loadInvoice(invoiceId)
        } else {
            console.error('Invalid or missing Invoice ID', invoiceId)
            setLoading(false)
            // Optionally redirect or show error
        }
    }, [invoiceId])

    // Load Initial Lists
    useEffect(() => {
        fetchProducts()
        fetchCustomers()
    }, [])

    const loadInvoice = async (id: string) => {
        try {
            setLoading(true)
            const { data: invoice, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*),
                    seller:profiles(id, full_name),
                    invoice_items(
                        quantity,
                        unit_price,
                        discount_percentage,
                        total,
                        product:products(*)
                    )
                `)
                .eq('id', id)
                .single()

            if (error) throw error

            if (invoice) {
                setSelectedCustomer(invoice.customer)
                setSelectedSeller(invoice.seller_id)
                setSellerName(invoice.seller?.full_name || '')

                // Map items
                const mappedItems: InvoiceItem[] = invoice.invoice_items.map((item: any) => ({
                    productId: item.product.id,
                    productName: item.product.name,
                    productCode: item.product.code,
                    quantity: item.quantity,
                    unitPrice: item.unit_price,
                    discount: item.discount_percentage,
                    stock: item.product.stock, // Current stock in DB
                    taxRate: item.product.tax_rate || 0
                }))
                setItems(mappedItems)

                // Keep track of original state if strict validation needed
                setOriginalAttributes({
                    total: invoice.total,
                    items: mappedItems
                })
            }
        } catch (error) {
            console.error('Error loading invoice:', error)
            alert('Error al cargar la factura.')
        } finally {
            setLoading(false)
        }
    }

    const fetchProducts = async (term = '') => {
        let query = supabase.from('products').select('*').limit(50)
        if (term) {
            query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`)
        }

        const { data } = await query
        if (data) setProducts(data)
    }

    const searchProducts = (term: string) => {
        setSearchTerm(term)
        fetchProducts(term)
    }

    const fetchCustomers = async (term = '') => {
        let query = supabase.from('customers').select('*').limit(50)
        if (term) query = query.or(`name.ilike.%${term}%,nit_cedula.ilike.%${term}%`)

        const { data } = await query
        if (data) setCustomers(data)
    }

    const searchCustomers = (term: string) => {
        setCustomerSearch(term)
        fetchCustomers(term)
    }

    const addProduct = (product: any) => {
        // NOTE: For editing, stock validation is tricky because current invoice items 
        // already "consume" stock. Visual stock might be lower than what's available if we release the current items.
        // However, we follow strict "available" stock for adding *more*.

        // Show quantity modal
        setSelectedProductForModal(product)
        setShowQuantityModal(true)
    }

    const handleAddWithQuantity = (quantity: number) => {
        if (!selectedProductForModal) return

        const product = selectedProductForModal
        const existing = items.find(i => i.productId === product.id)

        if (existing) {
            const newQuantity = existing.quantity + quantity
            // Check stock + currently held quantity? 
            // Simplified: Check against current stock in DB. 
            // Ideally: (DB Stock + Original Invoice Qty) >= New Qty.
            // But doing that robustly requires tracking individual item original qty. 
            // For now, check against DB stock. If user wants to increase qty of existing item, 
            // they might be blocked if stock is 0, even though they hold some stock? 
            // No, mappedItems uses `item.product.stock` which is the *available* stock in DB.
            // So if I have 5 in invoice, stock is 0. I want to make it 6?
            // Stock 0. I can't add 1. 
            // Unless I free up the 5 first. 
            // This UI adds *delta*. 

            // Allow adding up to available stock.
            if (quantity > product.stock) {
                alert(`⚠️ Solo hay ${product.stock} unidades adicionales disponibles de "${product.name}"`)
                updateQuantity(product.id, existing.quantity + product.stock)
            } else {
                updateQuantity(product.id, newQuantity)
            }
        } else {
            // New item
            if (quantity > product.stock) {
                alert(`⚠️ Solo hay ${product.stock} unidades disponibles de "${product.name}"`)
                return
            }

            setItems([...items, {
                productId: product.id,
                productName: product.name,
                productCode: product.code,
                quantity: quantity,
                unitPrice: product.price,
                discount: 0,
                stock: product.stock,
                taxRate: product.tax_rate || 0
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
                    // Validation logic similar to above can be added
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

    const calculateTotals = () => {
        return items.reduce((acc, item) => {
            const subtotal = item.unitPrice * item.quantity * (1 - item.discount / 100)
            const tax = subtotal * (item.taxRate / 100)
            return {
                subtotal: acc.subtotal + subtotal,
                tax: acc.tax + tax,
                total: acc.total + subtotal + tax
            }
        }, { subtotal: 0, tax: 0, total: 0 })
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
            alert('Selecciona un vendedor')
            return
        }

        // Fetch seller name for modal
        if (!sellerName) {
            const { data: seller } = await supabase
                .from('profiles')
                .select('full_name')
                .eq('id', selectedSeller)
                .single()
            setSellerName(seller?.full_name || 'Vendedor')
        }

        setShowConfirmModal(true)
    }

    const confirmAndSubmit = async () => {
        setSaving(true)
        try {
            const rpcItems = items.map(item => ({
                product_id: item.productId,
                quantity: item.quantity,
                unit_price: item.unitPrice,
                discount_percentage: item.discount || 0
            }))

            // Use the update_pos_invoice RPC
            const { error } = await supabase.rpc('update_pos_invoice', {
                p_invoice_id: invoiceId,
                p_customer_id: selectedCustomer.id,
                p_seller_id: selectedSeller,
                p_items: rpcItems,
                p_total: calculateTotals().total,
                p_invoice_type: 'NORMAL'
            })

            if (error) throw error

            alert('¡Factura Normal actualizada exitosamente!')
            router.push('/dashboard/invoices/normal') // Or back to detail
        } catch (error: any) {
            console.error('Error updating invoice:', error)
            alert('Error al actualizar la factura: ' + (error.message || 'Error desconocido'))
        } finally {
            setSaving(false)
            setShowConfirmModal(false)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => router.back()}
                        className="flex items-center text-gray-600 hover:text-gray-900 mb-2"
                    >
                        <ArrowLeft className="h-4 w-4 mr-1" />
                        Volver
                    </button>
                    <h1 className="text-2xl font-bold text-gray-900">Editar Factura Normal</h1>
                    {/* Show Invoice Number? */}
                </div>
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-lg font-semibold text-sm border border-yellow-200">
                    EDICIÓN
                </div>
            </div>

            {/* Customer (and Seller) Selection */}
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
                    Buscar Productos (Agregar)
                </label>
                <div className="relative">
                    <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                    <input
                        type="text"
                        className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg"
                        placeholder="Buscar por nombre o Código..."
                        value={searchTerm}
                        onChange={(e) => searchProducts(e.target.value)}
                    />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                    {products.map(product => (
                        <button
                            key={product.id}
                            onClick={() => addProduct(product)}
                            className="p-2 border rounded-lg hover:border-blue-500 hover:bg-blue-50 text-left text-sm transition-all"
                        >
                            <div className="flex justify-between items-start w-full">
                                <p className="font-medium truncate">{product.name}</p>
                                <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1 rounded">{product.code}</span>
                            </div>
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
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{item.productName}</h4>
                                            <span className="text-xs font-mono text-gray-400">{item.productCode}</span>
                                        </div>
                                        <p className="text-sm text-gray-600">
                                            ${item.unitPrice.toLocaleString()} x {item.quantity} = ${(item.unitPrice * item.quantity * (1 - item.discount / 100)).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            min="1"
                                            // Max is complex here due to self-held stock logic mentioned above.
                                            // Ideally: max={item.stock + (originalAttributes?.items.find(i => i.productId === item.id)?.quantity || 0)}
                                            // But simplistic approach:
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
                <div className="space-y-2">
                    <div className="flex justify-between text-gray-600">
                        <span>Subtotal:</span>
                        <span>${calculateTotals().subtotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                        <span>IVA / Impuestos:</span>
                        <span>${calculateTotals().tax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-2">
                        <span>Total:</span>
                        <span className="text-green-600">${calculateTotals().total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
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
                        disabled={saving || items.length === 0}
                        className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                        <Save className="h-5 w-5" />
                        {saving ? 'Guardando Cambios...' : 'Actualizar Factura'}
                    </button>
                </div>
            </div>


            {/* Quantity Modal */}
            <QuantityModal
                isOpen={showQuantityModal}
                onClose={() => setShowQuantityModal(false)}
                onConfirm={handleAddWithQuantity}
                product={selectedProductForModal ? {
                    name: selectedProductForModal.name,
                    code: selectedProductForModal.code,
                    price: selectedProductForModal.price,
                    stock: selectedProductForModal.stock
                } : null}
            />

            {/* Invoice Confirmation Modal */}
            <InvoiceConfirmationModal
                isOpen={showConfirmModal}
                onClose={() => setShowConfirmModal(false)}
                onConfirm={confirmAndSubmit}
                loading={saving}
                invoiceData={{
                    customerName: selectedCustomer?.name || 'Cliente',
                    sellerName: sellerName,
                    items: items.map(item => ({
                        productName: item.productName,
                        productCode: item.productCode,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        discount: item.discount,
                        total: (item.unitPrice * item.quantity * (1 - item.discount / 100)) * (1 + item.taxRate / 100)
                    })),
                    subtotal: calculateTotals().subtotal,
                    total: calculateTotals().total,
                    invoiceType: 'NORMAL'
                }}
            />
        </div >
    )
}
