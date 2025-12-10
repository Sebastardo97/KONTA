'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Trash2, Save, ArrowLeft, Truck, Package } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewPurchasePage() {
    const router = useRouter()
    const [suppliers, setSuppliers] = useState<any[]>([])
    // Removed unused state 'products'
    const [selectedSupplier, setSelectedSupplier] = useState<string>('')
    const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split('T')[0])
    const [notes, setNotes] = useState('')

    // Cart for purchase
    const [items, setItems] = useState<any[]>([])
    const [productSearch, setProductSearch] = useState('')
    const [searchResults, setSearchResults] = useState<any[]>([])
    const [processing, setProcessing] = useState(false)

    useEffect(() => {
        const fetchInitialData = async () => {
            const { data: supps } = await supabase.from('suppliers').select('*').order('name')
            if (supps) setSuppliers(supps)
        }
        fetchInitialData()
    }, [])

    const searchProducts = async (term: string) => {
        setProductSearch(term)
        if (term.length > 2) {
            const { data } = await supabase
                .from('products')
                .select('*')
                .ilike('name', `%${term}%`)
                .limit(5)
            if (data) setSearchResults(data)
        } else {
            setSearchResults([])
        }
    }

    const addItem = (product: any) => {
        const existing = items.find(i => i.product_id === product.id)
        if (existing) {
            alert('El producto ya está en la lista')
            return
        }
        setItems([...items, {
            product_id: product.id,
            name: product.name,
            quantity: 1,
            unit_cost: 0, // User must input this
            total_cost: 0
        }])
        setProductSearch('')
        setSearchResults([])
    }

    const updateItem = (index: number, field: string, value: any) => {
        const newItems = [...items]
        newItems[index][field] = value
        newItems[index].total_cost = newItems[index].quantity * newItems[index].unit_cost
        setItems(newItems)
    }

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index))
    }

    const total = items.reduce((acc, item) => acc + item.total_cost, 0)

    const handleSave = async () => {
        if (!selectedSupplier) return alert('Selecciona un proveedor')
        if (items.length === 0) return alert('Agrega al menos un producto')

        setProcessing(true)
        try {
            const { data: user } = await supabase.auth.getUser()

            // 1. Create Purchase
            const { data: purchase, error: purchaseError } = await supabase
                .from('purchases')
                .insert({
                    supplier_id: selectedSupplier,
                    buyer_id: user.user?.id,
                    date: purchaseDate,
                    total: total,
                    notes: notes,
                    status: 'completed'
                })
                .select()
                .single()

            if (purchaseError) throw purchaseError

            // 2. Create Items (Trigger will handle stock)
            const purchaseItems = items.map(item => ({
                purchase_id: purchase.id,
                product_id: item.product_id,
                quantity: parseInt(item.quantity),
                unit_cost: parseFloat(item.unit_cost),
                total_cost: item.total_cost
            }))

            const { error: itemsError } = await supabase
                .from('purchase_items')
                .insert(purchaseItems)

            if (itemsError) throw itemsError

            alert('Compra registrada y stock actualizado correctamente')
            router.push('/dashboard/purchases')
        } catch (error: any) {
            console.error(error)
            alert('Error al guardar: ' + error.message)
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Link href="/dashboard/purchases" className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500 hover:text-blue-600">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold text-gray-900">Nueva Compra</h1>
                        <p className="text-sm text-gray-500">Registra gastos y reabastece inventario</p>
                    </div>
                </div>
                <div className="flex bg-white rounded-lg p-1.5 shadow-sm border border-gray-100">
                    <span className="px-3 py-1 text-xs font-medium text-gray-500 bg-gray-50 rounded-md border border-gray-100">
                        Fecha: {new Date().toLocaleDateString()}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Form & Products (8 cols) */}
                <div className="lg:col-span-8 space-y-6">

                    {/* Step 1: Proveedor Info Card */}
                    <div className="glass-card bg-white rounded-xl shadow-sm border border-gray-200/60 overflow-hidden">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Truck className="h-4 w-4 text-blue-500" />
                                Datos del Proveedor
                            </h2>
                        </div>
                        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Seleccionar Proveedor *
                                </label>
                                <select
                                    className="w-full bg-gray-50 hover:bg-white focus:bg-white border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition-all p-2.5 outline-none"
                                    value={selectedSupplier}
                                    onChange={e => setSelectedSupplier(e.target.value)}
                                >
                                    <option value="">-- Buscar proveedor --</option>
                                    {suppliers.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} - {s.nit_cedula}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Fecha de Compra
                                </label>
                                <input
                                    type="date"
                                    className="w-full bg-gray-50 hover:bg-white focus:bg-white border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition-all p-2.5 outline-none"
                                    value={purchaseDate}
                                    onChange={e => setPurchaseDate(e.target.value)}
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                    Notas / Referencia
                                </label>
                                <input
                                    type="text"
                                    className="w-full bg-gray-50 hover:bg-white focus:bg-white border-gray-200 rounded-lg text-sm focus:ring-blue-500 focus:border-blue-500 transition-all p-2.5 placeholder:text-gray-400 outline-none"
                                    placeholder="Ej: Factura F-2023-001..."
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Step 2: Product Search & Table */}
                    <div className="glass-card bg-white rounded-xl shadow-sm border border-gray-200/60 flex flex-col h-full">
                        <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                                <Package className="h-4 w-4 text-purple-500" />
                                Productos
                            </h2>
                            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                                {items.length} items
                            </span>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="relative group">
                                <Search className="absolute left-4 top-3.5 h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                                <input
                                    type="text"
                                    className="w-full pl-11 pr-4 py-3 bg-gray-50 group-hover:bg-white border-transparent focus:bg-white focus:border-blue-500 rounded-xl text-sm transition-all focus:ring-4 focus:ring-blue-500/10 placeholder:text-gray-400 border border-gray-100 focus:shadow-sm outline-none"
                                    placeholder="Escribe para buscar productos..."
                                    value={productSearch}
                                    onChange={e => searchProducts(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-10 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden">
                                        {searchResults.map(p => (
                                            <div
                                                key={p.id}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center group/item"
                                                onClick={() => addItem(p)}
                                            >
                                                <div>
                                                    <p className="font-medium text-gray-900 group-hover/item:text-blue-700">{p.name}</p>
                                                    <p className="text-xs text-gray-500">Stock actual: {p.stock}</p>
                                                </div>
                                                <Plus className="h-4 w-4 text-gray-300 group-hover/item:text-blue-500" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                                            <tr>
                                                <th className="px-4 py-3 text-left font-medium text-xs uppercase tracking-wider">Producto</th>
                                                <th className="px-4 py-3 text-center w-24 font-medium text-xs uppercase tracking-wider">Cant.</th>
                                                <th className="px-4 py-3 text-right w-36 font-medium text-xs uppercase tracking-wider">Costo Unit.</th>
                                                <th className="px-4 py-3 text-right w-32 font-medium text-xs uppercase tracking-wider">Total</th>
                                                <th className="px-4 py-3 w-10"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {items.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="p-12 text-center text-gray-400">
                                                        <div className="flex flex-col items-center gap-3">
                                                            <div className="bg-gray-50 p-3 rounded-full">
                                                                <Search className="h-6 w-6 opacity-30" />
                                                            </div>
                                                            <p className="text-sm">Busca y agrega productos arriba para comenzar</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ) : items.map((item, idx) => (
                                                <tr key={idx} className="group hover:bg-blue-50/10 transition-colors">
                                                    <td className="px-4 py-3 font-medium text-gray-700">{item.name}</td>
                                                    <td className="px-4 py-3">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className="w-full p-1.5 border border-gray-200 rounded text-center text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                            value={item.quantity}
                                                            onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value) || 0)}
                                                            placeholder="1"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="relative">
                                                            <span className="absolute left-2 top-1.5 text-gray-400 text-xs">$</span>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className="w-full pl-5 pr-2 py-1.5 border border-gray-200 rounded text-right text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                                                                value={item.unit_cost}
                                                                onChange={e => updateItem(idx, 'unit_cost', parseFloat(e.target.value) || 0)}
                                                                placeholder="0"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-semibold text-gray-900 bg-gray-50/50">
                                                        ${item.total_cost.toLocaleString()}
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <button
                                                            onClick={() => removeItem(idx)}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all opacity-0 group-hover:opacity-100"
                                                            title="Eliminar item"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Sticky Summary (4 cols) */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="glass-card bg-white rounded-xl shadow-lg border border-gray-200 sticky top-6 overflow-hidden">
                        <div className="bg-gray-900 px-6 py-4 flex items-center justify-between">
                            <h2 className="font-bold text-white flex items-center gap-2">
                                Resumen
                            </h2>
                            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="space-y-3 pb-6 border-b border-gray-100">
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-500">Subtotal Items</span>
                                    <span className="font-medium text-gray-900 bg-gray-50 px-2 py-0.5 rounded text-xs">{items.length} items</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                    <span className="text-gray-500">Unidades Totales</span>
                                    <span className="font-medium text-gray-900">{items.reduce((a, b) => a + b.quantity, 0)} u</span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1 pb-2">
                                <span className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Total a Pagar</span>
                                <span className="text-4xl font-extrabold text-gray-900 tracking-tight flex items-start gap-1">
                                    <span className="text-lg text-gray-400 mt-1 font-normal">$</span>
                                    {total.toLocaleString()}
                                </span>
                            </div>

                            <button
                                onClick={handleSave}
                                disabled={processing || items.length === 0}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-600/20 hover:shadow-xl hover:shadow-blue-600/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2 group"
                            >
                                {processing ? (
                                    <span className="animate-pulse">Procesando...</span>
                                ) : (
                                    <>
                                        <Save className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                        Confirmar Compra
                                    </>
                                )}
                            </button>

                            <div className="bg-blue-50/50 rounded-lg p-3 text-xs text-blue-700 leading-relaxed text-center border border-blue-100">
                                <p><strong>Nota:</strong> Esta acción aumentará el stock disponible de los productos seleccionados automáticamente.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
