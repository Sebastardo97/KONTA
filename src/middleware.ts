import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

// Routes that require admin access
const ADMIN_ROUTES = [
    '/dashboard/products',
    '/dashboard/suppliers',
    '/dashboard/purchases',
    '/dashboard/settings',
    '/dashboard/reports',
    // '/dashboard/sales-orders', // Handled component-level to allow shared detail view
    '/dashboard/sellers',
]

// Routes that sellers can access
const SELLER_ALLOWED_ROUTES = [
    '/dashboard/invoices',
    '/dashboard/pos',
    '/dashboard/my-orders',
]

export async function middleware(req: NextRequest) {
    let response = NextResponse.next({
        request: {
            headers: req.headers,
        },
    })

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                get(name: string) {
                    return req.cookies.get(name)?.value
                },
                set(name: string, value: string, options: CookieOptions) {
                    req.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value,
                        ...options,
                    })
                },
                remove(name: string, options: CookieOptions) {
                    req.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                    response = NextResponse.next({
                        request: {
                            headers: req.headers,
                        },
                    })
                    response.cookies.set({
                        name,
                        value: '',
                        ...options,
                    })
                },
            },
        }
    )

    // Refresh session if expired
    const {
        data: { session },
    } = await supabase.auth.getSession()

    // If no session and trying to access dashboard, redirect to login
    if (!session && req.nextUrl.pathname.startsWith('/dashboard')) {
        return NextResponse.redirect(new URL('/login', req.url))
    }

    // If there's a session, check role-based access
    if (session) {
        // OPTIMIZATION: Check metadata first to avoid DB call
        let userRole = session.user.user_metadata?.role

        // Fallback: If no role in metadata, fetch from DB (and maybe log warning)
        if (!userRole) {
            console.warn('⚠️ Role missing in metadata for user:', session.user.email)
            const { data: profile } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', session.user.id)
                .single()
            userRole = profile?.role
        }

        // Check if trying to access admin-only route
        const isAdminRoute = ADMIN_ROUTES.some((route) =>
            req.nextUrl.pathname.startsWith(route)
        )

        // If seller trying to access admin route, redirect to their dashboard
        if (isAdminRoute && userRole === 'seller') {
            console.log(`Seller blocked from accessing: ${req.nextUrl.pathname}`)
            return NextResponse.redirect(new URL('/dashboard/pos', req.url))
        }

        // Redirect to appropriate dashboard based on role
        if (req.nextUrl.pathname === '/dashboard' || req.nextUrl.pathname === '/dashboard/') {
            if (userRole === 'seller') {
                return NextResponse.redirect(new URL('/dashboard/pos', req.url))
            }
            // Admins stay on main dashboard
        }
    }

    return response
}

// Specify which routes this middleware should run on
export const config = {
    matcher: ['/dashboard/:path*'],
}
