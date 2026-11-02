import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  ArrowDown,
  Highlighter,
  Keyboard,
  Mic,
  PenLine,
  Quote,
  Scissors,
  ShieldAlert,
  SquarePen,
  Waves,
} from 'lucide-react'
import type {
  MeetingSession,
  SegmentSelectionPart,
  SpeechStatus,
} from '@/types'
import { TokenizedText } from '@/components/TokenizedText'
import { formatClock } from '@/lib/time'
import { cn } from '@/lib/utils'

interface TranscriptPanelProps {
  session: MeetingSession
  speechStatus: SpeechStatus
  interim: string
  supported: boolean
  errorMessage: string | null
  onAddNote: (text: string) => void
  onSetHighlights: (segmentIds: string[], highlighted: boolean) => void
  onExtract: (text: string) => void
  onDeleteSelection: (parts: SegmentSelectionPart[]) => void
}

interface SelectionMenu {
  x: number
  y: number
  text: string
  parts: SegmentSelectionPart[]
}

function offsetWithin(root: HTMLElement, node: Node, offset: number) {
  const probe = document.createRange()
  probe.selectNodeContents(root)
  probe.setEnd(node, offset)
  return probe.toString().length
}

function readSelectionParts(
  container: HTMLElement,
  range: Range,
  session: MeetingSession,
): { parts: SegmentSelectionPart[]; text: string } {
  const rows = Array.from(container.querySelectorAll<HTMLElement>('[data-segment-id]'))
  const parts: SegmentSelectionPart[] = []

  for (const row of rows) {
    const segmentId = row.dataset.segmentId
    if (!segmentId || !range.intersectsNode(row)) continue
    const content = row.querySelector<HTMLElement>('[data-segment-content]')
    if (!content) continue
    const length = content.textContent?.length ?? 0
    let start = 0
    let end = length
    if (content.contains(range.startContainer)) {
      start = offsetWithin(content, range.startContainer, range.startOffset)
    }
    if (content.contains(range.endContainer)) {
      end = offsetWithin(content, range.endContainer, range.endOffset)
    }
    if (end > start) parts.push({ id: segmentId, start, end })
  }

  const text = parts
    .map((part) => {
      const segment = session.segments.find((item) => item.id === part.id)
      return segment?.text.slice(part.start, part.end) ?? ''
    })
    .filter(Boolean)
    .join('\n')

  return { parts, text }
}

