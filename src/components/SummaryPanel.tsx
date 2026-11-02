import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  ArrowDown,
  BrainCircuit,
  Check,
  Copy,
  Quote,
  Sparkles,
} from 'lucide-react'
import type { MeetingSummary } from '@/types'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { formatRelative } from '@/lib/time'
import { cn } from '@/lib/utils'

interface SummaryPanelProps {
  sessionId: string
  summary: MeetingSummary
  sensitivity: number
  onSensitivityChange: (value: number) => void
  isStreaming: boolean
  streamError: string | null
  cadenceMs: number
  minChars: number
  pendingChars: number
  onCopy: () => void
}

function sensitivityLabel(value: number) {
  if (value >= 76) return '细碎'
  if (value >= 45) return '均衡'
  return '凝练'
}

function SummarySection({
  title,
  index,
  count,
  children,
}: {
  title: string
  index: string
  count: number
  children: ReactNode
}) {
  return (
    <section>
      <div className="mb-2 flex items-center gap-2">
        <span className="font-mono text-[8.5px] tracking-[0.08em] text-[#555e6b]">{index}</span>
        <h3 className="text-[10px] font-semibold tracking-[0.08em] text-[#8e97a4]">{title}</h3>
        <span className="h-px flex-1 bg-white/[0.055]" />
        <span className="mono-num text-[8.5px] text-[#555d69]">{String(count).padStart(2, '0')}</span>
      </div>
      {children}
    </section>
  )
}

