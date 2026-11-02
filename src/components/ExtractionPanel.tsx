import { useMemo, useState, type ReactNode } from 'react'
import {
  CalendarClock,
  CheckSquare2,
  Clock3,
  Hash,
  Link2,
  ListTodo,
  Pencil,
  Plus,
  ScanSearch,
  Trash2,
  UserRound,
} from 'lucide-react'
import type { MeetingSummary, MeetingTask, TranscriptSegment } from '@/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { TaskDialog } from '@/components/TaskDialog'
import { extractKeyInfo, KEY_INFO_META } from '@/lib/key-info'
import { cn } from '@/lib/utils'

interface ExtractionPanelProps {
  summary: MeetingSummary
  segments: TranscriptSegment[]
  isStreaming: boolean
  onAddTask: (input: { owner: string; what: string; due: string }) => void
  onUpdateTask: (id: string, input: { owner: string; what: string; due: string }) => void
  onToggleTask: (id: string, done: boolean) => void
  onDeleteTask: (task: MeetingTask) => void
}

function SectionHead({
  icon,
  title,
  count,
  action,
}: {
  icon: ReactNode
  title: string
  count: string
  action?: ReactNode
}) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="text-[#7b8491]">{icon}</span>
      <h3 className="text-[10px] font-semibold tracking-[0.07em] text-[#929ba8]">{title}</h3>
      <span className="font-mono text-[8.5px] text-[#555d69]">{count}</span>
      <span className="h-px flex-1 bg-white/[0.05]" />
      {action}
    </div>
  )
}

