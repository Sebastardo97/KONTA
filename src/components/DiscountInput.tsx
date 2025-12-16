'use client'

import { useState, useEffect } from 'react'
import { Percent } from 'lucide-react'

interface DiscountInputProps {
    value: number
    onChange: (discount: number) => void
    unitPrice: number
    quantity: number
    label?: string
    className?: string
    disabled?: boolean
    showCalculation?: boolean
}

/**
 * Reusable component for discount percentage input
 * Shows real-time price calculation with discount
 */
export function DiscountInput({
    value,
    onChange,
    unitPrice,
    quantity,
    label = 'Descuento',
    className = '',
    disabled = false,
    showCalculation = true,
}: DiscountInputProps) {
    const [localValue, setLocalValue] = useState(value.toString())

    useEffect(() => {
        setLocalValue(value.toString())
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value

        // Allow empty string or valid numbers
        if (newValue === '' || /^\d*\.?\d*$/.test(newValue)) {
            setLocalValue(newValue)
        }
    }

    const handleBlur = () => {
        let numValue = parseFloat(localValue)

        // Validate range
        if (isNaN(numValue) || numValue < 0) {
            numValue = 0
        } else if (numValue > 100) {
            numValue = 100
        }

        setLocalValue(numValue.toString())
        onChange(numValue)
    }

    // Calculate prices
    const originalPrice = unitPrice * quantity
    const discountAmount = originalPrice * (value / 100)
    const finalPrice = originalPrice - discountAmount

    return (
        <div className={className}>
            <label className="block text-sm font-medium text-gray-700 mb-1">
                <Percent className="inline h-4 w-4 mr-1" />
                {label}
            </label>

            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        type="text"
                        inputMode="decimal"
                        value={localValue}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        disabled={disabled}
                        placeholder="0"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:bg-gray-100 pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        %
                    </span>
                </div>

                {showCalculation && value > 0 && (
                    <div className="text-sm text-gray-600 whitespace-nowrap">
                        <span className="line-through text-gray-400">
                            ${originalPrice.toLocaleString()}
                        </span>
                        {' → '}
                        <span className="font-semibold text-green-600">
                            ${finalPrice.toLocaleString()}
                        </span>
                    </div>
                )}
            </div>

            {/* Validation message */}
            {value < 0 || value > 100 ? (
                <p className="mt-1 text-sm text-red-600">
                    El descuento debe estar entre 0% y 100%
                </p>
            ) : null}

            {/* Discount breakdown (optional) */}
            {showCalculation && value > 0 && (
                <p className="mt-1 text-xs text-gray-500">
                    Ahorro: ${discountAmount.toLocaleString()} ({value}% de descuento)
                </p>
            )}
        </div>
    )
}
