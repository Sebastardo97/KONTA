'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Plus, Search, Edit, Trash2, Loader2, Users, MoreHorizontal, Mail, Phone, MapPin } from 'lucide-react'

type Customer = {
    id: string
    name: string
    nit_cedula: string
    email: string
    phone: string
    phone2?: string
    address: string
    city?: string
}

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)

    const [formData, setFormData] = useState({
        name: '',
        nit_cedula: '',
        email: '',
        phone: '',
        phone2: '',
        address: '',
        city: ''
    })

    useEffect(() => {
        fetchCustomers()
    }, [])

    const fetchCustomers = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('customers')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error
            setCustomers(data || [])
        } catch (error) {
            console.error('Error fetching customers:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            if (editingCustomer) {
                const { error } = await supabase
                    .from('customers')
                    .update(formData)
                    .eq('id', editingCustomer.id)
                if (error) throw error
            } else {
                const { error } = await supabase
                    .from('customers')
                    .insert([formData])
                if (error) throw error
            }

            setIsModalOpen(false)
            setEditingCustomer(null)
            setFormData({ name: '', nit_cedula: '', email: '', phone: '', phone2: '', address: '', city: '' })
            fetchCustomers()
        } catch (error: any) {
            console.error('Error saving customer:', error)
            alert(`Error al guardar el cliente: ${error.message || 'Error desconocido'}`)
        }
    }

    const handleEdit = (customer: Customer) => {
        setEditingCustomer(customer)
        setFormData({
            name: customer.name,
            nit_cedula: customer.nit_cedula,
            email: customer.email || '',
            phone: customer.phone || '',
            phone2: customer.phone2 || '',
            address: customer.address || '',
            city: customer.city || ''
        })
        setIsModalOpen(true)
    }

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este cliente?')) return

        try {
            const { error } = await supabase
                .from('customers')
                .delete()
                .eq('id', id)

            if (error) throw error
            fetchCustomers()
        } catch (error) {
            console.error('Error deleting customer:', error)
        }
    }

    const filteredCustomers = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.nit_cedula.includes(searchTerm)
    )

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gestión de Clientes</h1>
                    <p className="text-sm text-gray-500">Administra tu base de datos de compradores</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCustomer(null)
                        setFormData({ name: '', nit_cedula: '', email: '', phone: '', phone2: '', address: '', city: '' })
                        setIsModalOpen(true)
                    }}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-medium"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Nuevo Cliente
                </button>
            </div>

            {/* Main Content Card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden glass-card">
                {/* Search Bar & Filters */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row gap-4 justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg leading-5 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 sm:text-sm transition-all"
                            placeholder="Buscar cliente por nombre o documento..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Users className="h-4 w-4" />
                        <span>{filteredCustomers.length} clientes registrados</span>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-12 text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500 mb-3" />
                            <p className="text-gray-500">Cargando base de datos...</p>
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-4">
                                <Users className="h-6 w-6 text-gray-400" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900">No hay clientes encontrados</h3>
                            <p className="mt-1 text-gray-500">Intenta con otra búsqueda o crea un nuevo cliente.</p>
                        </div>
                    ) : (
                        <table className="min-w-full divide-y divide-gray-100">
                            <thead className="bg-gray-50/50">
                                <tr>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Cliente
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Identificación
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Contacto
                                    </th>
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                        Ubicación
                                    </th>
                                    <th scope="col" className="relative px-6 py-3">
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-50">
                                {filteredCustomers.map((customer) => (
                                    <tr key={customer.id} className="hover:bg-blue-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold mr-3">
                                                    {customer.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                                {customer.nit_cedula}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col text-sm text-gray-500 space-y-1">
                                                {customer.email && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Mail className="h-3 w-3" /> {customer.email}
                                                    </div>
                                                )}
                                                {customer.phone && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3 w-3" /> {customer.phone}
                                                    </div>
                                                )}
                                                {customer.phone2 && (
                                                    <div className="flex items-center gap-1.5">
                                                        <Phone className="h-3 w-3" /> {customer.phone2}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {customer.address ? (
                                                <div className="flex flex-col">
                                                    <div className="flex items-center text-sm text-gray-500">
                                                        <MapPin className="h-3 w-3 mr-1" />
                                                        {customer.address}
                                                    </div>
                                                    {customer.city && (
                                                        <span className="text-xs text-gray-400 ml-4">{customer.city}</span>
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">No registrada</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(customer)}
                                                    className="p-1 text-indigo-600 hover:bg-indigo-50 rounded"
                                                    title="Editar"
                                                >
                                                    <Edit className="h-4 w-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(customer.id)}
                                                    className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                    title="Eliminar"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            {/* Modal - Improved UI */}
            {isModalOpen && (
                <div className="fixed z-50 inset-0 overflow-y-auto">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div
                            className="fixed inset-0 transition-opacity"
                            aria-hidden="true"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <div className="absolute inset-0 bg-gray-900 opacity-25 backdrop-blur-sm"></div>
                        </div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="relative z-10 inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full border border-gray-100">
                            <form onSubmit={handleSubmit}>
                                <div className="bg-white px-6 pt-6 pb-4">
                                    <h3 className="text-xl font-bold text-gray-900 mb-1">
                                        {editingCustomer ? 'Editar Cliente' : 'Nuevo Cliente'}
                                    </h3>
                                    <p className="text-sm text-gray-500 mb-6">
                                        Completa la información para {editingCustomer ? 'actualizar' : 'registrar'} un cliente.
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo *</label>
                                            <input
                                                type="text"
                                                required
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Ej: Juan Pérez S.A.S"
                                                value={formData.name}
                                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">NIT o Cédula *</label>
                                            <input
                                                type="text"
                                                required
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Ej: 900123456"
                                                value={formData.nit_cedula}
                                                onChange={(e) => setFormData({ ...formData, nit_cedula: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input
                                                type="email"
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="juan@empresa.com"
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono 1</label>
                                                <input
                                                    type="text"
                                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="300 123 4567"
                                                    value={formData.phone}
                                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono 2</label>
                                                <input
                                                    type="text"
                                                    className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                    placeholder="301 987 6543"
                                                    value={formData.phone2}
                                                    onChange={(e) => setFormData({ ...formData, phone2: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                            <input
                                                type="text"
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Calle 123 # 45-67"
                                                value={formData.address}
                                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Ciudad</label>
                                            <input
                                                type="text"
                                                className="block w-full border border-gray-300 rounded-lg shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                                placeholder="Ej: Ibagué"
                                                value={formData.city}
                                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 px-6 py-4 sm:flex sm:flex-row-reverse border-t border-gray-100">
                                    <button
                                        type="submit"
                                        className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                    >
                                        {editingCustomer ? 'Actualizar Cliente' : 'Guardar Cliente'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
