import { useEffect, useState } from 'react'
import {
  Download,
  Eraser,
  Mic,
  MicOff,
  Pause,
  Play,
  ShieldAlert,
} from 'lucide-react'
import type { MeetingSession, SpeechStatus } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Waveform } from '@/components/Waveform'
import { formatClock } from '@/lib/time'
import { cn } from '@/lib/utils'

interface ControlBarProps {
  session: MeetingSession
  speechStatus: SpeechStatus
  analyser: AnalyserNode | null
  onToggleMic: () => void
  onPause: () => void
  onResume: () => void
  onClear: () => void
  onTitleChange: (title: string) => void
  onExport: () => void
}

const STATUS_META: Record<
  SpeechStatus,
  { label: string; dot: string; text: string }
> = {
  idle: { label: '待机', dot: 'bg-[#69717f]', text: 'text-[#858d99]' },
  requesting: {
    label: '请求权限',
    dot: 'animate-soft-pulse bg-[#ac9b70]',
    text: 'text-[#b2a57f]',
  },
  listening: { label: '收音中', dot: 'animate-soft-pulse bg-[#7f9c84]', text: 'text-[#93b09a]' },
  paused: { label: '已暂停', dot: 'bg-[#ac9b70]', text: 'text-[#b2a57f]' },
  denied: { label: '权限拒绝', dot: 'bg-[#b37a7a]', text: 'text-[#c18c8c]' },
  unsupported: { label: '语音不可用', dot: 'bg-[#6e7683]', text: 'text-[#858d99]' },
  error: { label: '识别异常', dot: 'bg-[#b37a7a]', text: 'text-[#c18c8c]' },
}

