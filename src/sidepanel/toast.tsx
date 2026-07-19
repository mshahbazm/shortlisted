// One transient toast, bottom-center. showToast() from anywhere in the side
// panel; <Toasts/> is mounted once in App.

import { useEffect, useRef, useState } from 'react'

let listener: ((msg: string) => void) | null = null

export function showToast(msg: string): void {
  listener?.(msg)
}

export function Toasts() {
  const [msg, setMsg] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    listener = (m: string) => {
      setMsg(m)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setMsg(null), 1800)
    }
    return () => {
      listener = null
      window.clearTimeout(timer.current)
    }
  }, [])

  if (!msg) return null
  return <div className="toast">{msg}</div>
}
