import { useCallback, useEffect, useMemo, useRef, useState, type SetStateAction } from 'react'
import {
  AudioLines,
  Download,
  NotebookText,
  PanelLeft,
  Plus,
  Radio,
} from 'lucide-react'
import type {
  MeetingSession,
  MeetingTask,
  SegmentSelectionPart,
  WorkspaceState,
} from '@/types'
import { Sidebar } from '@/components/Sidebar'
import { ControlBar } from '@/components/ControlBar'
import { TranscriptPanel } from '@/components/TranscriptPanel'
import { SummaryPanel } from '@/components/SummaryPanel'
import { ExtractionPanel } from '@/components/ExtractionPanel'
import { useToast } from '@/components/ui/toast'
import { useLocalStorage } from '@/hooks/useLocalStorage'
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition'
import { useStreamSummary } from '@/hooks/useStreamSummary'
import { useMediaQuery } from '@/hooks/useMediaQuery'
import {
  createEmptySummary,
  createMeetingSession,
  createSeedWorkspace,
  normalizeWorkspace,
} from '@/lib/seed'
import { mergeStreamedSummary, parseSummaryMarkdown } from '@/lib/summary-parser'
import {
  buildSummaryClipboard,
  copyText,
  downloadMeetingMarkdown,
} from '@/lib/export'
import { formatSessionDate, formatClock } from '@/lib/time'
import { cn, hashString, uid } from '@/lib/utils'

const STORAGE_KEY = 'minute.workspace.v1'
type MobileTab = 'sessions' | 'transcript' | 'digest'