export function ControlBar({
  session,
  speechStatus,
  analyser,
  onToggleMic,
  onPause,
  onResume,
  onClear,
  onTitleChange,
  onExport,
}: ControlBarProps) {
  const [title, setTitle] = useState(session.title)
  const [clearOpen, setClearOpen] = useState(false)
  const statusMeta = STATUS_META[speechStatus]
  const listening = speechStatus === 'listening'
  const paused = speechStatus === 'paused'
  const requesting = speechStatus === 'requesting'
  const segmentCount = session.segments.filter((segment) => segment.kind === 'speech').length
  const noteCount = session.segments.filter((segment) => segment.kind === 'note').length

  useEffect(() => {
    setTitle(session.title)
  }, [session.id, session.title])

  const commitTitle = () => {
    const next = title.trim()
    if (next && next !== session.title) onTitleChange(next)
    else if (!next) setTitle(session.title)
  }

  const micLabel = listening
    ? '收音中'
    : paused
      ? '已暂停'
      : requesting
        ? '请求权限…'
        : speechStatus === 'denied'
          ? '重试麦克风'
          : speechStatus === 'unsupported'
            ? '语音不可用'
            : '开启麦克风'

  return (
    <header className="shrink-0 border-b border-white/[0.06]">
      <div className="px-4 pb-3.5 pt-4 sm:px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center gap-2">
              <span className="section-label">Live Session</span>
              <span className="h-2.5 w-px bg-white/[0.09]" />
              <span className={cn('flex items-center gap-1.5 text-[9.5px]', statusMeta.text)}>
                <span className={cn('h-1 w-1 rounded-full', statusMeta.dot)} />
                {statusMeta.label}
              </span>
              {session.isDemo ? (
                <span className="rounded-[3px] border border-white/[0.08] px-1 py-px text-[8.5px] text-[#707885]">
                  示例数据
                </span>
              ) : null}
            </div>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.currentTarget.blur()
                }
                if (event.key === 'Escape') {
                  setTitle(session.title)
                  event.currentTarget.blur()
                }
              }}
              aria-label="会议标题"
              title="点击编辑会议标题"
              className="w-full max-w-[560px] cursor-text truncate rounded-[4px] border border-transparent bg-transparent px-0 py-0 text-[19px] font-semibold leading-[1.35] tracking-[-0.015em] text-[#e4e6ea] outline-none transition-colors hover:border-white/[0.07] focus:border-white/[0.1] focus:bg-white/[0.018] focus:px-1.5 sm:text-[20px]"
            />
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-[#737b88]">
              <span className="mono-num">
                时长&nbsp;
                <span className="text-[#aeb5bf]">{formatClock(session.durationSec)}</span>
              </span>
              <span className="h-2.5 w-px bg-white/[0.08]" />
              <span>
                语音 <span className="mono-num text-[#a1a9b4]">{segmentCount}</span>
              </span>
              <span>
                备注 <span className="mono-num text-[#a1a9b4]">{noteCount}</span>
              </span>
              <span className="h-2.5 w-px bg-white/[0.08]" />
              <span className="truncate">自动保存于本机</span>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="mt-5 hidden shrink-0 gap-1.5 text-[#9ba4b1] sm:inline-flex"
            onClick={onExport}
          >
            <Download className="h-3 w-3" />
            导出
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/[0.045] px-4 py-2.5 sm:px-5">
        <Button
          variant={listening ? 'secondary' : 'default'}
          size="sm"
          onClick={onToggleMic}
          disabled={speechStatus === 'unsupported' || requesting}
          className={cn(
            'h-8 gap-1.5 border px-3 text-[11.5px]',
            listening
              ? 'border-[#6f8b74]/30 bg-[#4a5b4d]/20 text-[#b6c8bb] hover:bg-[#4a5b4d]/30'
              : paused
                ? 'border-[#a4956b]/25 bg-[#5d553a]/20 text-[#c0b48e] hover:bg-[#5d553a]/30'
                : '',
          )}
        >
          {listening || paused ? (
            <MicOff className="h-3.5 w-3.5" />
          ) : (
            <Mic className="h-3.5 w-3.5" />
          )}
          {micLabel}
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={paused ? onResume : onPause}
          disabled={!listening && !paused}
          className="h-8 gap-1.5 border-white/[0.08] px-2.5 text-[11.5px]"
          title={paused ? '继续收音' : '暂停收音'}
        >
          {paused ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
          <span className="hidden sm:inline">{paused ? '继续' : '暂停'}</span>
        </Button>

        <div className="mx-1 flex min-w-0 items-center gap-2.5">
          <Waveform analyser={analyser} active={listening} paused={paused} />
          <div className="hidden min-w-[66px] sm:block">
            <p className={cn('text-[9.5px] leading-3', statusMeta.text)}>{statusMeta.label}</p>
            <p className="mt-1 font-mono text-[8.5px] leading-3 text-[#5e6673]">
              {listening ? 'LIVE' : paused ? 'HOLD' : 'OFFLINE'}
            </p>
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <div className="mr-1 flex items-center gap-2 rounded-[6px] border border-white/[0.07] bg-black/[0.08] px-2.5 py-1.5">
            <span className="text-[9px] uppercase tracking-[0.08em] text-[#646c79]">REC</span>
            <span className="mono-num text-[13px] font-medium tracking-[0.03em] text-[#c8cdd5]">
              {formatClock(session.durationSec)}
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => setClearOpen(true)}
            title="清空本次会话"
            className="text-[#737b88]"
          >
            <Eraser className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {speechStatus === 'denied' ? (
        <div className="flex items-center gap-2 border-t border-[#a87676]/15 bg-[#6f4545]/10 px-4 py-2 text-[10.5px] text-[#c0a0a0] sm:px-5">
          <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
          麦克风权限被拒绝，可在浏览器站点设置中允许后点击「重试麦克风」。手动备注与实时提炼仍可使用。
        </div>
      ) : null}

      <Dialog open={clearOpen} onOpenChange={setClearOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>清空本次会话？</DialogTitle>
            <DialogDescription>
              当前会议的转写原文、摘要、任务与时间节点会被清空，会议标题与本地会话保留。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setClearOpen(false)}>
              取消
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                onClear()
                setClearOpen(false)
              }}
            >
              清空内容
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </header>
  )
}
