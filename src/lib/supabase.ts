import { createBrowserClient } from '@supabase/ssr'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const isDesktop = process.env.NEXT_PUBLIC_IS_DESKTOP === 'true'

// Use standard client with explicit LocalStorage for Desktop (Electron)
// Use SSR client for Web (Cookie-based)
export const supabase = isDesktop
    ? createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
            persistSession: true,
            storageKey: 'supabase.auth.token', // Explicit key
            storage: typeof window !== 'undefined' ? window.localStorage : undefined,
            detectSessionInUrl: false, // Disable URL detection to prevent hash issues in Electron
            autoRefreshToken: true,
        }
    })
    : createBrowserClient(
        supabaseUrl,
        supabaseAnonKey
    )
