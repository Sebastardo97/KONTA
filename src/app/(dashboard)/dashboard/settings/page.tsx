'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function SettingsPage() {
    const [formData, setFormData] = useState({
        name: '',
        nit: '',
        resolution_number: '',
        address: '',
        phone: '',
        city: ''
    })
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchCompanySettings()
    }, [])

    const fetchCompanySettings = async () => {
        const { data } = await supabase
            .from('company_settings')
            .select('*')
            .limit(1)
            .single()

        if (data) {
            setFormData({
                name: data.name || '',
                nit: data.nit || '',
                resolution_number: data.resolution_number || '',
                address: data.address || '',
                phone: data.phone || '',
                city: data.city || ''
            })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Check if settings exist
            const { data: existing } = await supabase
                .from('company_settings')
                .select('id')
                .limit(1)
                .single()

            if (existing) {
                await supabase
                    .from('company_settings')
                    .update(formData)
                    .eq('id', existing.id)
            } else {
                await supabase
                    .from('company_settings')
                    .insert([formData])
            }

            alert('Configuración guardada exitosamente')
        } catch (error) {
            console.error('Error saving settings:', error)
            alert('Error al guardar la configuración')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Configuración de la Empresa</h1>

            <div className="bg-white shadow sm:rounded-lg">
                <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Nombre de la Empresa
                        </label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            NIT
                        </label>
                        <input
                            type="text"
                            required
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.nit}
                            onChange={(e) => setFormData({ ...formData, nit: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Número de Resolución DIAN
                        </label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.resolution_number}
                            onChange={(e) => setFormData({ ...formData, resolution_number: e.target.value })}
                            placeholder="Ej: 18760000001"
                        />
                        <p className="mt-2 text-sm text-gray-500">
                            Número de resolución de facturación electrónica emitido por la DIAN
                        </p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Ciudad
                            </label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Ej: Bogotá"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700">
                                Teléfono / Celular
                            </label>
                            <input
                                type="text"
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="Ej: 300 123 4567"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Dirección de Correspondencia
                        </label>
                        <input
                            type="text"
                            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            value={formData.address}
                            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                            placeholder="Ej: Calle 123 # 45-67, Barrio Centro"
                        />
                    </div>

                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={loading}
                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                        >
                            {loading ? 'Guardando...' : 'Guardar Configuración'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
