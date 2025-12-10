'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Printer, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount)
}

export default function InvoiceDetailsPage({ params }: { params: { id: string } }) {
    const [invoice, setInvoice] = useState<any>(null)
    const [company, setCompany] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    // Use native window print for simplicity and reliability
    const handlePrint = () => {
        window.print()
    }

    useEffect(() => {
        fetchData()
    }, [params.id])

    const fetchData = async () => {
        try {
            setLoading(true)

            // Fetch Invoice with Customer and Items
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customers (name, nit_cedula, address, phone, email),
                    invoice_items (
                        quantity,
                        unit_price,
                        total,
                        products (name)
                    )
                `)
                .eq('id', params.id)
                .single()

            if (invoiceError) throw invoiceError
            setInvoice(invoiceData)

            // Fetch Company Settings (for header)
            const { data: companyData } = await supabase
                .from('company_settings')
                .select('*')
                .single()

            setCompany(companyData || {
                name: 'Orchis accesorios',
                nit: '900.123.456', // Default/Placeholder
                address: 'Cra 22 Sur #154-74',
                phone: '3147272285',
                city: 'Ibagué'
            })

        } catch (error) {
            console.error('Error fetching details:', error)
        } finally {
            setLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
        )
    }

    if (!invoice) {
        return <div className="p-8 text-center">Factura no encontrada</div>
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4">
            {/* Action Bar */}
            <div className="flex justify-between items-center print:hidden">
                <button
                    onClick={() => router.back()}
                    className="flex items-center text-gray-600 hover:text-gray-900"
                >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Volver
                </button>
                <button
                    onClick={handlePrint}
                    className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Printer className="h-4 w-4 mr-2" />
                    Imprimir / Descargar PDF
                </button>
            </div>

            {/* Receipt Container - This part gets printed */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 text-sm font-sans text-gray-800">

                {/* Header */}
                <div className="flex justify-between items-start mb-8 border-b pb-6">
                    <div className="space-y-1">
                        {/* Logo can go here if we have one, using text for now based on image */}
                        <h1 className="text-3xl font-script font-bold text-gray-600 italic">
                            {company.name || 'Orchis accesorios'}
                        </h1>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-wide">
                            {company.address || 'DIRECCIÓN NO REGISTRADA'}
                        </p>
                        <p className="text-xs text-gray-500">
                            TEL: {company.phone}
                        </p>
                        {company.city && <p className="text-xs text-gray-500">{company.city}</p>}
                    </div>
                    <div className="text-right border border-gray-300 rounded-lg p-3 bg-gray-50">
                        <h2 className="text-sm font-bold text-gray-700 mb-1">* REMISIÓN *</h2>
                        <p className="text-xl font-bold text-gray-900">{invoice.number?.toString().padStart(8, '0')}</p>
                    </div>
                </div>

                {/* Customer & Info Grid */}
                <div className="grid grid-cols-2 gap-8 mb-8 text-xs">
                    {/* Customer Info */}
                    <div className="space-y-1">
                        <div className="flex">
                            <span className="font-bold w-16">Cliente:</span>
                            <span className="uppercase">{invoice.customers?.name}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-16">CC/NIT:</span>
                            <span>{invoice.customers?.nit_cedula}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-16">Dir:</span>
                            <span className="uppercase">{invoice.customers?.address || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-16">Tel:</span>
                            <span>{invoice.customers?.phone || 'N/A'}</span>
                        </div>
                    </div>

                    {/* Invoice Meta */}
                    <div className="space-y-1">
                        <div className="flex justify-between border-b border-gray-200 pb-1">
                            <span className="font-bold">Fecha Emisión:</span>
                            <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between border-b border-gray-200 pb-1 pt-1">
                            <span className="font-bold">Vencimiento:</span>
                            {/* Assuming 30 days or same day for now */}
                            <span>{new Date(new Date(invoice.created_at).setDate(new Date(invoice.created_at).getDate() + 30)).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between pt-1">
                            <span className="font-bold">Vendedor:</span>
                            <span className="uppercase">JHOVIAM</span> {/* Hardcoded based on image, ideally from seller profile */}
                        </div>
                    </div>
                </div>

                {/* Items Table */}
                <div className="mb-8">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-t border-b border-gray-800">
                                <th className="py-2 text-center w-12">CANT</th>
                                <th className="py-2 text-left pl-4">CONCEPTO</th>
                                <th className="py-2 text-right">VALOR UNIT</th>
                                <th className="py-2 text-right">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {invoice.invoice_items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-2 text-center">{item.quantity}</td>
                                    <td className="py-2 pl-4 uppercase">{item.products?.name}</td>
                                    <td className="py-2 text-right">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-2 text-right font-medium">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Footer Totals */}
                <div className="flex justify-end mb-12">
                    <div className="w-64 border border-gray-800 rounded-sm">
                        <div className="flex justify-between p-2 border-b border-gray-800 bg-gray-100">
                            <span className="font-bold text-sm">SUBTOTAL</span>
                            <span className="font-bold text-sm">{formatCurrency(invoice.total / 1.19)}</span> {/* Approx base */}
                        </div>
                        <div className="flex justify-between p-2 text-lg">
                            <span className="font-bold">TOTAL</span>
                            <span className="font-bold">{formatCurrency(invoice.total)}</span>
                        </div>
                    </div>
                </div>

                {/* Footer Notes */}
                <div className="text-center text-xs font-bold border-t border-gray-300 pt-4 uppercase">
                    NOTA: DESPUES DE 8 DIAS NO SE ACEPTAN DEVOLUCIONES
                </div>
            </div>
        </div>
    )
}
