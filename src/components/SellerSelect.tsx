'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from 'lucide-react'

interface Seller {
    id: string
    user_id: string
    full_name: string
    is_active: boolean
}

interface SellerSelectProps {
    value: string | null
    onChange: (sellerId: string | null) => void
    required?: boolean
    disabled?: boolean
    className?: string
    label?: string
}

/**
 * Reusable component for selecting a seller
 * Fetches active sellers from the database
 */
export function SellerSelect({
    value,
    onChange,
    required = false,
    disabled = false,
    className = '',
    label = 'Vendedor',
}: SellerSelectProps) {
    const [sellers, setSellers] = useState<Seller[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchSellers() {
            try {
                setLoading(true)

                // Get all profiles with seller or admin role
                const { data, error } = await supabase
                    .from('profiles')
                    .select('id, full_name, email, role')
                    .in('role', ['seller', 'admin'])
                    .order('full_name')

                if (error) {
                    console.error('Error fetching sellers:', error)
                    return
                }

                // Map to seller format
                const sellersData: Seller[] = (data || []).map(profile => ({
                    id: profile.id,
                    user_id: profile.id,
                    full_name: profile.full_name || profile.email || 'Sin nombre',
                    is_active: true
                }))

                setSellers(sellersData)
            } catch (error) {
                console.error('Error in fetchSellers:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchSellers()
    }, [])

    return (
        <div className={className}>
            {label && (
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    <User className="inline h-4 w-4 mr-1" />
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <select
                value={value || ''}
                onChange={(e) => onChange(e.target.value || null)}
                required={required}
                disabled={disabled || loading}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
            >
                <option value="">
                    {loading ? 'Cargando vendedores...' : 'Seleccionar vendedor'}
                </option>

                {sellers.map((seller) => (
                    <option key={seller.id} value={seller.user_id}>
                        {seller.full_name}
                    </option>
                ))}
            </select>

            {sellers.length === 0 && !loading && (
                <p className="mt-1 text-sm text-yellow-600">
                    No hay vendedores disponibles
                </p>
            )}
        </div>
    )
}
