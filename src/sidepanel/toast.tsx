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
  return <div className="fixed bottom-[18px] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-primary px-4 py-2 text-[12.5px] font-semibold text-primary-fg shadow-[0_6px_20px_rgba(0,0,0,0.25)]">{msg}</div>
}
