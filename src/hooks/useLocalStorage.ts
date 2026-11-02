import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'

type StorageStatus = 'loading' | 'saving' | 'saved' | 'error'

/**
 * localStorage-backed state with a small debounce so rapid speech/timer updates
 * don't serialize the whole workspace on every keystroke.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T),
  delay = 450,
): {
  value: T
  setValue: Dispatch<SetStateAction<T>>
  status: StorageStatus
  error: string | null
  clear: () => void
} {
  const [value, setValue] = useState<T>(() => {
    try {
      const stored = window.localStorage.getItem(key)
      if (stored) return JSON.parse(stored) as T
    } catch (error) {
      console.warn(`[useLocalStorage] 无法读取 ${key}`, error)
    }
    return typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue
  })
  const [status, setStatus] = useState<StorageStatus>('loading')
  const [error, setError] = useState<string | null>(null)
  const firstWrite = useRef(true)

  useEffect(() => {
    setStatus('saving')
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(key, JSON.stringify(value))
        setError(null)
        setStatus('saved')
      } catch (storageError) {
        console.error('[useLocalStorage] 写入失败', storageError)
        setError('本地存储空间不足，最新改动可能未保存')
        setStatus('error')
      }
      firstWrite.current = false
    }, firstWrite.current ? 80 : delay)

    return () => window.clearTimeout(timer)
  }, [key, value, delay])

  const clear = useCallback(() => {
    try {
      window.localStorage.removeItem(key)
    } catch {
      // noop
    }
  }, [key])

  return { value, setValue, status, error, clear }
}
