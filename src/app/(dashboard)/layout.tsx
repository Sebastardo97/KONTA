'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
    LayoutDashboard,
    ShoppingCart,
    Package,
    Users,
    FileText,
    Settings,
    LogOut,
    Menu,
    X,
    BarChart,
    Truck,
    ArrowUpRight,
    ClipboardList,
    UserCog,
    TrendingUp,
    Award,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useRole } from '@/hooks/useRole'

// Admin navigation - full access
const adminNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'POS', href: '/dashboard/pos', icon: ShoppingCart },
    { name: 'Historial POS', href: '/dashboard/invoices/pos', icon: FileText },
    { name: 'Facturas Normal', href: '/dashboard/invoices/normal', icon: FileText },
    { name: 'Productos', href: '/dashboard/products', icon: Package },
    { name: 'Clientes', href: '/dashboard/customers', icon: Users },
    { name: 'Proveedores', href: '/dashboard/suppliers', icon: Truck },
    { name: 'Gastos', href: '/dashboard/purchases', icon: ArrowUpRight },
    { name: 'Órdenes de Venta', href: '/dashboard/sales-orders', icon: ClipboardList },
    { name: 'Vendedores', href: '/dashboard/sellers', icon: UserCog },
    { name: 'Reportes Ventas', href: '/dashboard/reports/sales-by-seller', icon: BarChart },
    { name: 'Mi Desempeño', href: '/dashboard/my-performance', icon: TrendingUp },
    { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
]

// Seller navigation - limited access
const sellerNavigation = [
    { name: 'POS', href: '/dashboard/pos', icon: ShoppingCart },
    { name: 'Historial POS', href: '/dashboard/invoices/pos', icon: FileText },
    { name: 'Facturas Normal', href: '/dashboard/invoices/normal', icon: FileText },
    { name: 'Ver Productos', href: '/dashboard/products', icon: Package },
    { name: 'Mis Órdenes', href: '/dashboard/my-orders', icon: ClipboardList },
    { name: 'Mi Desempeño', href: '/dashboard/my-performance', icon: TrendingUp },
]

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const pathname = usePathname()
    const router = useRouter()
    const { role, loading } = useRole()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push('/login')
    }

    // Choose navigation based on role
    const navigation = role === 'admin' ? adminNavigation : sellerNavigation

    return (
        <div className="min-h-screen">
            {/* Mobile sidebar overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-64 md:w-72 lg:w-64 bg-white shadow-lg transform transition-transform duration-200 ease-in-out md:translate-x-0 md:fixed md:inset-y-0 print:hidden",
                sidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="flex flex-col h-full">
                    <div className="flex items-center justify-center h-16 px-4 bg-blue-600 text-white font-bold text-xl tracking-widest">
                        KONTA
                        {/* Show role badge */}
                        {role && (
                            <span className="ml-2 text-xs bg-blue-500 px-2 py-1 rounded">
                                {role === 'admin' ? 'Admin' : 'Vendedor'}
                            </span>
                        )}
                    </div>

                    <div className="flex-1 flex flex-col overflow-y-auto pt-5 pb-4">
                        {loading ? (
                            <div className="px-4 text-center text-gray-500">
                                <p className="text-sm">Cargando...</p>
                            </div>
                        ) : (
                            <nav className="mt-5 flex-1 px-2 space-y-1">
                                {navigation.map((item) => {
                                    const isActive = pathname === item.href ||
                                        pathname.startsWith(item.href + '/')
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                isActive
                                                    ? 'bg-blue-50 text-blue-600'
                                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                                                'group flex items-center px-2 py-2 text-sm font-medium rounded-md transition-colors'
                                            )}
                                        >
                                            <item.icon
                                                className={cn(
                                                    isActive ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-500',
                                                    'mr-3 flex-shrink-0 h-6 w-6'
                                                )}
                                                aria-hidden="true"
                                            />
                                            {item.name}
                                        </Link>
                                    )
                                })}
                            </nav>
                        )}
                    </div>

                    <div className="flex-shrink-0 flex border-t border-gray-200 p-4">
                        <button
                            onClick={handleSignOut}
                            className="flex-shrink-0 w-full group block"
                        >
                            <div className="flex items-center">
                                <LogOut className="inline-block h-5 w-5 text-gray-400 group-hover:text-gray-500" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                                        Cerrar Sesión
                                    </p>
                                </div>
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main content */}
            <div className="flex flex-col flex-1 md:pl-72 lg:pl-64 print:pl-0">
                <div className="sticky top-0 z-10 md:hidden pl-2 pt-2 sm:pl-4 sm:pt-4 bg-gray-100 print:hidden">
                    <button
                        type="button"
                        className="-ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-md text-gray-500 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Menu className="h-6 w-6" aria-hidden="true" />
                    </button>
                </div>
                <main className="flex-1">
                    <div className="py-6">
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </div >
    )
}
