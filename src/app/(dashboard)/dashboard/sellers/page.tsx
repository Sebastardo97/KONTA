'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRole } from '@/hooks/useRole'
import { useRouter } from 'next/navigation'
import {
    Users,
    Mail,
    Calendar,
    TrendingUp,
    Package,
    DollarSign,
    Shield,
    UserCheck,
    UserX,
    Edit,
    Phone,
    CreditCard,
    Plus,
    ExternalLink
} from 'lucide-react'
import { EditSellerModal } from '@/components/EditSellerModal'

type Seller = {
    id: string
    email: string
    full_name: string | null
    phone: string | null
    document_id: string | null
    address: string | null
    role: string
    created_at: string
    stats?: {
        total_sales: number
        total_orders: number
        avg_order: number
    }
}

export default function SellerManagementPage() {
    const router = useRouter()
    const { isAdmin, loading: roleLoading } = useRole()
    const [sellers, setSellers] = useState<Seller[]>([])
    const [loading, setLoading] = useState(true)
    const [editingSeller, setEditingSeller] = useState<Seller | null>(null)
    const [isModalOpen, setIsModalOpen] = useState(false)

    useEffect(() => {
        if (!roleLoading && !isAdmin) {
            router.push('/dashboard')
        }
    }, [isAdmin, roleLoading, router])

    useEffect(() => {
        if (isAdmin) {
            fetchSellers()
        }
    }, [isAdmin])

    const fetchSellers = async () => {
        try {
            setLoading(true)

            // Fetch all users with seller or admin role
            const { data: profiles, error } = await supabase
                .from('profiles')
                .select('*')
                .order('created_at', { ascending: false })

            if (error) throw error

            // Fetch sales stats for each seller
            const sellersWithStats = await Promise.all(
                (profiles || []).map(async (profile) => {
                    // Get sales stats from invoices
                    const { data: invoices } = await supabase
                        .from('invoices')
                        .select('total')
                        .eq('seller_id', profile.id)

                    const total_sales = invoices?.reduce((sum, inv) => sum + inv.total, 0) || 0
                    const total_orders = invoices?.length || 0
                    const avg_order = total_orders > 0 ? total_sales / total_orders : 0

                    return {
                        ...profile,
                        stats: {
                            total_sales,
                            total_orders,
                            avg_order
                        }
                    }
                })
            )

            setSellers(sellersWithStats)
        } catch (error) {
            console.error('Error fetching sellers:', error)
        } finally {
            setLoading(false)
        }
    }

    if (roleLoading || !isAdmin) {
        return (
            <div className="flex items-center justify-center h-96">
                <div className="text-gray-500">Cargando...</div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Users className="h-7 w-7 text-blue-600" />
                        Gestión de Vendedores
                    </h1>
                    <p className="text-sm text-gray-600 mt-1">
                        Administra los usuarios y sus permisos
                    </p>
                </div>
                <button
                    onClick={() => window.open('https://supabase.com/dashboard/project/_/auth/users', '_blank')}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md transition-all font-medium text-sm"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    Nuevo Vendedor
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Total Usuarios</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {sellers.length}
                            </p>
                        </div>
                        <Users className="h-10 w-10 text-blue-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Vendedores</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {sellers.filter(s => s.role === 'seller').length}
                            </p>
                        </div>
                        <UserCheck className="h-10 w-10 text-green-500 opacity-50" />
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600 mb-1">Administradores</p>
                            <p className="text-3xl font-bold text-gray-900">
                                {sellers.filter(s => s.role === 'admin').length}
                            </p>
                        </div>
                        <Shield className="h-10 w-10 text-purple-500 opacity-50" />
                    </div>
                </div>
            </div>

            {/* Sellers List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-900">Lista de Usuarios</h2>
                </div>

                {loading ? (
                    <div className="p-8 text-center text-gray-500">
                        Cargando usuarios...
                    </div>
                ) : sellers.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No hay usuarios registrados
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Usuario
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Rol
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Teléfono
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Identificación
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Ventas Totales
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {sellers.map((seller) => (
                                    <tr key={seller.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${seller.role === 'admin' ? 'bg-purple-500' : 'bg-blue-500'
                                                    }`}>
                                                    {seller.full_name?.charAt(0).toUpperCase() || 'U'}
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {seller.full_name || 'Sin nombre'}
                                                    </div>
                                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                                        <Mail className="h-3 w-3" />
                                                        {seller.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${seller.role === 'admin'
                                                ? 'bg-purple-100 text-purple-800'
                                                : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {seller.role === 'admin' ? (
                                                    <>
                                                        <Shield className="h-3 w-3 mr-1" />
                                                        Admin
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserCheck className="h-3 w-3 mr-1" />
                                                        Vendedor
                                                    </>
                                                )}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                <Phone className="h-3 w-3" />
                                                {seller.phone || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500 flex items-center gap-1">
                                                <CreditCard className="h-3 w-3" />
                                                {seller.document_id || 'N/A'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-green-600 flex items-center gap-1">
                                                <DollarSign className="h-4 w-4" />
                                                ${seller.stats?.total_sales.toLocaleString() || '0'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <button
                                                onClick={() => {
                                                    setEditingSeller(seller)
                                                    setIsModalOpen(true)
                                                }}
                                                className="text-blue-600 hover:text-blue-900 font-medium text-sm flex items-center gap-1"
                                            >
                                                <Edit className="h-4 w-4" />
                                                Editar
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Info Note */}
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <p className="text-sm text-blue-800 flex items-start gap-2">
                    <ExternalLink className="h-5 w-5 flex-shrink-0 mt-0.5" />
                    <span>
                        <strong>Nota:</strong> Para agregar nuevos usuarios, haz clic en "Nuevo Vendedor" para ir al panel de Supabase.
                        Una vez creados, aparecerán aquí automáticamente y podrás cambiar sus nombres y detalles.
                    </span>
                </p>
            </div>

            {/* Edit Modal */}
            <EditSellerModal
                seller={editingSeller}
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false)
                    setEditingSeller(null)
                }}
                onSuccess={() => {
                    fetchSellers()
                }}
            />
        </div>
    )
}
