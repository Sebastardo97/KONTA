import { useState, useRef } from 'react'
import * as XLSX from 'xlsx'
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ImportProductsModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess: () => void
}

export default function ImportProductsModal({ isOpen, onClose, onSuccess }: ImportProductsModalProps) {
    const [isDragging, setIsDragging] = useState(false)
    const [file, setFile] = useState<File | null>(null)
    const [previewData, setPreviewData] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [successCount, setSuccessCount] = useState<number>(0)
    const fileInputRef = useRef<HTMLInputElement>(null)

    if (!isOpen) return null

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        const droppedFile = e.dataTransfer.files[0]
        if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.csv'))) {
            handleFileSelect(droppedFile)
        } else {
            setError('Por favor sube un archivo Excel (.xlsx) o CSV válido.')
        }
    }

    const handleFileSelect = async (selectedFile: File) => {
        setFile(selectedFile)
        setError(null)
        setSuccessCount(0)

        const reader = new FileReader()
        reader.onload = (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData = XLSX.utils.sheet_to_json(sheet)
                setPreviewData(jsonData.slice(0, 5)) // Preview first 5 rows
            } catch (err) {
                console.error(err)
                setError('Error al leer el archivo. Asegúrate de que sea un Excel válido.')
            }
        }
        reader.readAsBinaryString(selectedFile)
    }

    const downloadTemplate = () => {
        const template = [
            {
                Codigo: 'PROD001',
                Nombre: 'Producto Ejemplo',
                Descripcion: 'Descripción del producto',
                Precio: 15000,
                Stock: 100,
                IVA: 19
            }
        ]
        const ws = XLSX.utils.json_to_sheet(template)
        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, 'Plantilla')
        XLSX.writeFile(wb, 'plantilla_inventario.xlsx')
    }

    const handleImport = async () => {
        if (!file) return

        setLoading(true)
        setError(null)

        const reader = new FileReader()
        reader.onload = async (e) => {
            try {
                const data = e.target?.result
                const workbook = XLSX.read(data, { type: 'binary' })
                const sheetName = workbook.SheetNames[0]
                const sheet = workbook.Sheets[sheetName]
                const jsonData: any[] = XLSX.utils.sheet_to_json(sheet)

                if (jsonData.length === 0) {
                    throw new Error('El archivo está vacío.')
                }

                const productsToInsert = jsonData.map(row => ({
                    code: row['Codigo']?.toString() || '',
                    name: row['Nombre']?.toString() || '',
                    description: row['Descripcion']?.toString() || '',
                    price: parseFloat(row['Precio'] || '0'),
                    stock: parseInt(row['Stock'] || '0'),
                    tax_rate: parseInt(row['IVA'] || '0')
                })).filter(p => p.code && p.name && p.price >= 0) // Basic validation

                if (productsToInsert.length === 0) {
                    throw new Error('No se encontraron productos válidos para importar. Revisa las columnas.')
                }

                const { error: insertError } = await supabase
                    .from('products')
                    .insert(productsToInsert)

                if (insertError) throw insertError

                setSuccessCount(productsToInsert.length)
                setTimeout(() => {
                    onSuccess()
                    onClose()
                }, 2000)

            } catch (err: any) {
                console.error(err)
                setError(err.message || 'Error durante la importación.')
            } finally {
                setLoading(false)
            }
        }
        reader.readAsBinaryString(file)
    }

    return (
        <div className="fixed z-50 inset-0 overflow-y-auto">
            <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                <div className="fixed inset-0 transition-opacity" onClick={onClose}>
                    <div className="absolute inset-0 bg-gray-900 opacity-25 backdrop-blur-sm"></div>
                </div>
                <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                <div className="relative z-10 inline-block align-bottom bg-white rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg md:max-w-2xl sm:w-full border border-gray-100">

                    {/* Header */}
                    <div className="bg-white px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                            <FileSpreadsheet className="h-5 w-5 text-green-600" />
                            Importar Inventario
                        </h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <div className="p-6">
                        {/* Download Template Step */}
                        <div className="mb-6 p-4 bg-blue-50 rounded-lg flex items-start gap-3">
                            <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                <Download className="h-5 w-5" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold text-blue-900">1. Descarga la plantilla</h4>
                                <p className="text-sm text-blue-700 mt-1 mb-2">Usa este archivo para asegurarte de que tus datos tengan el formato correcto.</p>
                                <button
                                    onClick={downloadTemplate}
                                    className="text-sm font-medium text-blue-700 hover:text-blue-800 underline"
                                >
                                    Descargar plantilla.xlsx
                                </button>
                            </div>
                        </div>

                        {/* Upload Area */}
                        {!file && !successCount ? (
                            <div
                                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                                    }`}
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                <div className="mx-auto h-12 w-12 text-gray-400 mb-3">
                                    <Upload className="h-full w-full" />
                                </div>
                                <p className="text-sm font-medium text-gray-900">
                                    Arrastra tu archivo aquí o
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="text-blue-600 hover:text-blue-700 mx-1 font-semibold"
                                    >
                                        selecciónalo
                                    </button>
                                </p>
                                <p className="text-xs text-gray-500 mt-1">Soporta .xlsx y .csv</p>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".xlsx,.csv"
                                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                                />
                            </div>
                        ) : successCount > 0 ? (
                            <div className="text-center p-8 bg-green-50 rounded-xl">
                                <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-3" />
                                <h4 className="text-lg font-bold text-green-900">¡Importación Exitosa!</h4>
                                <p className="text-green-700">Se han importado {successCount} productos correctamente.</p>
                            </div>
                        ) : (
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600 font-bold text-xs">
                                            XLS
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-gray-900">{file!.name}</p>
                                            <p className="text-xs text-gray-500">{(file!.size / 1024).toFixed(1)} KB</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setFile(null)} className="text-gray-400 hover:text-red-500">
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {previewData.length > 0 && (
                                    <div className="mt-4">
                                        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Vista Previa (Primeras 5 filas)</p>
                                        <div className="overflow-x-auto">
                                            <table className="min-w-full text-xs text-left">
                                                <thead className="bg-gray-100 text-gray-500">
                                                    <tr>
                                                        <th className="px-2 py-1 rounded-tl-md">Codigo</th>
                                                        <th className="px-2 py-1">Nombre</th>
                                                        <th className="px-2 py-1">Precio</th>
                                                        <th className="px-2 py-1 rounded-tr-md">Stock</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {previewData.map((row, i) => (
                                                        <tr key={i}>
                                                            <td className="px-2 py-1 font-mono text-gray-600">{row.Codigo}</td>
                                                            <td className="px-2 py-1 text-gray-900 font-medium truncate max-w-[100px]">{row.Nombre}</td>
                                                            <td className="px-2 py-1 text-gray-600">${row.Precio}</td>
                                                            <td className="px-2 py-1 text-gray-600">{row.Stock}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {error && (
                            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm flex items-start gap-2">
                                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                                <p>{error}</p>
                            </div>
                        )}
                    </div>

                    {!successCount && (
                        <div className="bg-gray-50 px-6 py-4 flex flex-row-reverse gap-2 border-t border-gray-100">
                            <button
                                onClick={handleImport}
                                disabled={!file || loading}
                                className={`w-full sm:w-auto inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white sm:text-sm ${!file || loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                                    }`}
                            >
                                {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                {loading ? 'Importando...' : 'Importar Productos'}
                            </button>
                            <button
                                onClick={onClose}
                                disabled={loading}
                                className="w-full sm:w-auto inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:text-sm"
                            >
                                Cancelar
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
