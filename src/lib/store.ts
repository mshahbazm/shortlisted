import { StorageShape, storageDefaults } from './types'

type Key = keyof StorageShape

export async function get<K extends Key>(key: K): Promise<StorageShape[K]> {
  const res = await chrome.storage.local.get(key)
  return res[key] ?? storageDefaults()[key]
}

export async function getAll(): Promise<StorageShape> {
  const res = await chrome.storage.local.get(null)
  return { ...storageDefaults(), ...res } as StorageShape
}

export async function set<K extends Key>(key: K, value: StorageShape[K]): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}

export async function update<K extends Key>(
  key: K,
  fn: (current: StorageShape[K]) => StorageShape[K],
): Promise<StorageShape[K]> {
  const current = await get(key)
  const next = fn(current)
  await set(key, next)
  return next
}

export function onChange<K extends Key>(key: K, cb: (value: StorageShape[K]) => void): () => void {
  const listener = (changes: { [k: string]: chrome.storage.StorageChange }, area: string) => {
    if (area === 'local' && changes[key]) cb(changes[key].newValue ?? storageDefaults()[key])
  }
  chrome.storage.onChanged.addListener(listener)
  return () => chrome.storage.onChanged.removeListener(listener)
}