export function SummaryPanel({
  sessionId,
  summary,
  sensitivity,
  onSensitivityChange,
  isStreaming,
  streamError,
  cadenceMs,
  minChars,
  pendingChars,
  onCopy,
}: SummaryPanelProps) {
  const [copied, setCopied] = useState(false)
  const [stickToBottom, setStickToBottom] = useState(false)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const hasContent =
    summary.topics.length > 0 || summary.points.length > 0 || summary.excerpts.length > 0
  const counts = {
    topics: summary.topics.length,
    points: summary.points.length,
    excerpts: summary.excerpts.length,
  }

  // On session switch, historical digests open at the beginning; an empty live
  // digest starts in follow mode so new lines stay visible.
  useEffect(() => {
    const node = scrollRef.current
    if (!node) return
    const hasExistingContent =
      summary.topics.length > 0 || summary.points.length > 0 || summary.excerpts.length > 0
    setStickToBottom(!hasExistingContent)
    node.scrollTop = 0
    // Only a session boundary should reset the reading position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  // After "clear meeting", return to follow mode for the next live summary.
  useEffect(() => {
    if (hasContent) return
    setStickToBottom(true)
    const node = scrollRef.current
    if (node) node.scrollTop = 0
  }, [hasContent])

  useEffect(() => {
    if (!stickToBottom) return
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [
    summary.topics.length,
    summary.points.length,
    summary.excerpts.length,
    isStreaming,
    stickToBottom,
  ])

  const copy = () => {
    onCopy()
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <section className="station-card relative flex h-full min-h-0 flex-col overflow-hidden rounded-[13px]">
      <div className="shrink-0 border-b border-white/[0.055] px-4 pb-3 pt-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-[12px] font-medium tracking-[0.01em] text-[#dfe2e7]">实时纪要</h2>
              <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#5f6774]">
                live digest
              </span>
            </div>
            <div className="mt-1.5 flex items-center gap-2 text-[9.5px]">
              <span
                className={cn(
                  'h-1 w-1 rounded-full',
                  isStreaming ? 'animate-soft-pulse bg-[#849bb8]' : 'bg-[#5f6a78]',
                )}
              />
              <span
                className={
                  isStreaming
                    ? 'text-[#9aaec7]'
                    : streamError
                      ? 'text-[#c18c8c]'
                      : 'text-[#6c7481]'
                }
              >
                {isStreaming
                  ? '正在增量提炼…'
                  : streamError
                    ? `${streamError} · 已保留现有内容`
                    : pendingChars > 0
                      ? `正在等待新内容 · ${pendingChars} 字`
                      : summary.updatedAt
                        ? `上次提炼 ${formatRelative(summary.updatedAt)}`
                        : '待机 · 等待语音输入'}
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={copy}
            disabled={!hasContent}
            title="复制摘要到剪贴板"
            className="-mr-1 -mt-0.5 text-[#717b88]"
          >
            {copied ? (
              <Check className="h-3.5 w-3.5 text-[#92b19a]" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>

        <div className="mt-3.5 rounded-[7px] border border-white/[0.055] bg-black/[0.08] px-2.5 py-2.5">
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[9.5px] text-[#7b8491]">
              <Sparkles className="h-2.5 w-2.5" />
              提炼灵敏度
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[9px] text-[#646d7a]">{sensitivityLabel(sensitivity)}</span>
              <span className="mono-num text-[10px] text-[#aeb7c3]">{sensitivity}</span>
            </div>
          </div>
          <Slider
            value={[sensitivity]}
            min={0}
            max={100}
            step={1}
            onValueChange={(value) => onSensitivityChange(value[0] ?? sensitivity)}
            aria-label="提炼灵敏度"
          />
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[8.5px] text-[#59616d]">更凝练 · 低刷新</span>
            <span className="font-mono text-[8px] tracking-[0.02em] text-[#535b67]">
              {(cadenceMs / 1000).toFixed(1)}s / ≥{minChars}字
            </span>
            <span className="text-[8.5px] text-[#59616d]">更细碎 · 高刷新</span>
          </div>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={(event) => {
          const node = event.currentTarget
          setStickToBottom(node.scrollHeight - node.scrollTop - node.clientHeight < 70)
        }}
        className="relative min-h-0 flex-1 overflow-y-auto px-4 py-4"
      >
        {!hasContent ? (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-[9px] border border-white/[0.075] bg-white/[0.022]">
              <BrainCircuit className="h-4 w-4 text-[#758192]" strokeWidth={1.5} />
            </div>
            <p className="mt-3 text-[12px] font-medium text-[#b2b8c1]">摘要在讲话中生长</p>
            <p className="mt-1.5 max-w-[245px] text-[10.5px] leading-[1.8] text-[#68717e]">
              转写被切片送入模型，每完成一行即追加到这里，不会等会议结束。
            </p>
            <div className="mt-4 flex items-center gap-2 rounded-[5px] border border-white/[0.06] px-2 py-1 font-mono text-[8px] tracking-[0.04em] text-[#56606d]">
              <span className="h-1 w-1 rounded-full bg-[#66758a]" />
              SLIDING WINDOW · SSE
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {summary.excerpts.length > 0 ? (
              <section>
                <div className="mb-2 flex items-center gap-2">
                  <Quote className="h-2.5 w-2.5 text-[#99885f]" />
                  <h3 className="text-[10px] font-semibold tracking-[0.08em] text-[#9b8d6c]">
                    重点摘录
                  </h3>
                  <span className="h-px flex-1 bg-white/[0.055]" />
                  <span className="mono-num text-[8.5px] text-[#555d69]">{counts.excerpts}</span>
                </div>
                <div className="space-y-1.5">
                  {summary.excerpts.map((entry) => (
                    <blockquote
                      key={entry.id}
                      className="animate-fade-up rounded-[6px] border-l border-[#a9925e]/40 bg-[#a9925e]/[0.045] px-2.5 py-2 text-[11.5px] leading-[1.75] text-[#c2baa8]"
                    >
                      {entry.text}
                    </blockquote>
                  ))}
                </div>
              </section>
            ) : null}

            <SummarySection title="核心议题" index="01" count={counts.topics}>
              {summary.topics.length > 0 ? (
                <ol className="space-y-1.5">
                  {summary.topics.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="group flex animate-fade-up items-start gap-2 rounded-[5px] px-1 py-0.5"
                    >
                      <span className="mt-[1px] font-mono text-[9px] leading-[1.75] text-[#677383]">
                        {String(index + 1).padStart(2, '0')}
                      </span>
                      <span className="text-[12px] leading-[1.75] text-[#d3d7dd]">{entry.text}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="px-1 text-[10.5px] italic text-[#555f6c]">等待识别会议议题…</p>
              )}
            </SummarySection>

            <SummarySection title="关键观点" index="02" count={counts.points}>
              {summary.points.length > 0 ? (
                <ul className="space-y-2">
                  {summary.points.map((entry, index) => (
                    <li
                      key={entry.id}
                      className="flex animate-fade-up items-start gap-2 rounded-[5px] px-1 py-0.5"
                    >
                      <span className="mt-[7px] h-[3px] w-[3px] shrink-0 rounded-full bg-[#758295]" />
                      <span className="text-[12px] leading-[1.8] text-[#bec4cd]">
                        {entry.text}
                        {isStreaming && index === summary.points.length - 1 ? (
                          <span className="stream-caret ml-0.5 inline-block align-baseline" />
                        ) : null}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-1 text-[10.5px] italic text-[#555f6c]">等待形成关键观点…</p>
              )}
            </SummarySection>

            {isStreaming ? (
              <div className="flex items-center gap-2 px-1">
                <span className="h-1 w-1 animate-soft-pulse rounded-full bg-[#849bb8]" />
                <span className="font-mono text-[8.5px] tracking-[0.08em] text-[#657181]">
                  APPENDING NEXT LINE
                </span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {!stickToBottom && hasContent ? (
        <button
          type="button"
          onClick={() => {
            const node = scrollRef.current
            if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' })
            setStickToBottom(true)
          }}
          className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/[0.1] bg-[#1b1f2a]/95 px-2 py-1 text-[8.5px] text-[#9da7b5] shadow-station"
        >
          <ArrowDown className="h-2.5 w-2.5" />
          最新
        </button>
      ) : null}

      <div className="flex shrink-0 items-center justify-between border-t border-white/[0.05] px-4 py-2 text-[8.5px] text-[#58616d]">
        <span className="font-mono tracking-[0.05em]">LLM · INCREMENTAL SSE</span>
        <span>{summary.updatedAt ? `更新于 ${formatRelative(summary.updatedAt)}` : '尚未提炼'}</span>
      </div>
    </section>
  )
}
