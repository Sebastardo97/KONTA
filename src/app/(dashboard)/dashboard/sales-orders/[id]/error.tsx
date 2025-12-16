'use client'

import { useEffect } from 'react'
import { AlertCircle } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Sales Order Detail Error:', error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <h2 className="text-xl font-bold text-gray-900">¡Algo salió mal!</h2>
            <p className="text-gray-600 max-w-md text-center">
                Ha ocurrido un error al cargar la orden de venta.
            </p>
            <div className="bg-red-50 p-4 rounded-lg text-sm text-red-800 font-mono text-left w-full max-w-lg overflow-auto">
                {error.message || 'Error desconocido'}
                {error.stack && (
                    <details className="mt-2 text-xs">
                        <summary>Detalles técnicos</summary>
                        <pre className="mt-2 whitespace-pre-wrap">{error.stack}</pre>
                    </details>
                )}
            </div>
            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
                Intentar de nuevo
            </button>
        </div>
    )
}
