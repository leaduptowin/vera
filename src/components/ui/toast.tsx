import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Check, Info, TriangleAlert, X } from 'lucide-react'
import { cn, uid } from '@/lib/utils'

type ToastTone = 'default' | 'success' | 'error'

interface ToastItem {
  id: string
  title: string
  description?: string
  tone: ToastTone
}

interface ToastContextValue {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const timers = useRef(new Map<string, number>())

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id)
    if (timer) window.clearTimeout(timer)
    timers.current.delete(id)
    setItems((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    ({
      title,
      description,
      tone = 'default',
    }: {
      title: string
      description?: string
      tone?: ToastTone
    }) => {
      const item: ToastItem = { id: uid('toast'), title, description, tone }
      setItems((prev) => [...prev.slice(-1), item])
      const timer = window.setTimeout(() => dismiss(item.id), 3400)
      timers.current.set(item.id, timer)
    },
    [dismiss],
  )

  useEffect(() => {
    return () => {
      timers.current.forEach((timer) => window.clearTimeout(timer))
    }
  }, [])

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed bottom-5 left-1/2 z-[80] flex w-[calc(100%-2rem)] max-w-[360px] -translate-x-1/2 flex-col items-stretch gap-2"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex animate-fade-up items-start gap-2.5 rounded-[9px] border border-white/[0.09] bg-[#1b1e29]/95 px-3.5 py-3 shadow-station backdrop-blur-xl',
              item.tone === 'error' && 'border-[#a86f6f]/30',
            )}
          >
            <span
              className={cn(
                'mt-0.5 grid h-4 w-4 shrink-0 place-content-center rounded-full',
                item.tone === 'success' && 'bg-[#5e7f69]/25 text-[#a7c3ae]',
                item.tone === 'error' && 'bg-[#8c5757]/25 text-[#d3a5a5]',
                item.tone === 'default' && 'bg-[#586b87]/25 text-[#a5b5cc]',
              )}
            >
              {item.tone === 'success' ? (
                <Check className="h-2.5 w-2.5" strokeWidth={3} />
              ) : item.tone === 'error' ? (
                <TriangleAlert className="h-2.5 w-2.5" />
              ) : (
                <Info className="h-2.5 w-2.5" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-medium leading-5 text-[#e2e5ea]">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-[11px] leading-4 text-[#8d94a0]">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              className="mt-0.5 rounded p-0.5 text-[#737b87] transition-colors hover:text-[#cdd2da]"
              aria-label="关闭提示"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}
