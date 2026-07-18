import { useEffect, useState } from 'react'
import * as store from '../lib/store'
import { StorageShape, storageDefaults } from '../lib/types'

// Live view of one storage key: reads once, then follows chrome.storage changes.
// `loaded` is false until the first real read lands — render-gating on it avoids
// UI decisions made against the defaults (e.g. sections auto-opening).
export function useStore<K extends keyof StorageShape>(
  key: K,
): [StorageShape[K], (v: StorageShape[K]) => void, boolean] {
  const [state, setState] = useState<{ value: StorageShape[K]; loaded: boolean }>({
    value: storageDefaults()[key],
    loaded: false,
  })

  useEffect(() => {
    let alive = true
    void store.get(key).then((v) => {
      if (alive) setState({ value: v, loaded: true })
    })
    const off = store.onChange(key, (v) => setState({ value: v, loaded: true }))
    return () => {
      alive = false
      off()
    }
  }, [key])

  const save = (v: StorageShape[K]) => {
    setState({ value: v, loaded: true })
    void store.set(key, v)
  }
  return [state.value, save, state.loaded]
}
