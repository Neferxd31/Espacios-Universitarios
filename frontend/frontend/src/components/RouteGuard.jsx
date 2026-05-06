"use client"

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { isAuthenticated, getUser } from '@/lib/authStorage'

export default function RouteGuard({ children, requireAdmin = false }) {
  const router = useRouter()
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isAuthenticated()) {
      router.replace('/login')
      return
    }

    if (requireAdmin) {
      const user = getUser()
      const roleName = user?.role?.name?.toLowerCase() || ''
      if (roleName !== 'admin' && roleName !== 'administrativo') {
        router.replace('/spaces')
        return
      }
    }

    setReady(true)
  }, [router, requireAdmin])

  if (!ready) return null

  return children
}
