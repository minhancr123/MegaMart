'use client'

import { useAuthStore } from "@/store/authStore"

export default function ProtectedRoute({children}: {children: React.ReactNode}) {
    const {user} = useAuthStore();
    return (
        <>{children}</>
    )
}