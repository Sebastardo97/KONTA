'use client'

import { ReactNode } from 'react'
import { useRole } from '@/hooks/useRole'
import { Loader2 } from 'lucide-react'

interface RoleGuardProps {
    children: ReactNode
    allowedRoles: ('admin' | 'seller')[]
    fallback?: ReactNode
    loadingFallback?: ReactNode
}

/**
 * Component that conditionally renders children based on user role
 * @param children - Content to render if user has allowed role
 * @param allowedRoles - Array of roles that can see the content
 * @param fallback - Content to render if user doesn't have allowed role
 * @param loadingFallback - Content to render while loading
 */
export function RoleGuard({
    children,
    allowedRoles,
    fallback = null,
    loadingFallback = (
        <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
        </div>
    ),
}: RoleGuardProps) {
    const { role, loading } = useRole()

    if (loading) {
        return <>{loadingFallback}</>
    }

    if (!role || !allowedRoles.includes(role)) {
        return <>{fallback}</>
    }

    return <>{children}</>
}

/**
 * Higher-order component version
 */
export function withRoleGuard<P extends object>(
    Component: React.ComponentType<P>,
    allowedRoles: ('admin' | 'seller')[]
) {
    return function RoleGuardedComponent(props: P) {
        return (
            <RoleGuard allowedRoles={allowedRoles}>
                <Component {...props} />
            </RoleGuard>
        )
    }
}
