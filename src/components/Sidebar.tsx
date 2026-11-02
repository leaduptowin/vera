import { useEffect, useRef, useState, type MouseEvent } from 'react'
import {
  CheckSquare2,
  Clock3,
  Download,
  HardDrive,
  MoreHorizontal,
  Pencil,
  Plus,
  Radio,
  Trash2,
} from 'lucide-react'
import type { MeetingSession } from '@/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { formatDurationCompact, formatSessionDate } from '@/lib/time'
import { cn } from '@/lib/utils'

interface SidebarProps {
  sessions: MeetingSession[]
  activeSessionId: string
  storageStatus: 'loading' | 'saving' | 'saved' | 'error'
  storageError: string | null
  onCreate: () => void
  onSelect: (id: string) => void
  onRename: (id: string, title: string) => void
  onExport: (session: MeetingSession) => void
  onDelete: (id: string) => void
}

interface MenuState {
  session: MeetingSession
  x: number
  y: number
}

export function Sidebar({
  sessions,
  activeSessionId,
  storageStatus,
  storageError,
  onCreate,
  onSelect,
  onRename,
  onExport,
  onDelete,
}: SidebarProps) {
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [renaming, setRenaming] = useState<MeetingSession | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [deleting, setDeleting] = useState<MeetingSession | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menu) return
    const close = (event: Event) => {
      if (menuRef.current?.contains(event.target as Node)) return
      setMenu(null)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenu(null)
    }
    window.addEventListener('click', close)
    window.addEventListener('contextmenu', close)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('contextmenu', close)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [menu])

  const openMenu = (session: MeetingSession, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setMenu({ session, x: event.clientX, y: event.clientY })
  }

  const openMenuFromButton = (session: MeetingSession, event: MouseEvent) => {
    event.stopPropagation()
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setMenu({ session, x: rect.right - 158, y: rect.bottom + 5 })
  }

  const beginRename = (session: MeetingSession) => {
    setRenameValue(session.title)
    setRenaming(session)
    setMenu(null)
  }

  const submitRename = () => {
    if (!renaming) return
    const title = renameValue.trim()
    if (title) onRename(renaming.id, title)
    setRenaming(null)
  }

  const storageLabel =
    storageStatus === 'error'
      ? '保存异常'
      : storageStatus === 'loading'
        ? '本地存储'
        : '自动保存至本机'

  return (
    <aside className="station-card flex h-full min-h-0 flex-col overflow-hidden rounded-[13px]">
      <div className="shrink-0 px-4 pb-3 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="grid h-7 w-7 place-items-center rounded-[7px] border border-white/[0.12] bg-white/[0.035]">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path
                  d="M2.5 11.5V6.8c0-1.7 1.4-3.1 3.1-3.1h.6c1.7 0 3.1 1.4 3.1 3.1v.4c0 1.7 1.4 3.1 3.1 3.1h.8"
                  stroke="#b8c1cf"
                  strokeWidth="1.15"
                  strokeLinecap="round"
                />
                <circle cx="13.1" cy="4.2" r="1.15" fill="#899fbd" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-[12px] font-medium tracking-[0.18em] text-[#e3e5e9]">
                  MINUTE
                </span>
                <span className="rounded-[3px] border border-white/[0.09] px-1 py-px font-mono text-[8px] tracking-[0.1em] text-[#737b88]">
                  BETA
                </span>
              </div>
              <p className="mt-0.5 text-[10.5px] tracking-[0.02em] text-[#767e8b]">
                实时会议工作台
              </p>
            </div>
          </div>
          <Radio className="mt-1 h-3.5 w-3.5 text-[#576477]" />
        </div>

        <Button
          variant="secondary"
          className="mt-4 h-8 w-full justify-start border-white/[0.09] bg-white/[0.045] px-2.5 text-[12px] text-[#d4d8df]"
          onClick={onCreate}
        >
          <Plus className="h-3.5 w-3.5 text-[#98a4b5]" />
          新建会议
          <span className="ml-auto font-mono text-[9px] tracking-[0.08em] text-[#5f6773]">
            NEW
          </span>
        </Button>
      </div>

      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-1">
        <span className="section-label">会话记录</span>
        <span className="font-mono text-[9.5px] text-[#5f6773]">
          {String(sessions.length).padStart(2, '0')}
        </span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        <div className="space-y-0.5">
          {sessions.map((session) => {
            const active = session.id === activeSessionId
            const openTasks = session.summary.tasks.filter((task) => !task.done).length
            return (
              <div
                key={session.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(session.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') onSelect(session.id)
                }}
                onContextMenu={(event) => openMenu(session, event)}
                className={cn(
                  'group relative cursor-pointer rounded-[8px] border border-transparent px-2.5 py-2.5 outline-none transition-colors focus-visible:border-white/[0.13]',
                  active
                    ? 'border-white/[0.075] bg-white/[0.045]'
                    : 'hover:bg-white/[0.026]',
                )}
              >
                {active ? (
                  <span className="absolute left-0 top-3 h-3.5 w-[1.5px] rounded-full bg-[#8fa5c2]" />
                ) : null}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={cn(
                          'truncate text-[12px] font-medium leading-4',
                          active ? 'text-[#e4e7eb]' : 'text-[#b8bdc6]',
                        )}
                      >
                        {session.title}
                      </p>
                      {session.isDemo ? (
                        <span className="shrink-0 rounded-[3px] border border-white/[0.08] px-1 py-px text-[8px] text-[#717987]">
                          示例
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 truncate text-[10px] text-[#686f7c]">
                      {formatSessionDate(session.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label="管理会话"
                    onClick={(event) => openMenuFromButton(session, event)}
                    className="mt-[-2px] grid h-6 w-6 shrink-0 place-items-center rounded-[5px] text-[#6f7784] opacity-100 transition-opacity hover:bg-white/[0.06] hover:text-[#c1c6cf] focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-3 pl-0.5 text-[9.5px] text-[#656d7a]">
                  <span className="mono-num flex items-center gap-1">
                    <Clock3 className="h-2.5 w-2.5" />
                    {formatDurationCompact(session.durationSec)}
                  </span>
                  <span className="mono-num flex items-center gap-1">
                    <CheckSquare2 className="h-2.5 w-2.5" />
                    {openTasks} 项待办
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 border-t border-white/[0.055] px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-[9.5px] text-[#626a77]">
            <HardDrive className="h-3 w-3" />
            本地存储
          </span>
          <span
            className={cn(
              'flex items-center gap-1.5 font-mono text-[8.5px] uppercase tracking-[0.06em]',
              storageStatus === 'error' ? 'text-[#b88a8a]' : 'text-[#626a77]',
            )}
          >
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                storageStatus === 'saving'
                  ? 'animate-soft-pulse bg-[#9b8d68]'
                  : storageStatus === 'error'
                    ? 'bg-[#b06b6b]'
                    : 'bg-[#6e8775]',
              )}
            />
            {storageLabel}
          </span>
        </div>
        {storageError ? (
          <p className="mt-1.5 text-[9.5px] leading-4 text-[#b88a8a]">{storageError}</p>
        ) : (
          <p className="mt-1.5 text-[9.5px] leading-4 text-[#555d69]">右键会话可重命名 / 导出 / 删除</p>
        )}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          style={{
            left: Math.min(menu.x, window.innerWidth - 174),
            top: Math.min(menu.y, window.innerHeight - 138),
          }}
          className="fixed z-[75] w-[158px] animate-fade-in overflow-hidden rounded-[8px] border border-white/[0.1] bg-[#1a1d27] p-1 shadow-station"
        >
          <button
            type="button"
            onClick={() => beginRename(menu.session)}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11.5px] text-[#cbd0d8] transition-colors hover:bg-white/[0.055]"
          >
            <Pencil className="h-3 w-3 text-[#818a98]" />
            重命名
          </button>
          <button
            type="button"
            onClick={() => {
              onExport(menu.session)
              setMenu(null)
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11.5px] text-[#cbd0d8] transition-colors hover:bg-white/[0.055]"
          >
            <Download className="h-3 w-3 text-[#818a98]" />
            导出 Markdown
          </button>
          <div className="my-1 h-px bg-white/[0.06]" />
          <button
            type="button"
            onClick={() => {
              setDeleting(menu.session)
              setMenu(null)
            }}
            className="flex w-full items-center gap-2 rounded-[5px] px-2 py-1.5 text-left text-[11.5px] text-[#cc9f9f] transition-colors hover:bg-[#8d5b5b]/15"
          >
            <Trash2 className="h-3 w-3" />
            删除会话
          </button>
        </div>
      ) : null}

      <Dialog open={Boolean(renaming)} onOpenChange={(open) => !open && setRenaming(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>重命名会话</DialogTitle>
            <DialogDescription>标题会立即更新并保存在本机。</DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={renameValue}
            onChange={(event) => setRenameValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') submitRename()
            }}
            placeholder="输入会议标题"
          />
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRenaming(null)}>
              取消
            </Button>
            <Button size="sm" onClick={submitRename} disabled={!renameValue.trim()}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>删除这场会议？</DialogTitle>
            <DialogDescription>
              「{deleting?.title}」的原文、摘要、任务与勾选状态将从本机永久移除，无法恢复。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleting(null)}>
              取消
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => {
                if (deleting) onDelete(deleting.id)
                setDeleting(null)
              }}
            >
              确认删除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </aside>
  )
}