export default function App() {
  const { toast } = useToast()
  const {
    value: storedWorkspace,
    setValue: setStoredWorkspace,
    status: storageStatus,
    error: storageError,
  } = useLocalStorage<WorkspaceState>(STORAGE_KEY, createSeedWorkspace)

  const workspace = useMemo(() => normalizeWorkspace(storedWorkspace), [storedWorkspace])
  const setWorkspace = useCallback(
    (updater: SetStateAction<WorkspaceState>) => {
      setStoredWorkspace((previous) => {
        const base = normalizeWorkspace(previous)
        return typeof updater === 'function' ? updater(base) : updater
      })
    },
    [setStoredWorkspace],
  )

  const activeSession =
    workspace.sessions.find((session) => session.id === workspace.activeSessionId) ??
    workspace.sessions[0]
  const activeIdRef = useRef(activeSession.id)
  activeIdRef.current = activeSession.id

  const [mobileTab, setMobileTab] = useState<MobileTab>('transcript')
  const compact = useMediaQuery('(max-width: 1279px)')

  const patchSession = useCallback(
    (sessionId: string, updater: (session: MeetingSession) => MeetingSession) => {
      setWorkspace((previous) => {
        let changed = false
        const sessions = previous.sessions.map((session) => {
          if (session.id !== sessionId) return session
          const next = updater(session)
          if (next !== session) changed = true
          return next
        })
        return changed ? { ...previous, sessions } : previous
      })
    },
    [setWorkspace],
  )

  const appendSegment = useCallback(
    (kind: 'speech' | 'note', rawText: string) => {
      const text = rawText.trim()
      if (!text) return
      const sessionId = activeIdRef.current
      const now = Date.now()
      patchSession(sessionId, (session) => {
        const last = session.segments.at(-1)
        if (
          kind === 'speech' &&
          last?.kind === 'speech' &&
          last.text.trim() === text &&
          now - last.createdAt < 1800
        ) {
          return session
        }
        return {
          ...session,
          isDemo: false,
          segments: [
            ...session.segments,
            {
              id: uid('seg'),
              kind,
              text,
              createdAt: now,
              atSec: session.durationSec,
            },
          ],
        }
      })
    },
    [patchSession],
  )

  const speech = useSpeechRecognition({
    lang: 'zh-CN',
    onFinal: (text) => appendSegment('speech', text),
  })

  const handleStreamDelta = useCallback(
    (sessionId: string, markdownBuffer: string) => {
      patchSession(sessionId, (session) => {
        const parsed = parseSummaryMarkdown(markdownBuffer)
        return mergeStreamedSummary(session, markdownBuffer, parsed)
      })
    },
    [patchSession],
  )

  const stream = useStreamSummary({
    session: activeSession,
    sensitivity: workspace.sensitivity,
    onDelta: handleStreamDelta,
  })

  // Meeting clock. Persisted through the same debounced workspace store.
  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'visible') return
      setWorkspace((previous) => ({
        ...previous,
        sessions: previous.sessions.map((session) =>
          session.id === previous.activeSessionId
            ? { ...session, durationSec: session.durationSec + 1 }
            : session,
        ),
      }))
    }, 1000)
    return () => window.clearInterval(interval)
  }, [setWorkspace])

  const stopListening = useCallback(() => {
    if (
      speech.status === 'listening' ||
      speech.status === 'paused' ||
      speech.status === 'requesting'
    ) {
      speech.stop()
    }
  }, [speech])

  const createMeeting = useCallback(() => {
    stopListening()
    const session = createMeetingSession()
    setWorkspace((previous) => ({
      ...previous,
      sessions: [session, ...previous.sessions],
      activeSessionId: session.id,
    }))
    setMobileTab('transcript')
    toast({ title: '已新建会议', description: '麦克风开启后直接说话即可。', tone: 'success' })
  }, [setWorkspace, stopListening, toast])

  const selectMeeting = useCallback(
    (id: string) => {
      if (id === activeSession.id) {
        if (compact) setMobileTab('transcript')
        return
      }
      stopListening()
      setWorkspace((previous) => ({ ...previous, activeSessionId: id }))
      if (compact) setMobileTab('transcript')
    },
    [activeSession.id, compact, setWorkspace, stopListening],
  )

  const renameMeeting = useCallback(
    (id: string, title: string) => {
      patchSession(id, (session) => ({ ...session, title, isDemo: false }))
      toast({ title: '标题已更新', tone: 'success' })
    },
    [patchSession, toast],
  )

  const deleteMeeting = useCallback(
    (id: string) => {
      if (id === activeSession.id) stopListening()
      setWorkspace((previous) => {
        const remaining = previous.sessions.filter((session) => session.id !== id)
        if (remaining.length === 0) {
          const fresh = createMeetingSession()
          return {
            ...previous,
            sessions: [fresh],
            activeSessionId: fresh.id,
          }
        }
        return {
          ...previous,
          sessions: remaining,
          activeSessionId:
            previous.activeSessionId === id ? remaining[0].id : previous.activeSessionId,
        }
      })
      toast({ title: '会议已删除', tone: 'default' })
    },
    [activeSession.id, setWorkspace, stopListening, toast],
  )

  const clearMeeting = useCallback(() => {
    stopListening()
    const now = Date.now()
    patchSession(activeSession.id, (session) => ({
      ...session,
      createdAt: now,
      durationSec: 0,
      segments: [],
      dismissedTaskKeys: [],
      summary: createEmptySummary(),
      isDemo: false,
    }))
    toast({ title: '本次会话已清空', description: '计时器归零，可以重新开始。', tone: 'success' })
  }, [activeSession.id, patchSession, stopListening, toast])

  const addNote = useCallback(
    (text: string) => {
      appendSegment('note', text)
    },
    [appendSegment],
  )

  const changeTitle = useCallback(
    (title: string) => {
      patchSession(activeSession.id, (session) => ({
        ...session,
        title,
        isDemo: false,
      }))
    },
    [activeSession.id, patchSession],
  )

  const changeSensitivity = useCallback(
    (value: number) => {
      setWorkspace((previous) => ({ ...previous, sensitivity: value }))
    },
    [setWorkspace],
  )

  const setHighlights = useCallback(
    (segmentIds: string[], highlighted: boolean) => {
      const target = new Set(segmentIds)
      patchSession(activeSession.id, (session) => ({
        ...session,
        isDemo: false,
        segments: session.segments.map((segment) =>
          target.has(segment.id) ? { ...segment, highlighted } : segment,
        ),
      }))
      toast({
        title: highlighted ? '已标记为重点' : '已取消重点标记',
        tone: 'default',
      })
    },
    [activeSession.id, patchSession, toast],
  )

  const extractExcerpt = useCallback(
    (text: string) => {
      const content = text.trim()
      if (!content) return
      const key = hashString(`excerpt:${content}`)
      patchSession(activeSession.id, (session) => {
        if (session.summary.excerpts.some((item) => item.key === key)) return session
        return {
          ...session,
          isDemo: false,
          summary: {
            ...session.summary,
            excerpts: [
              ...session.summary.excerpts,
              {
                id: `excerpt-${key}`,
                key,
                text: content,
                source: 'excerpt',
                createdAt: Date.now(),
              },
            ],
          },
        }
      })
      toast({ title: '已提取到实时纪要', description: '在「重点摘录」中查看。', tone: 'success' })
    },
    [activeSession.id, patchSession, toast],
  )

  const deleteSelection = useCallback(
    (parts: SegmentSelectionPart[]) => {
      const byId = new Map(parts.map((part) => [part.id, part]))
      patchSession(activeSession.id, (session) => {
        const segments = session.segments
          .map((segment) => {
            const part = byId.get(segment.id)
            if (!part) return segment
            const text = `${segment.text.slice(0, part.start)}${segment.text.slice(part.end)}`.trim()
            return { ...segment, text }
          })
          .filter((segment) => segment.text.length > 0)
        return { ...session, isDemo: false, segments }
      })
      toast({ title: '已删除所选片段', tone: 'default' })
    },
    [activeSession.id, patchSession, toast],
  )

  const addTask = useCallback(
    (input: { owner: string; what: string; due: string }) => {
      const now = Date.now()
      const id = uid('task')
      const task: MeetingTask = {
        id,
        sourceKey: `manual:${id}`,
        owner: input.owner,
        what: input.what,
        due: input.due,
        done: false,
        auto: false,
        createdAt: now,
        updatedAt: now,
      }
      patchSession(activeSession.id, (session) => ({
        ...session,
        isDemo: false,
        summary: { ...session.summary, tasks: [...session.summary.tasks, task] },
      }))
      toast({ title: '待办已添加', tone: 'success' })
    },
    [activeSession.id, patchSession, toast],
  )

  const updateTask = useCallback(
    (id: string, input: { owner: string; what: string; due: string }) => {
      patchSession(activeSession.id, (session) => ({
        ...session,
        isDemo: false,
        summary: {
          ...session.summary,
          tasks: session.summary.tasks.map((task) =>
            task.id === id ? { ...task, ...input, updatedAt: Date.now() } : task,
          ),
        },
      }))
      toast({ title: '待办已更新', tone: 'success' })
    },
    [activeSession.id, patchSession, toast],
  )

  const toggleTask = useCallback(
    (id: string, done: boolean) => {
      patchSession(activeSession.id, (session) => ({
        ...session,
        isDemo: false,
        summary: {
          ...session.summary,
          tasks: session.summary.tasks.map((task) =>
            task.id === id ? { ...task, done, updatedAt: Date.now() } : task,
          ),
        },
      }))
    },
    [activeSession.id, patchSession],
  )

  const deleteTask = useCallback(
    (task: MeetingTask) => {
      patchSession(activeSession.id, (session) => ({
        ...session,
        isDemo: false,
        dismissedTaskKeys: Array.from(
          new Set([...session.dismissedTaskKeys, task.sourceKey]),
        ),
        summary: {
          ...session.summary,
          tasks: session.summary.tasks.filter((item) => item.id !== task.id),
        },
      }))
      toast({ title: '待办已删除', tone: 'default' })
    },
    [activeSession.id, patchSession, toast],
  )

  const exportSession = useCallback(
    (session: MeetingSession) => {
      downloadMeetingMarkdown(session)
      toast({
        title: 'Markdown 已导出',
        description: `${session.title} · 原文 / 摘要 / 待办`,
        tone: 'success',
      })
    },
    [toast],
  )

  const copySummary = useCallback(async () => {
    const ok = await copyText(buildSummaryClipboard(activeSession))
    toast({
      title: ok ? '摘要已复制' : '复制失败',
      description: ok ? '结构化 Markdown 已写入剪贴板。' : '请检查浏览器剪贴板权限。',
      tone: ok ? 'success' : 'error',
    })
  }, [activeSession, toast])

  const openTasks = activeSession.summary.tasks.filter((task) => !task.done).length

  const transcriptPanel = (
    <TranscriptPanel
      session={activeSession}
      speechStatus={speech.status}
      interim={speech.interim}
      supported={speech.supported}
      errorMessage={speech.errorMessage}
      onAddNote={addNote}
      onSetHighlights={setHighlights}
      onExtract={extractExcerpt}
      onDeleteSelection={deleteSelection}
    />
  )

  const transcriptStation = (
    <div className="station-card flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[13px]">
      <ControlBar
        session={activeSession}
        speechStatus={speech.status}
        analyser={speech.analyser}
        onToggleMic={speech.toggle}
        onPause={speech.pause}
        onResume={speech.resume}
        onClear={clearMeeting}
        onTitleChange={changeTitle}
        onExport={() => exportSession(activeSession)}
      />
      <div className="min-h-0 flex-1">{transcriptPanel}</div>
    </div>
  )

  const summaryPanel = (
    <SummaryPanel
      sessionId={activeSession.id}
      summary={activeSession.summary}
      sensitivity={workspace.sensitivity}
      onSensitivityChange={changeSensitivity}
      isStreaming={stream.isStreaming}
      streamError={stream.error}
      cadenceMs={stream.cadenceMs}
      minChars={stream.minChars}
      pendingChars={stream.pendingChars}
      onCopy={() => void copySummary()}
    />
  )

  const extractionPanel = (
    <ExtractionPanel
      summary={activeSession.summary}
      segments={activeSession.segments}
      isStreaming={stream.isStreaming}
      onAddTask={addTask}
      onUpdateTask={updateTask}
      onToggleTask={toggleTask}
      onDeleteTask={deleteTask}
    />
  )

  const sidebar = (
    <Sidebar
      sessions={workspace.sessions}
      activeSessionId={activeSession.id}
      storageStatus={storageStatus}
      storageError={storageError}
      onCreate={createMeeting}
      onSelect={selectMeeting}
      onRename={renameMeeting}
      onExport={exportSession}
      onDelete={deleteMeeting}
    />
  )

  if (compact) {
    return (
      <div className="flex h-[100dvh] flex-col gap-2 bg-[#0f1118] p-2.5">
        <MobileTop
          session={activeSession}
          onNew={createMeeting}
          onExport={() => exportSession(activeSession)}
          openTasks={openTasks}
        />
        <nav className="grid shrink-0 grid-cols-3 gap-1 rounded-[9px] border border-white/[0.065] bg-[#151821]/80 p-1">
          {(
            [
              { key: 'sessions', label: '会话', icon: PanelLeft, meta: `${workspace.sessions.length}` },
              { key: 'transcript', label: '原文', icon: AudioLines, meta: `${activeSession.segments.length}` },
              { key: 'digest', label: '纪要', icon: NotebookText, meta: `${openTasks}` },
            ] as const
          ).map((tab) => {
            const Icon = tab.icon
            const active = mobileTab === tab.key
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setMobileTab(tab.key)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-[6px] py-1.5 text-[11px] transition-colors',
                  active
                    ? 'bg-white/[0.065] text-[#dfe3e9]'
                    : 'text-[#79818e] hover:bg-white/[0.025] hover:text-[#b8bec7]',
                )}
              >
                <Icon className="h-3 w-3" />
                {tab.label}
                <span className="mono-num text-[8px] text-[#5e6673]">{tab.meta}</span>
              </button>
            )
          })}
        </nav>
        <div className="min-h-0 flex-1">
          {mobileTab === 'sessions' ? sidebar : null}
          {mobileTab === 'transcript' ? (
            <div className="h-full min-h-0">{transcriptStation}</div>
          ) : null}
          {mobileTab === 'digest' ? (
            <div className="h-full space-y-2.5 overflow-y-auto pr-0.5">
              <div className="h-[min(58vh,500px)] min-h-[400px]">{summaryPanel}</div>
              <div className="h-[min(56vh,520px)] min-h-[410px]">{extractionPanel}</div>
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="grid h-[100dvh] grid-cols-[280px_minmax(0,1fr)_390px] gap-3 p-3 xl:grid-cols-[292px_minmax(0,1fr)_408px] xl:p-4">
      {sidebar}
      <main className="flex min-h-0 min-w-0 flex-col">{transcriptStation}</main>
      <aside className="grid min-h-0 grid-rows-[minmax(0,1.08fr)_minmax(0,0.92fr)] gap-3">
        {summaryPanel}
        {extractionPanel}
      </aside>
    </div>
  )
}

