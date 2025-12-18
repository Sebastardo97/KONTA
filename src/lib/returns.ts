import { supabase } from '@/lib/supabase'

export interface ReturnItem {
    product_id: string
    quantity: number
    unit_price: number
}

export async function processReturn(
    invoiceId: string,
    items: ReturnItem[],
    reason: string,
    userId: string
) {
    const { data, error } = await supabase.rpc('process_return', {
        p_invoice_id: invoiceId,
        p_items: items,
        p_reason: reason,
        p_user_id: userId
    })

    if (error) {
        console.error('Error processing return:', error)
        throw error
    }

    return data
}

export async function getCreditNotesByInvoice(invoiceId: string) {
    const { data, error } = await supabase
        .from('credit_notes')
        .select(`
            *,
            credit_note_items (
                *,
                products (name)
            ),
            created_by_user:created_by (email)
        `)
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}
