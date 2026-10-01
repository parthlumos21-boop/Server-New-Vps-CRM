import { useEffect, useRef } from 'react'

export const useClickOutside = (refOrCallback, maybeCallback) => {
  const ref = useRef(null)
  const hasExternalRef = typeof refOrCallback !== 'function'
  const targetRef = hasExternalRef ? refOrCallback : ref
  const callback = hasExternalRef ? maybeCallback : refOrCallback

  useEffect(() => {
    if (typeof callback !== 'function') {
      return undefined
    }

    const handleClick = (event) => {
      if (targetRef.current && !targetRef.current.contains(event.target)) {
        callback()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('touchstart', handleClick)

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('touchstart', handleClick)
    }
  }, [callback, targetRef])

  return targetRef
}
