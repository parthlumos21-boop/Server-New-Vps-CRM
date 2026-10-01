import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { auditClient } from '../../services/auditClient'

const getActorMode = (user) => {
  const role = String(user?.role || '').toLowerCase()
  return role === 'admin' || role === 'super_admin' ? 'admin' : 'user'
}

const AuditTrailReporter = () => {
  const location = useLocation()
  const { user } = useAuth()
  const lastRouteRef = useRef('')

  useEffect(() => {
    if (!user) return

    const route = `${location.pathname}${location.search}`
    if (lastRouteRef.current === route) return
    lastRouteRef.current = route

    auditClient.record('frontend.route.viewed', {
      actorMode: getActorMode(user),
      role: user.role,
      actualRole: user.actualRole,
      userId: user.id,
      route,
    })
  }, [location.pathname, location.search, user])

  useEffect(() => {
    if (!user) return undefined

    const handleError = (event) => {
      auditClient.record('frontend.error', {
        actorMode: getActorMode(user),
        role: user.role,
        message: event.message,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
      })
    }

    const handleRejection = (event) => {
      auditClient.record('frontend.promise_rejection', {
        actorMode: getActorMode(user),
        role: user.role,
        reason: event.reason?.message || String(event.reason || ''),
      })
    }

    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleRejection)

    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleRejection)
    }
  }, [user])

  return null
}

export default AuditTrailReporter
