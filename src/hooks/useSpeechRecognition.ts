import { useCallback, useEffect, useRef, useState } from 'react'
import type { SpeechStatus } from '@/types'

interface SpeechResultAlternative {
  transcript: string
  confidence: number
}

interface SpeechResult {
  isFinal: boolean
  length: number
  [index: number]: SpeechResultAlternative
}

interface SpeechResultList {
  length: number
  [index: number]: SpeechResult
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number
  results: SpeechResultList
}

interface SpeechRecognitionErrorEventLike extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  start: () => void
  stop: () => void
  abort: () => void
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  const candidate = window as unknown as {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
  return candidate.SpeechRecognition ?? candidate.webkitSpeechRecognition ?? null
}

export interface UseSpeechRecognitionOptions {
  lang?: string
  onFinal?: (text: string) => void
  onInterim?: (text: string) => void
}

/**
 * Browser-native Web Speech API wrapper.
 *
 * Design notes:
 * - A separate getUserMedia stream powers the lightweight canvas waveform.
 * - Chrome may end a "continuous" recognition session after silence, so we
 *   auto-restart while the microphone is intentionally listening.
 * - Pause fully releases recognition + the media stream; resume reacquires it.
 */
export function useSpeechRecognition({
  lang = 'zh-CN',
  onFinal,
  onInterim,
}: UseSpeechRecognitionOptions = {}) {
  const Recognition = getRecognitionConstructor()
  const supported = Boolean(Recognition)
  const [status, setStatus] = useState<SpeechStatus>(supported ? 'idle' : 'unsupported')
  const [interim, setInterim] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)

  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const restartTimerRef = useRef<number | null>(null)
  const listeningDesiredRef = useRef(false)
  const runIdRef = useRef(0)
  const mountedRef = useRef(true)
  const onFinalRef = useRef(onFinal)
  const onInterimRef = useRef(onInterim)
  const statusRef = useRef<SpeechStatus>(status)

  onFinalRef.current = onFinal
  onInterimRef.current = onInterim
  statusRef.current = status

  const clearRestartTimer = useCallback(() => {
    if (restartTimerRef.current !== null) {
      window.clearTimeout(restartTimerRef.current)
      restartTimerRef.current = null
    }
  }, [])

  const teardownMedia = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close().catch(() => undefined)
      audioContextRef.current = null
    }
    if (mountedRef.current) setAnalyser(null)
  }, [])

  const teardownRecognition = useCallback(
    (abort = true) => {
      clearRestartTimer()
      const recognition = recognitionRef.current
      recognitionRef.current = null
      if (recognition) {
        recognition.onresult = null
        recognition.onerror = null
        recognition.onend = null
        recognition.onstart = null
        try {
          if (abort) recognition.abort()
          else recognition.stop()
        } catch {
          // The engine may already be idle.
        }
      }
      if (mountedRef.current) {
        setInterim('')
        onInterimRef.current?.('')
      }
    },
    [clearRestartTimer],
  )

  const stopInternal = useCallback(
    (nextStatus: SpeechStatus) => {
      listeningDesiredRef.current = false
      runIdRef.current += 1
      teardownRecognition()
      teardownMedia()
      if (mountedRef.current) {
        setStatus(nextStatus)
        if (nextStatus !== 'denied' && nextStatus !== 'error') setErrorMessage(null)
      }
    },
    [teardownMedia, teardownRecognition],
  )

  const handleFatalError = useCallback(
    (message: string, nextStatus: SpeechStatus) => {
      listeningDesiredRef.current = false
      teardownRecognition()
      teardownMedia()
      if (mountedRef.current) {
        setStatus(nextStatus)
        setErrorMessage(message)
      }
    },
    [teardownMedia, teardownRecognition],
  )

  const start = useCallback(async () => {
    if (!Recognition) {
      if (mountedRef.current) setStatus('unsupported')
      return
    }
    if (
      statusRef.current === 'listening' ||
      statusRef.current === 'requesting' ||
      listeningDesiredRef.current
    ) {
      return
    }

    const runId = runIdRef.current + 1
    runIdRef.current = runId
    listeningDesiredRef.current = true
    setErrorMessage(null)
    setStatus('requesting')

    let stream: MediaStream
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('当前页面无法访问麦克风，请使用 localhost 或 HTTPS。')
      }
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })
    } catch (error) {
      if (runIdRef.current !== runId) return
      const errorName = error instanceof DOMException ? error.name : ''
      const denied =
        errorName === 'NotAllowedError' ||
        errorName === 'PermissionDeniedError' ||
        errorName === 'SecurityError'
      handleFatalError(
        denied
          ? '麦克风权限被拒绝。请在浏览器地址栏的权限设置中允许麦克风，然后重试。'
          : '未能连接麦克风，请检查设备或浏览器权限。',
        denied ? 'denied' : 'error',
      )
      return
    }

    if (runIdRef.current !== runId || !mountedRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    streamRef.current = stream
    try {
      const AudioContextCtor =
        window.AudioContext ??
        (
          window as unknown as {
            webkitAudioContext?: typeof AudioContext
          }
        ).webkitAudioContext
      if (AudioContextCtor) {
        const context = new AudioContextCtor()
        await context.resume()
        const source = context.createMediaStreamSource(stream)
        const node = context.createAnalyser()
        node.fftSize = 128
        node.smoothingTimeConstant = 0.78
        source.connect(node)
        audioContextRef.current = context
        if (runIdRef.current === runId && mountedRef.current) setAnalyser(node)
      }
    } catch (error) {
      console.warn('[speech] waveform analyser unavailable', error)
    }

    const recognition = new Recognition()
    recognition.lang = lang
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognitionRef.current = recognition

    recognition.onstart = () => {
      if (runIdRef.current !== runId) return
      if (mountedRef.current) {
        setStatus('listening')
        setErrorMessage(null)
      }
    }

    recognition.onresult = (event) => {
      if (runIdRef.current !== runId) return
      let interimText = ''
      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result[0]?.transcript?.trim()
        if (!transcript) continue
        if (result.isFinal) {
          onFinalRef.current?.(transcript)
        } else {
          interimText += transcript
        }
      }
      const nextInterim = interimText.trim()
      if (mountedRef.current) setInterim(nextInterim)
      onInterimRef.current?.(nextInterim)
    }

    recognition.onerror = (event) => {
      if (runIdRef.current !== runId) return
      if (event.error === 'aborted') return
      if (event.error === 'no-speech') return

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        handleFatalError(
          '麦克风权限被拒绝。请在浏览器站点设置中允许麦克风后重试。',
          'denied',
        )
        return
      }
      if (event.error === 'audio-capture') {
        handleFatalError('没有检测到可用的麦克风设备。', 'error')
        return
      }
      if (event.error === 'network') {
        handleFatalError('语音识别服务网络异常，已切换为手动输入。', 'error')
        return
      }
      handleFatalError('语音识别出现异常，请重试或使用手动输入。', 'error')
    }

    recognition.onend = () => {
      if (runIdRef.current !== runId) return
      if (!listeningDesiredRef.current) return
      // Chrome ends continuous recognition on long silence. Restart quietly.
      clearRestartTimer()
      restartTimerRef.current = window.setTimeout(() => {
        if (runIdRef.current !== runId || !listeningDesiredRef.current) return
        try {
          recognition.start()
        } catch {
          restartTimerRef.current = window.setTimeout(() => {
            if (runIdRef.current === runId && listeningDesiredRef.current) {
              try {
                recognition.start()
              } catch {
                handleFatalError('语音识别重启失败，请手动重新开启麦克风。', 'error')
              }
            }
          }, 700)
        }
      }, 320)
    }

    try {
      recognition.start()
    } catch {
      handleFatalError('语音识别启动失败，请重试。', 'error')
    }
  }, [Recognition, clearRestartTimer, handleFatalError, lang])

  const stop = useCallback(() => {
    stopInternal(supported ? 'idle' : 'unsupported')
  }, [stopInternal, supported])

  const pause = useCallback(() => {
    if (statusRef.current !== 'listening' && statusRef.current !== 'requesting') return
    stopInternal('paused')
  }, [stopInternal])

  const resume = useCallback(() => {
    if (statusRef.current === 'paused' || statusRef.current === 'denied' || statusRef.current === 'error') {
      void start()
    }
  }, [start])

  const toggle = useCallback(() => {
    if (statusRef.current === 'listening' || statusRef.current === 'paused' || statusRef.current === 'requesting') {
      stop()
    } else {
      void start()
    }
  }, [start, stop])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      listeningDesiredRef.current = false
      teardownRecognition()
      teardownMedia()
    }
  }, [teardownMedia, teardownRecognition])

  return {
    supported,
    status,
    interim,
    analyser,
    errorMessage,
    start,
    stop,
    pause,
    resume,
    toggle,
  }
}
