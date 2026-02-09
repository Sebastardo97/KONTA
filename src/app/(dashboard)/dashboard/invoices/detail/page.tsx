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
                    customers (name, nit_cedula, address, phone, email, city),
                    seller:profiles!seller_id (full_name),
                    invoice_items (
                        id,
                        product_id,
                        quantity,
                        unit_price,
                        total,
                        products (name, sku, code)
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
                    {/* Edit Button - Only for same-day invoices */}
                    {(() => {
                        const invoiceDate = new Date(invoice.created_at)
                        const today = new Date()
                        const isSameDay = invoiceDate.toDateString() === today.toDateString()

                        return isSameDay && invoice.status !== 'cancelled' && (
                            <button
                                onClick={() => router.push(`/dashboard/invoices/normal/edit?id=${invoice.id}`)}
                                className="flex items-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                                </svg>
                                Editar
                            </button>
                        )
                    })()}
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
            <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-200 print:shadow-none print:border-none print:p-0 text-sm font-sans text-gray-800 relative overflow-hidden">

                {/* Watermark */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-[0.25] print:fixed print:inset-0 print:opacity-[0.25]">
                    <img
                        src="/watermark.jpg"
                        alt="Watermark"
                        className="w-2/3 object-contain grayscale"
                    />
                </div>

                <style jsx global>{`
                    @media print {
                        @page {
                            margin: 0.5cm;
                        }
                        body {
                            background: white !important;
                        }
                        thead {
                            display: table-header-group !important;
                        }
                        tfoot {
                            display: table-footer-group !important;
                        }
                        .print-row {
                            page-break-inside: avoid;
                        }
                    }
                `}</style>

                <table className="w-full border-collapse" style={{ fontSize: '9px' }}>
                    <thead>
                        <tr>
                            <td colSpan={6} className="border-none p-0 pb-2">
                                {/* Header Section */}
                                <div className="flex justify-between items-start mb-2">
                                    {/* Left: Company Info */}
                                    <div className="space-y-0">
                                        <h1 className="text-sm font-bold text-gray-800 uppercase tracking-tight leading-tight">
                                            {company.name || 'ORCHIS ACCESORIOS'}
                                        </h1>
                                        <p className="text-[8px] text-gray-600 font-bold leading-tight">
                                            {company.address || 'CRA 22 SUR #154-74'}
                                        </p>
                                        <p className="text-[8px] text-gray-600 leading-tight">
                                            TEL: {company.phone || '3147272285'}
                                        </p>
                                        <p className="text-[8px] text-gray-600 uppercase leading-tight">
                                            {company.city || 'IBAGUÉ'}
                                        </p>
                                    </div>

                                    {/* Right: Remission Box */}
                                    <div className="border border-gray-400 rounded overflow-hidden" style={{ width: '180px' }}>
                                        <div className="bg-gray-100 border-b border-gray-400 py-0.5 text-center">
                                            <h2 className="text-[9px] font-bold text-gray-700">* REMISIÓN *</h2>
                                        </div>
                                        <div className="py-1 text-center">
                                            <p className="text-base font-bold text-gray-900">{invoice.number?.toString().padStart(8, '0')}</p>
                                        </div>
                                        <div className="bg-gray-100 border-t border-gray-400 py-0.5 px-1 flex justify-between text-[7px] text-gray-600">
                                            <span>Fecha: {new Date(invoice.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            <span>Vence: {new Date(new Date(invoice.created_at).setDate(new Date(invoice.created_at).getDate() + 30)).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Customer Info Box */}
                                <div className="border-t border-b border-gray-300 py-1 mb-2">
                                    <div className="flex gap-4 mb-2 text-[8px] leading-tight w-full">
                                        {/* Left Column: Customer Info */}
                                        <div className="flex-1 space-y-0.5">
                                            <div className="flex">
                                                <span className="font-bold w-14 text-gray-600">Cliente:</span>
                                                <span className="uppercase font-medium">{invoice.customers?.name}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="font-bold w-14 text-gray-600">CC/NIT:</span>
                                                <span>{invoice.customers?.nit_cedula}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="font-bold w-14 text-gray-600">Dir:</span>
                                                <span className="uppercase text-[7px]">{invoice.customers?.address || 'N/A'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="font-bold w-14 text-gray-600">Tel:</span>
                                                <span>{invoice.customers?.phone || 'N/A'}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="font-bold w-14 text-gray-600">Ciudad:</span>
                                                <span className="uppercase">{invoice.customers?.city || 'N/A'}</span>
                                            </div>
                                        </div>

                                        {/* Right Column: Order Info */}
                                        <div className="flex-1 space-y-0.5">
                                            <div className="flex">
                                                <span className="font-bold w-20 text-gray-600">Fecha inicio:</span>
                                                <span>{new Date(invoice.created_at).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="font-bold w-20 text-gray-600">Vencimiento:</span>
                                                <span>{new Date(new Date(invoice.created_at).setDate(new Date(invoice.created_at).getDate() + 30)).toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })}</span>
                                            </div>
                                            <div className="flex">
                                                <span className="font-bold w-20 text-gray-600">Vendedor:</span>
                                                <span className="uppercase text-[7px]">{invoice.seller?.full_name || 'N/A'}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                        {/* Table Header Row */}
                        <tr className="border-t border-b border-gray-400">
                            <th className="py-0.5 text-center w-6 text-gray-700 font-bold text-[8px]">CR</th>
                            <th className="py-0.5 text-center w-10 text-gray-700 font-bold text-[8px]">UNID</th>
                            <th className="py-0.5 text-left pl-1 text-gray-700 font-bold w-20 text-[8px]">REF</th>
                            <th className="py-0.5 text-left pl-1 text-gray-700 font-bold text-[8px]">CONCEPTO</th>
                            <th className="py-0.5 text-right pr-1 text-gray-700 font-bold w-16 text-[8px]">V.UNIT</th>
                            <th className="py-0.5 text-right pr-1 text-gray-700 font-bold w-16 text-[8px]">TOTAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {invoice.invoice_items?.map((item: any, idx: number) => (
                            <tr key={idx} className="print-row">
                                <td className="py-0 text-center text-gray-500 text-[8px] leading-tight">{idx + 1}</td>
                                <td className="py-0 text-center font-medium text-[8px] leading-tight">{item.quantity}</td>
                                <td className="py-0 pl-1 text-gray-500 text-[7px] leading-tight">{item.products?.code || item.products?.sku || '-'}</td>
                                <td className="py-0 pl-1 uppercase font-medium text-[8px] leading-tight">{item.products?.name}</td>
                                <td className="py-0 text-right pr-1 text-gray-600 text-[8px] leading-tight">{formatCurrency(item.unit_price)}</td>
                                <td className="py-0 text-right pr-1 font-bold text-gray-900 text-[8px] leading-tight">{formatCurrency(item.total)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr className="border-t-2 border-gray-400">
                            <td colSpan={4}></td>
                            <td className="py-1 text-right font-bold text-gray-800 border border-gray-400 bg-gray-100 text-[9px] pr-1">TOTAL</td>
                            <td className="py-1 text-right font-bold text-black border border-gray-400 text-[9px] pr-1">{formatCurrency(invoice.total)}</td>
                        </tr>
                        <tr>
                            <td colSpan={6} className="p-0 border-none">
                                {/* Footer Notes */}
                                <div className="text-center mt-2">
                                    <p className="text-[7px] font-bold uppercase text-gray-600 border-t border-gray-300 pt-1 inline-block px-8">
                                        NOTA: DESPUES DE 8 DIAS NO SE ACEPTAN DEVOLUCIONES
                                    </p>
                                </div>
                            </td>
                        </tr>
                    </tfoot>
                </table>
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
