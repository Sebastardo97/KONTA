'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type UserRole = 'admin' | 'seller' | null

interface UseRoleReturn {
    role: UserRole
    isAdmin: boolean
    isSeller: boolean
    loading: boolean
    userId: string | null
}

/**
 * Custom hook to get the current user's role
 * @returns Object with role, helper booleans, loading state, and userId
 */
export function useRole(): UseRoleReturn {
    const [role, setRole] = useState<UserRole>(null)
    const [loading, setLoading] = useState(true)
    const [userId, setUserId] = useState<string | null>(null)

    useEffect(() => {
        async function fetchUserRole() {
            try {
                setLoading(true)

                // Get current user
                const { data: { user }, error: userError } = await supabase.auth.getUser()

                if (userError || !user) {
                    console.log('❌ useRole: No authenticated user found')
                    setRole(null)
                    setUserId(null)
                    return
                }

                setUserId(user.id)
                console.log('🔍 useRole: User found:', user.email)
                console.log('📋 useRole: Metadata role:', user.user_metadata?.role)

                // OPTIMIZATION: Check metadata first
                if (user.user_metadata?.role) {
                    console.log('✅ useRole: Using role from Metadata:', user.user_metadata.role)
                    setRole(user.user_metadata.role as UserRole)
                    setLoading(false)
                    return
                }

                console.log('⚠️ useRole: No metadata role, checking DB profile...')

                // Fallback: Get user profile with role from DB
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single()

                console.log('🗄️ useRole: DB Profile result:', { profile, error: profileError })

                if (profileError || !profile) {
                    console.error('Error fetching profile:', profileError)
                    setRole(null)
                    return
                }

                setRole(profile.role as UserRole)
            } catch (error) {
                console.error('Error in useRole:', error)
                setRole(null)
            } finally {
                setLoading(false)
            }
        }

        fetchUserRole()

        // Subscribe to auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
            fetchUserRole()
        })

        return () => {
            subscription.unsubscribe()
        }
    }, [])

    return {
        role,
        isAdmin: role === 'admin',
        isSeller: role === 'seller',
        loading,
        userId,
    }
}