export function ExtractionPanel({
  summary,
  segments,
  isStreaming,
  onAddTask,
  onUpdateTask,
  onToggleTask,
  onDeleteTask,
}: ExtractionPanelProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<MeetingTask | null>(null)
  const keyInfo = useMemo(
    () => extractKeyInfo(segments.map((segment) => segment.text), 16),
    [segments],
  )
  const openTasks = summary.tasks.filter((task) => !task.done).length
  const completedTasks = summary.tasks.length - openTasks

  const openAdd = () => {
    setEditingTask(null)
    setDialogOpen(true)
  }

  const openEdit = (task: MeetingTask) => {
    setEditingTask(task)
    setDialogOpen(true)
  }

  const saveTask = (input: { owner: string; what: string; due: string }) => {
    if (editingTask) onUpdateTask(editingTask.id, input)
    else onAddTask(input)
    setEditingTask(null)
  }

  return (
    <section className="station-card flex h-full min-h-0 flex-col overflow-hidden rounded-[13px]">
      <div className="flex shrink-0 items-center justify-between border-b border-white/[0.055] px-4 py-3">
        <div className="flex items-center gap-2">
          <h2 className="text-[12px] font-medium tracking-[0.01em] text-[#dfe2e7]">自动识别</h2>
          <span className="font-mono text-[8.5px] uppercase tracking-[0.12em] text-[#5f6774]">
            extraction
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="flex items-center gap-1.5 text-[9px] text-[#68717e]">
            <span
              className={cn(
                'h-1 w-1 rounded-full',
                isStreaming ? 'animate-soft-pulse bg-[#849bb8]' : 'bg-[#61706b]',
              )}
            />
            {isStreaming ? '同步中' : '实时同步'}
          </span>
          <span className="mono-num rounded-[4px] border border-white/[0.065] px-1.5 py-0.5 text-[8.5px] text-[#6c7581]">
            {openTasks}/{summary.tasks.length}
          </span>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3.5 py-3.5">
        <section>
          <SectionHead
            icon={<ListTodo className="h-3 w-3" />}
            title="待办任务"
            count={String(summary.tasks.length).padStart(2, '0')}
            action={
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={openAdd}
                title="新增待办"
                className="h-5 w-5 text-[#6e7784]"
              >
                <Plus className="h-3 w-3" />
              </Button>
            }
          />

          {summary.tasks.length > 0 ? (
            <div className="space-y-1.5">
              {summary.tasks.map((task) => (
                <div
                  key={task.id}
                  className={cn(
                    'group animate-fade-up rounded-[7px] border border-white/[0.06] bg-black/[0.085] px-2.5 py-2 transition-colors hover:border-white/[0.095]',
                    task.done && 'opacity-55',
                  )}
                >
                  <div className="flex items-start gap-2.5">
                    <Checkbox
                      checked={task.done}
                      onCheckedChange={(checked) => onToggleTask(task.id, checked === true)}
                      className="mt-[2px]"
                      aria-label={`完成任务：${task.what}`}
                    />
                    <div className="min-w-0 flex-1">
                      <p
                        className={cn(
                          'text-[11.5px] leading-[1.6] text-[#cbd0d8]',
                          task.done && 'line-through decoration-[#646c78]',
                        )}
                      >
                        {task.what}
                      </p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                        <span className="flex items-center gap-1 rounded-[3px] bg-white/[0.035] px-1.5 py-[1px] text-[8.5px] text-[#8d97a4]">
                          <UserRound className="h-2 w-2" />
                          {task.owner}
                        </span>
                        <span
                          className={cn(
                            'flex items-center gap-1 rounded-[3px] px-1.5 py-[1px] text-[8.5px]',
                            task.due === '未设截止'
                              ? 'bg-white/[0.025] text-[#666f7c]'
                              : 'bg-[#a9925e]/[0.065] text-[#aa9b7d]',
                          )}
                        >
                          <Clock3 className="h-2 w-2" />
                          {task.due}
                        </span>
                        {!task.auto ? (
                          <span className="rounded-[3px] border border-white/[0.07] px-1 py-px text-[7.5px] tracking-[0.04em] text-[#646d79]">
                            MANUAL
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-100 transition-opacity focus-within:opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                      <button
                        type="button"
                        onClick={() => openEdit(task)}
                        aria-label="编辑任务"
                        className="grid h-5 w-5 place-items-center rounded-[4px] text-[#6f7885] hover:bg-white/[0.06] hover:text-[#c3c9d2]"
                      >
                        <Pencil className="h-2.5 w-2.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteTask(task)}
                        aria-label="删除任务"
                        className="grid h-5 w-5 place-items-center rounded-[4px] text-[#6f7885] hover:bg-[#8d5b5b]/15 hover:text-[#cc9f9f]"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[7px] border border-dashed border-white/[0.07] px-3 py-4 text-center">
              <CheckSquare2 className="mx-auto h-4 w-4 text-[#5b6471]" strokeWidth={1.5} />
              <p className="mt-1.5 text-[10px] text-[#6a7380]">还没有识别到明确任务</p>
              <p className="mt-0.5 text-[9px] text-[#555e6b]">试试说「小王负责周五前输出方案」</p>
            </div>
          )}

          {summary.tasks.length > 0 && completedTasks > 0 ? (
            <div className="mt-2 flex items-center gap-2 px-1">
              <div className="h-[2px] flex-1 overflow-hidden rounded-full bg-white/[0.055]">
                <div
                  className="h-full rounded-full bg-[#72866f] transition-[width] duration-300"
                  style={{ width: `${(completedTasks / summary.tasks.length) * 100}%` }}
                />
              </div>
              <span className="mono-num text-[8px] text-[#5e6773]">
                {completedTasks} DONE
              </span>
            </div>
          ) : null}
        </section>

        <div className="my-3.5 h-px bg-white/[0.055]" />

        <section>
          <SectionHead
            icon={<CalendarClock className="h-3 w-3" />}
            title="时间节点"
            count={String(summary.timeline.length).padStart(2, '0')}
          />
          {summary.timeline.length > 0 ? (
            <div className="relative space-y-1 pl-1">
              <span className="absolute bottom-2 left-[3px] top-2 w-px bg-white/[0.06]" />
              {summary.timeline.map((item) => (
                <div
                  key={item.id}
                  className="relative flex animate-fade-up items-start gap-2.5 py-1 pl-4"
                >
                  <span className="absolute left-0 top-[9px] h-[5px] w-[5px] rounded-full border border-[#7c718f] bg-[#1a1d26]" />
                  <span className="min-w-[74px] shrink-0 rounded-[3px] bg-[#b066ff]/[0.055] px-1.5 py-[1px] text-center text-[8.5px] text-[#a797ba]">
                    {item.date}
                  </span>
                  <span className="min-w-0 text-[10.5px] leading-[1.55] text-[#aeb5c0]">
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="px-1 text-[9.5px] italic text-[#555e6b]">暂未识别到日期或排期。</p>
          )}
        </section>

        <div className="my-3.5 h-px bg-white/[0.055]" />

        <section>
          <SectionHead
            icon={<ScanSearch className="h-3 w-3" />}
            title="关键信息"
            count={String(keyInfo.length).padStart(2, '0')}
          />
          {keyInfo.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {keyInfo.map((item) => {
                const meta = KEY_INFO_META[item.type]
                const Icon =
                  item.type === 'link'
                    ? Link2
                    : item.type === 'date'
                      ? CalendarClock
                      : item.type === 'identifier'
                        ? Hash
                        : ScanSearch
                if (item.type === 'link') {
                  return (
                    <a
                      key={item.key}
                      href={item.value}
                      target="_blank"
                      rel="noreferrer"
                      title={`链接：${item.value}`}
                      onClick={(event) => event.stopPropagation()}
                      className={cn(
                        'flex max-w-full items-center gap-1 rounded-[3px] border border-white/[0.06] bg-white/[0.025] px-1.5 py-1 text-[8.5px] transition-colors hover:border-white/[0.1]',
                        meta.className,
                      )}
                    >
                      <Icon className="h-2.5 w-2.5 shrink-0" />
                      <span className="max-w-[180px] truncate">{item.value.replace(/^https?:\/\//, '')}</span>
                    </a>
                  )
                }
                return (
                  <span
                    key={item.key}
                    title={`${meta.label}：${item.value}`}
                    className={cn(
                      'flex max-w-full items-center gap-1 rounded-[3px] border border-white/[0.055] bg-white/[0.02] px-1.5 py-1 text-[8.5px]',
                      meta.className,
                    )}
                  >
                    <Icon className="h-2.5 w-2.5 shrink-0" />
                    <span className="max-w-[160px] truncate">{item.value}</span>
                  </span>
                )
              })}
            </div>
          ) : (
            <p className="px-1 text-[9.5px] italic text-[#555e6b]">
              链接、日期、编号与关键数字会自动收录在这里。
            </p>
          )}
        </section>

        <div className="mt-4 flex items-center justify-between px-1 pb-0.5">
          <span className="font-mono text-[8px] tracking-[0.05em] text-[#4f5864]">
            EXTRACTED FROM LIVE CONTEXT
          </span>
          <span className="font-mono text-[8px] text-[#4f5864]">{keyInfo.length} INFO</span>
        </div>
      </div>

      <TaskDialog
        open={dialogOpen}
        task={editingTask}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) setEditingTask(null)
        }}
        onSave={saveTask}
      />
    </section>
  )
}
