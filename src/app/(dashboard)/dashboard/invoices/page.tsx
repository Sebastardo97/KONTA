'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { FileText, Download, Eye, Loader2, Filter, User } from 'lucide-react'
import Link from 'next/link'

type InvoiceType = 'ALL' | 'POS' | 'NORMAL'

export default function InvoicesPage() {
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [typeFilter, setTypeFilter] = useState<InvoiceType>('ALL')

    useEffect(() => {
        fetchInvoices()
    }, [typeFilter])

    const fetchInvoices = async () => {
        try {
            setLoading(true)
            let query = supabase
                .from('invoices')
                .select(`
                    *,
                    customer:customers(*),
                    seller:profiles!invoices_seller_id_fkey(*)
                `)
                .order('created_at', { ascending: false })

            // Apply type filter
            if (typeFilter !== 'ALL') {
                query = query.eq('invoice_type', typeFilter)
            }

            const { data, error } = await query

            if (error) throw error
            setInvoices(data || [])
        } catch (error) {
            console.error('Error fetching invoices:', error)
        } finally {
            setLoading(false)
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'paid': return 'bg-green-100 text-green-800'
            case 'draft': return 'bg-gray-100 text-gray-800'
            case 'reported_dian': return 'bg-blue-100 text-blue-800'
            default: return 'bg-gray-100 text-gray-800'
        }
    }

    const getStatusText = (status: string) => {
        switch (status) {
            case 'paid': return 'Pagada'
            case 'draft': return 'Borrador'
            case 'reported_dian': return 'Reportada DIAN'
            default: return status
        }
    }

    const getTypeColor = (type: string) => {
        return type === 'POS'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-gray-100 text-gray-800'
    }

    const getTypeText = (type: string) => {
        return type === 'POS' ? 'POS' : 'Normal'
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="h-7 w-7 text-blue-600" />
                    Todas las Facturas
                </h1>
            </div>

            {/* Type Filter Tabs */}
            <div className="bg-white rounded-lg border border-gray-200 p-1 inline-flex gap-1">
                <button
                    onClick={() => setTypeFilter('ALL')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${typeFilter === 'ALL'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    Todas ({invoices.length})
                </button>
                <button
                    onClick={() => setTypeFilter('POS')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${typeFilter === 'POS'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    Facturas POS
                </button>
                <button
                    onClick={() => setTypeFilter('NORMAL')}
                    className={`px-4 py-2 rounded-md font-medium text-sm transition-colors ${typeFilter === 'NORMAL'
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                >
                    Facturas Normales
                </button>
            </div>

            <div className="bg-white shadow overflow-hidden sm:rounded-lg border border-gray-200">
                {loading ? (
                    <div className="p-8 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-gray-500">Cargando facturas...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        No hay facturas {typeFilter !== 'ALL' ? `de tipo ${getTypeText(typeFilter)}` : ''}
                    </div>
                ) : (
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Número
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Tipo
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Cliente
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Vendedor
                                </th>
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
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTypeColor(invoice.invoice_type)}`}>
                                            {getTypeText(invoice.invoice_type)}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="text-sm text-gray-900">{invoice.customer?.name || 'N/A'}</div>
                                        <div className="text-sm text-gray-500">{invoice.customer?.nit_cedula || ''}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <User className="h-4 w-4 text-gray-400" />
                                            <div className="text-sm text-gray-900">
                                                {invoice.seller?.full_name || 'N/A'}
                                            </div>
                                        </div>
                                    </td>
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
                                        <Link href={`/dashboard/invoices/detail?id=${invoice.id}`} className="text-blue-600 hover:text-blue-900 mr-4 inline-block" title="Ver Factura">
                                            <Eye className="h-4 w-4" />
                                        </Link>
                                        <Link href={`/dashboard/invoices/detail?id=${invoice.id}`} className="text-green-600 hover:text-green-900 inline-block" title="Descargar PDF">
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
