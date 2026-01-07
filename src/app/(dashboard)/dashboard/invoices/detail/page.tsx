'use client'

import { useEffect, useState, Suspense } from 'react'
import { supabase } from '@/lib/supabase'
import { Loader2, Printer, ArrowLeft, RotateCcw } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import ReturnModal from '@/components/returns/ReturnModal'
import { getCreditNotesByInvoice } from '@/lib/returns'

// Helper to format currency
const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
        style: 'currency',
        currency: 'COP',
        minimumFractionDigits: 0
    }).format(amount)
}

function InvoiceDetailsContent() {
    const [invoice, setInvoice] = useState<any>(null)
    const [company, setCompany] = useState<any>(null)
    const [creditNotes, setCreditNotes] = useState<any[]>([])
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    // Use native window print for simplicity and reliability
    const handlePrint = () => {
        window.print()
    }

    useEffect(() => {
        if (id) {
            fetchData(id)
        }
    }, [id])

    const fetchData = async (invoiceId: string) => {
        try {
            setLoading(true)

            // Fetch Invoice with Customer, Seller, and Items
            const { data: invoiceData, error: invoiceError } = await supabase
                .from('invoices')
                .select(`
                    *,
                    customers (name, nit_cedula, address, phone, email),
                    seller:profiles!seller_id (full_name),
                    invoice_items (
                        id,
                        product_id,
                        quantity,
                        unit_price,
                        total,
                        products (name, sku)
                    )
                `)
                .eq('id', invoiceId)
                .single()

            if (invoiceError) throw invoiceError
            setInvoice(invoiceData)

            // Fetch Credit Notes
            const creditNotesData = await getCreditNotesByInvoice(invoiceId)
            setCreditNotes(creditNotesData || [])

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
                <div className="flex gap-2">
                    {invoice.status !== 'cancelled' && invoice.status !== 'draft' && (
                        <button
                            onClick={() => setIsReturnModalOpen(true)}
                            className="flex items-center bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 transition-colors shadow-sm"
                        >
                            <RotateCcw className="h-4 w-4 mr-2" />
                            Devolución
                        </button>
                    )}
                    <button
                        onClick={handlePrint}
                        className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Printer className="h-4 w-4 mr-2" />
                        Imprimir / Descargar PDF
                    </button>
                </div>
            </div>

            {/* Receipt Container - "Remisión" Style */}
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 text-sm font-sans text-gray-800">

                {/* Header Section */}
                <div className="flex justify-between items-start mb-6">
                    {/* Left: Company Info */}
                    <div className="space-y-1">
                        <h1 className="text-2xl font-bold text-gray-800 uppercase tracking-tight">
                            {company.name || 'Orchis accesorios'}
                        </h1>
                        <p className="text-xs text-gray-600 font-bold">
                            {company.address || 'DIRECCIÓN NO REGISTRADA'}
                        </p>
                        <p className="text-xs text-gray-600">
                            TEL: {company.phone}
                        </p>
                        {company.city && <p className="text-xs text-gray-600 uppercase">{company.city}</p>}
                        {/* Subtext mimicking the photo */}
                        <p className="text-[10px] text-gray-500 mt-1 uppercase w-64 leading-tight">
                            Cliente: {invoice.customers?.name || 'Cliente'}
                        </p>
                    </div>

                    {/* Right: Remission Box */}
                    <div className="border border-gray-300 rounded-lg overflow-hidden w-64">
                        <div className="bg-gray-50 border-b border-gray-300 p-2 text-center">
                            <h2 className="text-sm font-bold text-gray-700">* REMISIÓN *</h2>
                        </div>
                        <div className="p-3 text-center">
                            <p className="text-2xl font-bold text-gray-900">{invoice.number?.toString().padStart(8, '0')}</p>
                        </div>
                        <div className="bg-gray-50 border-t border-gray-300 p-2 flex justify-between text-[10px] text-gray-600">
                            <span>Fecha: {new Date(invoice.created_at).toLocaleDateString()}</span>
                            <span>Vence: {new Date(new Date(invoice.created_at).setDate(new Date(invoice.created_at).getDate() + 30)).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Customer Info Box */}
                <div className="border-t border-b border-gray-200 py-4 mb-6">
                    <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs">
                        <div className="flex">
                            <span className="font-bold w-20 text-gray-600">CLIENTE:</span>
                            <span className="uppercase font-medium">{invoice.customers?.name}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-24 text-gray-600">FECHA INICIO:</span>
                            <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
                        </div>

                        <div className="flex">
                            <span className="font-bold w-20 text-gray-600">CC/NIT:</span>
                            <span>{invoice.customers?.nit_cedula}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-24 text-gray-600">VENCIMIENTO:</span>
                            <span>{new Date(new Date(invoice.created_at).setDate(new Date(invoice.created_at).getDate() + 30)).toLocaleDateString()}</span>
                        </div>

                        <div className="flex">
                            <span className="font-bold w-20 text-gray-600">DIR:</span>
                            <span className="uppercase">{invoice.customers?.address || 'N/A'}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-24 text-gray-600">VENDEDOR:</span>
                            <span className="uppercase">{invoice.seller?.full_name || 'N/A'}</span>
                        </div>

                        <div className="flex">
                            <span className="font-bold w-20 text-gray-600">TEL:</span>
                            <span>{invoice.customers?.phone || 'N/A'}</span>
                        </div>
                    </div>
                </div>

                {/* Items Table - Remission Style */}
                <div className="mb-0">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="border-t border-b border-gray-400">
                                <th className="py-2 text-center w-10 text-gray-600 font-bold">CR</th>
                                <th className="py-2 text-center w-16 text-gray-600 font-bold">UNIDADES</th>
                                <th className="py-2 text-left pl-4 text-gray-600 font-bold w-32">REFERENCIA</th>
                                <th className="py-2 text-left pl-4 text-gray-600 font-bold">CONCEPTO</th>
                                <th className="py-2 text-right text-gray-600 font-bold w-24">VALOR UNIT</th>
                                <th className="py-2 text-right text-gray-600 font-bold w-24">TOTAL</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {invoice.invoice_items?.map((item: any, idx: number) => (
                                <tr key={idx}>
                                    <td className="py-2 text-center text-gray-500">{idx + 1}</td>
                                    <td className="py-2 text-center font-medium">{item.quantity}</td>
                                    <td className="py-2 pl-4 text-gray-500">{item.products?.sku || '-'}</td>
                                    <td className="py-2 pl-4 uppercase font-medium">{item.products?.name}</td>
                                    <td className="py-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                                    <td className="py-2 text-right font-bold text-gray-900">{formatCurrency(item.total)}</td>
                                </tr>
                            ))}
                            {/* Empty rows to push totals to bottom if needed, or just spacers */}
                            <tr className="border-t border-gray-300">
                                <td colSpan={4}></td>
                                <td className="py-2 text-right font-bold text-gray-600 border border-gray-300 bg-gray-50">SUBTOTAL</td>
                                <td className="py-2 text-right font-bold text-gray-900 border border-gray-300">{formatCurrency(invoice.total / 1.19)}</td>
                            </tr>
                            <tr>
                                <td colSpan={4}></td>
                                <td className="py-2 text-right font-bold text-gray-800 border border-gray-300 bg-gray-50 text-sm">TOTAL</td>
                                <td className="py-2 text-right font-bold text-black border border-gray-300 text-sm">{formatCurrency(invoice.total)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Footer Notes */}
                <div className="text-center mt-auto">
                    <p className="text-[10px] font-bold uppercase text-gray-600 border-t border-gray-300 pt-2 inline-block px-12">
                        Nota: Despues de 8 dias no se aceptan devoluciones
                    </p>
                    <div className="h-4"></div>
                </div>
            </div>


            {/* Credit Notes Section */}
            {
                creditNotes.length > 0 && (
                    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200 print:hidden">
                        <h2 className="text-xl font-bold mb-4">Notas Crédito (Devoluciones)</h2>
                        <div className="space-y-4">
                            {creditNotes.map((note) => (
                                <div key={note.id} className="border rounded-lg p-4 bg-gray-50">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h3 className="font-bold text-gray-800">Nota Crédito #{note.number}</h3>
                                            <p className="text-sm text-gray-600">Fecha: {new Date(note.created_at).toLocaleDateString()}</p>
                                            <p className="text-sm text-gray-600">Razón: {note.reason}</p>
                                            <p className="text-xs text-gray-500 mt-1">Procesado por: {note.created_by_user?.email}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="block text-lg font-bold text-red-600">
                                                -{formatCurrency(note.total)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 border-t border-gray-200 pt-2">
                                        <table className="w-full text-xs">
                                            <thead>
                                                <tr>
                                                    <th className="text-left font-medium text-gray-500">Producto</th>
                                                    <th className="text-right font-medium text-gray-500">Cant</th>
                                                    <th className="text-right font-medium text-gray-500">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {note.credit_note_items.map((item: any) => (
                                                    <tr key={item.id}>
                                                        <td className="py-1">{item.products?.name}</td>
                                                        <td className="text-right">{item.quantity}</td>
                                                        <td className="text-right">{formatCurrency(item.total)}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )
            }

            <ReturnModal
                isOpen={isReturnModalOpen}
                onClose={() => setIsReturnModalOpen(false)}
                onSuccess={() => {
                    fetchData(id!)
                    // Optional: Show success toast
                }}
                invoiceId={invoice.id}
                items={invoice.invoice_items}
            />
        </div >
    )
}

export default function InvoiceDetailsPage() {
    return (
        <Suspense fallback={<div className="flex justify-center items-center h-96">Cargando...</div>}>
            <InvoiceDetailsContent />
        </Suspense>
    )
}
