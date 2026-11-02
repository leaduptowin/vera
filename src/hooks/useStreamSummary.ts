import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { MeetingSession } from '@/types'
import { buildSummaryPrompt, mockSummarySSE } from '@/lib/mock-llm'
import { serializeSummaryMarkdown } from '@/lib/summary-parser'

export interface UseStreamSummaryOptions {
  session: MeetingSession
  sensitivity: number
  enabled?: boolean
  onDelta: (sessionId: string, markdownBuffer: string) => void
}

function cadenceFor(sensitivity: number) {
  const t = Math.min(1, Math.max(0, sensitivity / 100))
  return {
    debounceMs: Math.round(3500 - t * 3000),
    minChars: Math.round(110 - t * 96),
  }
}

/**
 * Continuous, debounced sliding-window summarisation.
 *
 * Flow:
 *   final transcript / note appended
 *     -> wait according to sensitivity
 *     -> slice only the fresh tail + a recent context window
 *     -> stream the LLM's Markdown deltas back token by token
 *     -> App merges only newly completed bullets into persisted state
 *
 * The baseline is reset on session switch, so opening a historical meeting never
 * re-runs the model over old content.
 */
export function useStreamSummary({
  session,
  sensitivity,
  enabled = true,
  onDelta,
}: UseStreamSummaryOptions) {
  const [isStreaming, setIsStreaming] = useState(false)
  const [lastRunAt, setLastRunAt] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pendingChars, setPendingChars] = useState(0)

  const sessionRef = useRef(session)
  const onDeltaRef = useRef(onDelta)
  const sessionIdRef = useRef(session.id)
  const processedCharsRef = useRef(0)
  const abortRef = useRef<AbortController | null>(null)
  const timerRef = useRef<number | null>(null)
  const streamingRef = useRef(false)
  const initializedRef = useRef(false)

  sessionRef.current = session
  onDeltaRef.current = onDelta

  const contextText = useMemo(
    () => session.segments.map((segment) => segment.text).join('\n'),
    [session.segments],
  )
  const cadence = useMemo(() => cadenceFor(sensitivity), [sensitivity])

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  // Session boundary: do not re-summarise historical transcripts on open.
  useEffect(() => {
    if (initializedRef.current && sessionIdRef.current === session.id) return
    initializedRef.current = true
    clearTimer()
    abortRef.current?.abort()
    abortRef.current = null
    streamingRef.current = false
    sessionIdRef.current = session.id
    processedCharsRef.current = contextText.length
    setIsStreaming(false)
    setError(null)
    setLastRunAt(null)
    setPendingChars(0)
    // session.summary is intentionally read only at the boundary.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.id, clearTimer])

  // Keep pending-character telemetry in sync for the UI.
  useEffect(() => {
    setPendingChars(Math.max(0, contextText.length - processedCharsRef.current))
  }, [contextText, isStreaming])

  const runStream = useCallback(async () => {
    if (streamingRef.current) return
    const current = sessionRef.current
    const snapshot = current
    const allContext = snapshot.segments.map((segment) => segment.text).join('\n')
    const freshStart = processedCharsRef.current
    const freshWindow = allContext.slice(freshStart)
    if (!freshWindow.trim()) return

    const previousMarkdown = serializeSummaryMarkdown(snapshot.summary)
    const recentWindow = allContext.slice(Math.max(0, allContext.length - 1800))

    // The mock runner receives only the fresh tail. This keeps each SSE pass
    // genuinely incremental and prevents re-summarising the whole meeting.
    const freshSegments = snapshot.segments
      .reduce<{ segments: typeof snapshot.segments; offset: number }>(
        (accumulator, segment) => {
          const end = accumulator.offset + segment.text.length
          if (end > freshStart) {
            const localStart = Math.max(0, freshStart - accumulator.offset)
            const text = segment.text.slice(localStart)
            if (text.trim()) {
              accumulator.segments.push({ ...segment, text })
            }
          }
          accumulator.offset = end + 1
          return accumulator
        },
        { segments: [], offset: 0 },
      )
      .segments

    if (freshSegments.length === 0) {
      processedCharsRef.current = freshStart
      return
    }
    // The prompt intentionally contains only this sliding window + prior summary.
    const prompt = buildSummaryPrompt({
      title: snapshot.title,
      previousMarkdown,
      recentWindow,
      freshWindow,
      sensitivity,
    })

    const controller = new AbortController()
    abortRef.current = controller
    processedCharsRef.current = allContext.length
    streamingRef.current = true
    setIsStreaming(true)
    setError(null)
    setLastRunAt(Date.now())
    setPendingChars(0)

    let buffer = ''
    try {
      const incrementalSnapshot = {
        ...snapshot,
        // The title is already represented after the first pass; avoid repeating it.
        title: previousMarkdown.trim() ? '' : snapshot.title,
        segments: freshSegments,
      }
      for await (const delta of mockSummarySSE({
        session: incrementalSnapshot,
        sensitivity,
        prompt,
        signal: controller.signal,
      })) {
        if (controller.signal.aborted) return
        buffer += delta
        onDeltaRef.current(snapshot.id, buffer)
      }
    } catch (streamError) {
      if (controller.signal.aborted) return
      console.error('[stream-summary] failed', streamError)
      setError('摘要流式连接中断，将保留已有内容')
      // Consume this window after a failure: the next new sentence will retry
      // instead of hammering a failing endpoint every debounce interval.
      processedCharsRef.current = allContext.length
    } finally {
      if (abortRef.current === controller) abortRef.current = null
      streamingRef.current = false
      setIsStreaming(false)
    }
  }, [sensitivity])

  useEffect(() => {
    if (!enabled) return
    if (contextText.length < processedCharsRef.current) {
      // Session was cleared. Reset the sliding-window cursor.
      clearTimer()
      abortRef.current?.abort()
      abortRef.current = null
      processedCharsRef.current = contextText.length
          return
    }

    const pending = contextText.length - processedCharsRef.current
    if (pending <= 0 || streamingRef.current) return

    clearTimer()
    // Sensitivity is applied immediately: changing the slider re-arms this timer.
    const wait =
      pending < cadence.minChars
        ? Math.round(cadence.debounceMs * 1.45)
        : cadence.debounceMs
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null
      void runStream()
    }, wait)

    return clearTimer
  }, [
    contextText,
    cadence.debounceMs,
    cadence.minChars,
    enabled,
    isStreaming,
    runStream,
    clearTimer,
  ])

  useEffect(() => {
    return () => {
      clearTimer()
      abortRef.current?.abort()
    }
  }, [clearTimer])

  return {
    isStreaming,
    lastRunAt,
    error,
    pendingChars,
    cadenceMs: cadence.debounceMs,
    minChars: cadence.minChars,
  }
}
