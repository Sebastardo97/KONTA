'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Save, ArrowLeft, DollarSign, User, Tag, FileText } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function NewExpensePage() {
    const router = useRouter()
    const [sellers, setSellers] = useState<any[]>([])
    const [processing, setProcessing] = useState(false)

    // Form State
    const [category, setCategory] = useState('varios')
    const [amount, setAmount] = useState('')
    const [description, setDescription] = useState('')
    const [date, setDate] = useState(new Date().toISOString().split('T')[0])
    const [selectedUser, setSelectedUser] = useState('')

    // Categories List
    const categories = [
        { id: 'viaticos', label: 'Viáticos (Viajes/Subsistencia)' },
        { id: 'varios', label: 'Varios (Misceláneos)' },
        { id: 'nomina', label: 'Nómina' },
        { id: 'servicios', label: 'Servicios Públicos' },
        { id: 'arriendo', label: 'Arriendo' },
        { id: 'mantenimiento', label: 'Mantenimiento' },
        { id: 'otros', label: 'Otros' }
    ]

    useEffect(() => {
        const fetchSellers = async () => {
            // Get all profiles who are sellers or admins
            const { data } = await supabase
                .from('profiles')
                .select('*')
                .order('full_name')

            if (data) setSellers(data)

            // Set current user as default
            const { data: { user } } = await supabase.auth.getUser()
            if (user) setSelectedUser(user.id)
        }
        fetchSellers()
    }, [])

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!amount || Number(amount) <= 0) return alert('Ingresa un monto válido')
        if (!description) return alert('Ingresa una descripción')

        setProcessing(true)
        try {
            const { error } = await supabase
                .from('expenses')
                .insert({
                    category,
                    amount: Number(amount),
                    description,
                    date,
                    user_id: selectedUser // The person responsible (e.g., the seller receiving viaticos)
                })

            if (error) throw error

            alert('Gasto registrado correctamente')
            router.push('/dashboard/expenses')
        } catch (error: any) {
            console.error(error)
            alert('Error al guardar: ' + error.message)
        } finally {
            setProcessing(false)
        }
    }

    return (
        <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <Link href="/dashboard/expenses" className="p-2 hover:bg-white hover:shadow-sm rounded-full transition-all text-gray-500 hover:text-purple-600">
                    <ArrowLeft className="h-5 w-5" />
                </Link>
                <div>
                    <h1 className="text-xl font-bold text-gray-900">Registrar Nuevo Gasto</h1>
                    <p className="text-sm text-gray-500">Ingresa los detalles del gasto operativo</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="glass-card bg-white p-8 rounded-xl shadow-sm border border-gray-100 space-y-6">

                {/* Category Selection */}
                <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Tag className="h-3 w-3" /> Categoría
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {categories.map(cat => (
                            <button
                                key={cat.id}
                                type="button"
                                onClick={() => setCategory(cat.id)}
                                className={`px-4 py-3 rounded-lg text-sm font-medium text-left transition-all border ${category === cat.id
                                        ? 'bg-purple-50 border-purple-200 text-purple-700 shadow-sm ring-1 ring-purple-200'
                                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                                    }`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Amount */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <DollarSign className="h-3 w-3" /> Monto Total
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-3.5 text-gray-400 font-medium">$</span>
                            <input
                                type="number"
                                min="1"
                                required
                                className="w-full pl-8 pr-4 py-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-lg font-bold text-gray-900 focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 transition-all outline-none"
                                placeholder="0.00"
                                value={amount}
                                onChange={e => setAmount(e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                            Fecha del Gasto
                        </label>
                        <input
                            type="date"
                            required
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            value={date}
                            onChange={e => setDate(e.target.value)}
                        />
                    </div>

                    {/* User / Responsible */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <User className="h-3 w-3" /> Responsable / Vendedor
                        </label>
                        <select
                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none"
                            value={selectedUser}
                            onChange={e => setSelectedUser(e.target.value)}
                        >
                            <option value="">-- Seleccionar --</option>
                            {sellers.map(s => (
                                <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                            ))}
                        </select>
                        {category === 'viaticos' && (
                            <p className="text-xs text-orange-600 mt-1.5 font-medium">
                                * Para viáticos, selecciona al vendedor que realizó el viaje.
                            </p>
                        )}
                    </div>

                    {/* Description */}
                    <div className="md:col-span-2">
                        <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                            <FileText className="h-3 w-3" /> Descripción / Detalles
                        </label>
                        <textarea
                            required
                            rows={3}
                            className="w-full px-4 py-3 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all outline-none resize-none"
                            placeholder="Ej: Almuerzo con cliente, Compra de papelería, Pago de luz..."
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                    <Link
                        href="/dashboard/expenses"
                        className="px-6 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg hover:bg-gray-50 transition-colors"
                    >
                        Cancelar
                    </Link>
                    <button
                        type="submit"
                        disabled={processing}
                        className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 shadow-lg shadow-purple-600/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {processing ? 'Guardando...' : (
                            <>
                                <Save className="h-4 w-4" />
                                Guardar Gasto
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    )
}
