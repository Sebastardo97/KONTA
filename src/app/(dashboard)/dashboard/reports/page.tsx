'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Calendar, DollarSign, Download, Search } from 'lucide-react'

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount)
}

// Helper to calculate tax base from total (assuming 19% included)
const calculateBase = (total: number) => total / 1.19
const calculateTax = (total: number) => total - calculateBase(total)

export default function ReportsPage() {
    const [loading, setLoading] = useState(false)
    const [invoices, setInvoices] = useState<any[]>([])

    // Default to current month
    const today = new Date()
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

    const [startDate, setStartDate] = useState(firstDay)
    const [endDate, setEndDate] = useState(lastDay)

    useEffect(() => {
        fetchReports()
    }, [startDate, endDate])

    const fetchReports = async () => {
        try {
            setLoading(true)

            // Adjust end date to include the full day
            const endDateTime = new Date(endDate)
            endDateTime.setHours(23, 59, 59)

            const { data, error } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customers (name, nit_cedula)
                `)
                .eq('status', 'paid')
                .gte('created_at', startDate)
                .lte('created_at', endDateTime.toISOString())
                .order('created_at', { ascending: false })

            if (error) throw error
            setInvoices(data || [])
        } catch (error) {
            console.error('Error fetching reports:', error)
        } finally {
            setLoading(false)
        }
    }

    // Calculations
    const totalSales = invoices.reduce((acc, curr) => acc + curr.total, 0)
    const totalTax = invoices.reduce((acc, curr) => acc + calculateTax(curr.total), 0)
    const netIncome = totalSales - totalTax

    // Export to CSV
    const handleExport = () => {
        if (invoices.length === 0) return

        const headers = ['Fecha', 'Factura ID', 'Cliente', 'NIT/Cedula', 'Total Bruto', 'Impuesto (19%)', 'Neto']

        const rows = invoices.map(inv => {
            const tax = calculateTax(inv.total)
            const net = inv.total - tax

            // Format date for CSV
            const date = new Date(inv.created_at).toLocaleDateString('es-CO')

            return [
                date,
                inv.id,
                `"${inv.customers?.name || 'Cliente General'}"`,
                `"${inv.customers?.nit_cedula || ''}"`, // Quote to prevent CSV issues
                inv.total,
                tax.toFixed(2),
                net.toFixed(2)
            ].join(',')
        })

        const csvContent = [headers.join(','), ...rows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.setAttribute('href', url)
        link.setAttribute('download', `reporte_ventas_${startDate}_${endDate}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center">
                    <DollarSign className="h-8 w-8 mr-2 text-blue-600" />
                    Reportes Contables
                </h1>

                {/* Date Filters */}
                <div className="flex items-center space-x-2 bg-white p-2 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center px-2">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-500 mr-2">Desde:</span>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="text-sm border-none focus:ring-0 text-gray-700"
                        />
                    </div>
                    <div className="w-px h-6 bg-gray-200"></div>
                    <div className="flex items-center px-2">
                        <span className="text-sm text-gray-500 mr-2">Hasta:</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="text-sm border-none focus:ring-0 text-gray-700"
                        />
                    </div>
                    <button
                        onClick={fetchReports}
                        className="p-2 bg-blue-50 text-blue-600 rounded-md hover:bg-blue-100 transition-colors"
                        title="Actualizar"
                    >
                        <Search className="h-4 w-4" />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-blue-500">
                    <h3 className="text-sm font-medium text-gray-500">Ventas Totales (Bruto)</h3>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                        {formatCurrency(totalSales)}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{invoices.length} facturas</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-red-500">
                    <h3 className="text-sm font-medium text-gray-500">Impuestos (IVA 19%)</h3>
                    <div className="text-3xl font-bold text-red-600 mt-2">
                        {formatCurrency(totalTax)}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Estimado</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 border-l-4 border-l-green-500">
                    <h3 className="text-sm font-medium text-gray-500">Ingreso Neto</h3>
                    <div className="text-3xl font-bold text-green-600 mt-2">
                        {formatCurrency(netIncome)}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">Excluyendo impuestos</p>
                </div>
            </div>

            {/* Invoices List */}
            <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
                    <h3 className="font-semibold text-gray-900">Detalle de Facturas</h3>
                    <button
                        onClick={handleExport}
                        disabled={invoices.length === 0}
                        className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Download className="h-4 w-4 mr-1" />
                        Exportar CSV
                    </button>
                </div>

                {loading ? (
                    <div className="p-12 text-center">
                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-blue-500" />
                        <p className="mt-2 text-gray-500">Calculando reportes...</p>
                    </div>
                ) : invoices.length === 0 ? (
                    <div className="p-12 text-center text-gray-500">
                        No hay ventas registradas en este periodo.
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Factura #</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cliente</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Impuesto</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {invoices.map((invoice, idx) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {new Date(invoice.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                            #{invoice.id.slice(0, 8)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {invoice.customers?.name || 'Cliente General'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                                            {formatCurrency(invoice.total)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-500">
                                            {formatCurrency(calculateTax(invoice.total))}
                                        </td>
                                    </tr>
                                ))}
                                {/* Totals Row */}
                                <tr className="bg-gray-50 font-bold">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right" colSpan={3}>Totales del Periodo</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(totalSales)}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-red-600">{formatCurrency(totalTax)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}
