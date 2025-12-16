'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, Save, User, Phone, CreditCard, MapPin } from 'lucide-react'

interface EditSellerModalProps {
    seller: {
        id: string
        email: string
        full_name: string | null
        phone: string | null
        document_id: string | null
        address: string | null
    } | null
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export function EditSellerModal({ seller, isOpen, onClose, onSuccess }: EditSellerModalProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        phone: '',
        document_id: '',
        address: ''
    })
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (seller) {
            setFormData({
                full_name: seller.full_name || '',
                phone: seller.phone || '',
                document_id: seller.document_id || '',
                address: seller.address || ''
            })
        }
    }, [seller])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!seller) return

        try {
            setSaving(true)
            setError(null)

            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    full_name: formData.full_name,
                    phone: formData.phone,
                    document_id: formData.document_id,
                    address: formData.address
                })
                .eq('id', seller.id)

            if (updateError) throw updateError

            onSuccess()
            onClose()
        } catch (err: any) {
            setError(err.message || 'Error al actualizar el perfil')
        } finally {
            setSaving(false)
        }
    }

    if (!isOpen || !seller) return null

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex min-h-screen items-center justify-center p-4">
                {/* Overlay */}
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
                    onClick={onClose}
                />

                {/* Modal */}
                <div className="relative bg-white rounded-xl shadow-xl max-w-md w-full p-6 z-10">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-bold text-gray-900">Editar Vendedor</h3>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Email (read-only) */}
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600 mb-1">Email</p>
                        <p className="text-sm font-medium text-gray-900">{seller.email}</p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <User className="inline h-4 w-4 mr-1" />
                                Nombre Completo
                            </label>
                            <input
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Juan Pérez"
                                required
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <Phone className="inline h-4 w-4 mr-1" />
                                Teléfono
                            </label>
                            <input
                                type="tel"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="3001234567"
                            />
                        </div>

                        {/* Document ID */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <CreditCard className="inline h-4 w-4 mr-1" />
                                Identificación
                            </label>
                            <input
                                type="text"
                                value={formData.document_id}
                                onChange={(e) => setFormData({ ...formData, document_id: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="CC 1234567890"
                            />
                        </div>

                        {/* Address */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <MapPin className="inline h-4 w-4 mr-1" />
                                Dirección
                            </label>
                            <textarea
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                placeholder="Calle 123 #45-67"
                                rows={2}
                            />
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="p-3 bg-red-50 text-red-800 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 pt-2">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
                                disabled={saving}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={saving}
                            >
                                {saving ? (
                                    <>
                                        <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Guardando...
                                    </>
                                ) : (
                                    <>
                                        <Save className="h-4 w-4" />
                                        Guardar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    )
}