function MobileTop({
  session,
  openTasks,
  onNew,
  onExport,
}: {
  session: MeetingSession
  openTasks: number
  onNew: () => void
  onExport: () => void
}) {
  return (
    <div className="flex shrink-0 items-center justify-between rounded-[10px] border border-white/[0.065] bg-[#151821]/80 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="grid h-7 w-7 shrink-0 place-items-center rounded-[6px] border border-white/[0.12] bg-white/[0.035]">
          <Radio className="h-3.5 w-3.5 text-[#8ea3bd]" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-[12px] font-medium text-[#dfe2e7]">{session.title}</p>
          <p className="mt-0.5 flex items-center gap-2 text-[9px] text-[#68717e]">
            <span className="mono-num">{formatClock(session.durationSec)}</span>
            <span>{formatSessionDate(session.createdAt)}</span>
            <span>{openTasks} 待办</span>
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onExport}
          aria-label="导出 Markdown"
          className="grid h-8 w-8 place-items-center rounded-[6px] border border-white/[0.07] text-[#8d96a3] transition-colors hover:bg-white/[0.04]"
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        <button
          type="button"
          onClick={onNew}
          aria-label="新建会议"
          className="grid h-8 w-8 place-items-center rounded-[6px] border border-[#7b96c2]/25 bg-[#3f5d88] text-[#eef2f8] transition-colors hover:bg-[#496a99]"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
