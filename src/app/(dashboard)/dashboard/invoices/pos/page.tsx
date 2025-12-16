'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Eye, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRole } from '@/hooks/useRole'

type Invoice = {
    id: string
    number: number
    date: string
    total: number
    status: string
    invoice_type: string
    customer: { name: string; nit_cedula: string } | null
    seller: { full_name: string } | null
}

export default function POSInvoicesPage() {
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const { isAdmin } = useRole()

    useEffect(() => {
        fetchPOSInvoices()
    }, [])

    const fetchPOSInvoices = async () => {
        try {
            setLoading(true)
            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*),
                    seller:profiles(full_name)
                `)
                .eq('invoice_type', 'POS')
                .order('created_at', { ascending: false })

            if (error) throw error
            setInvoices(data || [])
        } catch (error) {
            console.error('Error fetching POS invoices:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800'
            case 'draft': return 'bg-gray-100 text-gray-800'
            case 'reported_dian': return 'bg-blue-100 text-blue-800'
            case 'cancelled': return 'bg-red-100 text-red-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'paid': return 'Pagada'
            case 'draft': return 'Borrador'
            case 'reported_dian': return 'Reportada DIAN'
            case 'cancelled': return 'Cancelada'
            default: return status
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Facturas POS</h1>
                    <p className="text-sm text-gray-500 mt-1">
                        <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            FACTURA LEGAL - Reporta a DIAN
                        </span>
                    </p>
                </div>
                <Link
                    href="/dashboard/invoices/pos/new"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-md hover:shadow-lg transition-all font-medium"
                >
                    <Plus className="h-5 w-5 mr-2" />
                    Nueva Factura POS
                </Link>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-gray-500">Cargando facturas POS...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="p-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900">No hay facturas POS</h3>
                        <p className="mt-1 text-gray-500">Crea tu primera factura POS legal</p>
                        <Link
                            href="/dashboard/invoices/pos/new"
                            className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            <Plus className="h-5 w-5 mr-2" />
                            Crear Factura POS
                        </Link>
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Número
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                {isAdmin && (
                                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Vendedor
                                    </th>
                                )}
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Fecha
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Total
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Estado
                                </th>
                                <th scope="col" className="relative px-6 py-3">
                                    <span className="sr-only">Acciones</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {invoices.map((invoice) => (
                                <tr key={invoice.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">#{invoice.number}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{invoice.customer?.name || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">{invoice.customer?.nit_cedula || ''}</div>
                                    </td>
                                    {isAdmin && (
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-500">{invoice.seller?.full_name || 'N/A'}</div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-500">
                                            {new Date(invoice.date).toLocaleDateString('es-CO')}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm font-medium text-gray-900">
                                            ${invoice.total.toLocaleString()}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(invoice.status)}`}>
                                            {getStatusText(invoice.status)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/dashboard/invoices/${invoice.id}`} className="text-blue-600 hover:text-blue-900 mr-4 inline-block" title="Ver Factura">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/dashboard/invoices/${invoice.id}`} className="text-green-600 hover:text-green-900 inline-block" title="Descargar PDF">
                                            <Download className="h-4 w-4" />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    )
}