export function TranscriptPanel({
  session,
  speechStatus,
  interim,
  supported,
  errorMessage,
  onAddNote,
  onSetHighlights,
  onExtract,
  onDeleteSelection,
}: TranscriptPanelProps) {
  const [draft, setDraft] = useState('')
  const [composing, setComposing] = useState(false)
  const [menu, setMenu] = useState<SelectionMenu | null>(null)
  const [stickToBottom, setStickToBottom] = useState(true)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLTextAreaElement | null>(null)
  const listening = speechStatus === 'listening'
  const latestId = session.segments.at(-1)?.id
  const selectedIds = menu
    ? Array.from(new Set(menu.parts.map((part) => part.id)))
    : []
  const allHighlighted =
    selectedIds.length > 0 &&
    selectedIds.every(
      (id) => session.segments.find((segment) => segment.id === id)?.highlighted,
    )

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    const node = scrollRef.current
    if (!node) return
    node.scrollTo({ top: node.scrollHeight, behavior })
    setStickToBottom(true)
  }

  useEffect(() => {
    setStickToBottom(true)
    setMenu(null)
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [session.id])

  useEffect(() => {
    if (!stickToBottom) return
    const node = scrollRef.current
    if (node) node.scrollTop = node.scrollHeight
  }, [session.segments.length, interim, stickToBottom])

  useEffect(() => {
    if (!menu) return
    const close = () => setMenu(null)
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('resize', close)
    window.addEventListener('keydown', onKey)
    scrollRef.current?.addEventListener('scroll', close, { passive: true })
    const scroller = scrollRef.current
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('resize', close)
      window.removeEventListener('keydown', onKey)
      scroller?.removeEventListener('scroll', close)
    }
  }, [menu])

  const handleContextMenu = (event: MouseEvent<HTMLDivElement>) => {
    const selection = window.getSelection()
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) return
    const range = selection.getRangeAt(0)
    const container = scrollRef.current
    if (!container?.contains(range.commonAncestorContainer)) return
    const { parts, text } = readSelectionParts(container, range, session)
    if (parts.length === 0 || !text.trim()) return
    event.preventDefault()
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 206),
      y: Math.min(event.clientY, window.innerHeight - 148),
      text: text.trim(),
      parts,
    })
  }

  const clearSelection = () => {
    window.getSelection()?.removeAllRanges()
    setMenu(null)
  }

  const submitNote = () => {
    const text = draft.trim()
    if (!text) return
    onAddNote(text)
    setDraft('')
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
        inputRef.current.focus()
      }
    })
  }

  return (
    <section className="relative flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.055] px-5 py-3">
        <div className="flex items-baseline gap-2.5">
          <h2 className="text-[12px] font-medium tracking-[0.01em] text-[#dfe2e7]">实时原文</h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#5f6774]">
            transcript
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-1.5 text-[9.5px] text-[#626a77] md:flex">
            <SquarePen className="h-2.5 w-2.5" />
            选中文本右键可标注 / 提取
          </span>
          <span className="mono-num rounded-[4px] border border-white/[0.07] px-1.5 py-0.5 text-[9px] text-[#6e7784]">
            {String(session.segments.length).padStart(2, '0')}
          </span>
        </div>
      </div>

      {!supported ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-[#a9946c]/[0.12] bg-[#6d5f41]/10 px-5 py-2 text-[10.5px] leading-4 text-[#b6aa8e]">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            当前浏览器未提供 Web Speech API，已进入手动输入降级模式。文字备注仍会实时进入
            AI 提炼；建议使用桌面版 Chrome / Edge 获得语音转写。
          </span>
        </div>
      ) : null}

      {speechStatus === 'error' && errorMessage ? (
        <div className="flex shrink-0 items-start gap-2 border-b border-[#a87676]/15 bg-[#6f4545]/10 px-5 py-2 text-[10.5px] leading-4 text-[#c0a0a0]">
          <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        onContextMenu={handleContextMenu}
        onScroll={(event) => {
          const node = event.currentTarget
          const nearBottom = node.scrollHeight - node.scrollTop - node.clientHeight < 90
          setStickToBottom(nearBottom)
        }}
        className="relative min-h-0 flex-1 overflow-y-auto scroll-smooth"
      >
        <div className="mx-auto flex min-h-full w-full max-w-[860px] flex-col px-4 py-4 sm:px-5">
          {session.segments.length === 0 && !interim ? (
            <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-[10px] border border-white/[0.08] bg-white/[0.025]">
                <Waves className="h-[18px] w-[18px] text-[#7d8796]" strokeWidth={1.5} />
              </div>
              <p className="mt-4 text-[13px] font-medium text-[#b9bec7]">等待第一句话</p>
              <p className="mt-1.5 max-w-[330px] text-[11px] leading-5 text-[#6e7683]">
                {supported
                  ? '开启麦克风后持续收音，原文逐字上屏，摘要随讲话增量生长。'
                  : '直接在下方输入备注，AI 会随每次输入持续更新摘要、任务与时间节点。'}
              </p>
              <div className="mt-4 flex items-center gap-1.5 rounded-[5px] border border-white/[0.06] bg-black/[0.08] px-2 py-1 font-mono text-[8.5px] tracking-[0.05em] text-[#5c6572]">
                <Keyboard className="h-2.5 w-2.5" />
                ENTER 添加备注 · SHIFT + ENTER 换行
              </div>
            </div>
          ) : (
            <div className="space-y-0.5">
              {session.segments.map((segment) => {
                const isLatest = segment.id === latestId
                if (segment.kind === 'note') {
                  return (
                    <div
                      key={segment.id}
                      data-segment-id={segment.id}
                      data-highlight={segment.highlighted ? 'true' : 'false'}
                      className={cn(
                        'transcript-row flex gap-2.5 px-2 py-2.5',
                        isLatest && 'bg-white/[0.012]',
                      )}
                    >
                      <div className="w-[38px] shrink-0 pt-1 text-right font-mono text-[8.5px] leading-4 text-[#545c69]">
                        {formatClock(segment.atSec)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1.5 flex items-center gap-1.5">
                          <PenLine className="h-2.5 w-2.5 text-[#9d8e6d]" />
                          <span className="text-[9px] font-medium tracking-[0.04em] text-[#9d8e6d]">
                            手动备注
                          </span>
                          {segment.highlighted ? (
                            <span className="rounded-[3px] bg-[#a9925e]/10 px-1 py-px text-[8px] text-[#b5a171]">
                              重点
                            </span>
                          ) : null}
                        </div>
                        <div
                          data-segment-content
                          className="rounded-[6px] border border-[#a28f64]/15 bg-[#a28f64]/[0.045] px-2.5 py-2 font-mono text-[12px] leading-[1.75] text-[#cbc4b6]"
                        >
                          <TokenizedText text={segment.text} />
                        </div>
                      </div>
                    </div>
                  )
                }

                return (
                  <div
                    key={segment.id}
                    data-segment-id={segment.id}
                    data-highlight={segment.highlighted ? 'true' : 'false'}
                    className={cn(
                      'transcript-row flex gap-2.5 px-2 py-2.5',
                      isLatest && 'bg-white/[0.014]',
                    )}
                  >
                    <div className="flex w-[38px] shrink-0 flex-col items-end gap-1 pt-1">
                      <span className="font-mono text-[8.5px] leading-4 text-[#545c69]">
                        {formatClock(segment.atSec)}
                      </span>
                      {isLatest ? (
                        <span className="h-1 w-1 rounded-full bg-[#72829a]" />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start gap-2">
                        <Mic className="mt-[5px] h-2.5 w-2.5 shrink-0 text-[#596370]" />
                        <p
                          data-segment-content
                          className="min-w-0 font-mono text-[12.5px] leading-[1.85] tracking-[-0.005em] text-[#c6cbd4]"
                        >
                          <TokenizedText text={segment.text} />
                        </p>
                      </div>
                      {segment.highlighted ? (
                        <div className="mt-1.5 flex justify-end">
                          <span className="rounded-[3px] bg-[#a9925e]/[0.08] px-1.5 py-px text-[8px] tracking-[0.04em] text-[#b5a171]">
                            重点标记
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {interim ? (
                <div className="flex gap-2.5 px-2 py-2.5">
                  <div className="w-[38px] shrink-0 pt-1 text-right font-mono text-[8.5px] leading-4 text-[#545c69]">
                    ··
                  </div>
                  <div className="flex min-w-0 flex-1 items-start gap-2">
                    <span className="mt-[7px] h-1 w-1 shrink-0 animate-soft-pulse rounded-full bg-[#8697ad]" />
                    <p className="stream-caret min-w-0 font-mono text-[12.5px] leading-[1.85] text-[#8e99a8]">
                      {interim}
                    </p>
                  </div>
                </div>
              ) : listening ? (
                <div className="flex gap-2.5 px-2 py-2.5">
                  <div className="w-[38px] shrink-0" />
                  <div className="flex items-center gap-2">
                    <span className="h-1 w-1 animate-soft-pulse rounded-full bg-[#71877a]" />
                    <span className="font-mono text-[9px] tracking-[0.06em] text-[#5d6b62]">
                      聆听中
                    </span>
                  </div>
                </div>
              ) : null}
              <div className="h-2" />
            </div>
          )}
        </div>
      </div>

      {!stickToBottom && session.segments.length > 0 ? (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          className="absolute bottom-[118px] left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-white/[0.11] bg-[#1b1f2a]/95 px-2.5 py-1.5 text-[9.5px] text-[#a5aebb] shadow-station backdrop-blur"
        >
          <ArrowDown className="h-2.5 w-2.5" />
          回到最新
        </button>
      ) : null}

      <div className="shrink-0 border-t border-white/[0.06] bg-[#141720]/60 p-3">
        <div className="rounded-[8px] border border-white/[0.075] bg-[#10131a]/85 px-2.5 py-2 transition-colors focus-within:border-[#7b96c2]/30">
          <div className="flex items-start gap-2">
            <PenLine className="mt-[7px] h-3 w-3 shrink-0 text-[#707986]" />
            <textarea
              ref={inputRef}
              value={draft}
              rows={1}
              maxLength={2000}
              placeholder="补充备注，实时进入 AI 上下文…"
              enterKeyHint="enter"
              onChange={(event) => setDraft(event.target.value)}
              onCompositionStart={() => setComposing(true)}
              onCompositionEnd={() => setComposing(false)}
              onInput={(event) => {
                const node = event.currentTarget
                node.style.height = 'auto'
                node.style.height = `${Math.min(116, node.scrollHeight)}px`
              }}
              onKeyDown={(event) => {
                if (
                  event.key === 'Enter' &&
                  !event.shiftKey &&
                  !composing &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault()
                  submitNote()
                }
              }}
              className="max-h-[116px] min-h-[26px] flex-1 resize-none bg-transparent py-1 font-mono text-[12px] leading-5 text-[#cbd0d8] outline-none placeholder:text-[#5f6774]"
            />
            <div className="mt-1 flex shrink-0 items-center gap-1.5">
              {draft.length > 0 ? (
                <button
                  type="button"
                  onClick={submitNote}
                  className="grid h-5 w-5 place-items-center rounded-[4px] bg-[#475d7d]/50 text-[#c3cfdf] transition-colors hover:bg-[#526a8d]/60"
                  title="添加备注（Enter）"
                >
                  <ArrowDown className="h-2.5 w-2.5 -rotate-90" />
                </button>
              ) : (
                <span className="rounded-[3px] border border-white/[0.07] px-1 py-0.5 font-mono text-[8px] text-[#5e6673]">
                  ↵
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="mt-1.5 flex items-center justify-between gap-3 px-0.5">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-[9px] text-[#5f6773]">
            <span className="h-1 w-1 shrink-0 rounded-full bg-[#7282a0]" />
            备注会作为下一轮提炼上下文，不会打断收音
          </p>
          <span className="mono-num shrink-0 text-[8.5px] text-[#545c68]">
            {draft.length ? `${draft.length}/2000` : 'AUTO SAVE'}
          </span>
        </div>
      </div>

      {menu ? (
        <div
          style={{ left: menu.x, top: menu.y }}
          className="fixed z-[70] w-[196px] animate-fade-in overflow-hidden rounded-[8px] border border-white/[0.1] bg-[#1a1d27] p-1 shadow-station"
        >
          <div className="border-b border-white/[0.055] px-2 pb-1.5 pt-1">
            <p className="line-clamp-2 text-[9.5px] leading-4 text-[#717a88]">「{menu.text.slice(0, 60)}」</p>
          </div>
          <button
            type="button"
            onClick={() => {
              onSetHighlights(selectedIds, !allHighlighted)
              clearSelection()
            }}
            className="mt-1 flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11.5px] text-[#cbd0d8] transition-colors hover:bg-white/[0.055]"
          >
            <Highlighter className="h-3 w-3 text-[#a9935f]" />
            {allHighlighted ? '取消重点高亮' : '标记为重点'}
          </button>
          <button
            type="button"
            onClick={() => {
              onExtract(menu.text)
              clearSelection()
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11.5px] text-[#cbd0d8] transition-colors hover:bg-white/[0.055]"
          >
            <Quote className="h-3 w-3 text-[#8ca9d3]" />
            单独提取
          </button>
          <div className="my-1 h-px bg-white/[0.055]" />
          <button
            type="button"
            onClick={() => {
              onDeleteSelection(menu.parts)
              clearSelection()
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11.5px] text-[#cc9f9f] transition-colors hover:bg-[#8d5b5b]/15"
          >
            <Scissors className="h-3 w-3" />
            删除所选片段
          </button>
        </div>
      ) : null}
    </section>
  )
}
