import { create } from 'zustand'

export type CartItem = {
    productId: string
    name: string
    price: number
    quantity: number
    stock: number // [NEW] Added to track available stock
    taxRate: number
    discount: number // Discount percentage (0-100)
}

type CartState = {
    items: CartItem[]
    addItem: (product: any) => void
    removeItem: (productId: string) => void
    updateQuantity: (productId: string, quantity: number) => void
    updateDiscount: (productId: string, discount: number) => void
    clearCart: () => void
    total: () => number
}

export const useCartStore = create<CartState>((set, get) => ({
    items: [],
    addItem: (product) => {
        // VALIDATION: Check if product has stock before adding
        if (!product.stock || product.stock <= 0) {
            alert(`❌ "${product.name}" está agotado. No hay unidades disponibles.`)
            return
        }

        const items = get().items
        const existingItem = items.find(item => item.productId === product.id)

        if (existingItem) {
            set({
                items: items.map(item => {
                    if (item.productId === product.id) {
                        const newQuantity = item.quantity + 1
                        if (newQuantity > item.stock) {
                            setTimeout(() => {
                                alert(`⚠️ Solo hay ${item.stock} unidades disponibles de "${item.name}"`)
                            }, 0)
                            return item // Stay at max, don't increase
                        }
                        return { ...item, quantity: newQuantity }
                    }
                    return item
                })
            })
        } else {
            set({
                items: [...items, {
                    productId: product.id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    stock: product.stock,
                    taxRate: product.tax_rate || 19,
                    discount: 0
                }]
            })
        }
    },
    removeItem: (productId) => {
        set({ items: get().items.filter(item => item.productId !== productId) })
    },
    updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
            get().removeItem(productId)
            return
        }
        set({
            items: get().items.map(item => {
                if (item.productId === productId) {
                    if (quantity > item.stock) {
                        setTimeout(() => {
                            alert(`⚠️ Solo hay ${item.stock} unidades disponibles de "${item.name}"`)
                        }, 0)
                        return { ...item, quantity: item.stock } // Clamp to max
                    }
                    return { ...item, quantity }
                }
                return item
            })
        })
    },
    updateDiscount: (productId, discount) => {
        set({
            items: get().items.map(item =>
                item.productId === productId ? { ...item, discount } : item
            )
        })
    },
    clearCart: () => set({ items: [] }),
    total: () => {
        return get().items.reduce((acc, item) => {
            const discountedPrice = item.price * (1 - item.discount / 100)
            return acc + (discountedPrice * item.quantity)
        }, 0)
    }
}))
