import { useEffect, useState } from 'react'
import type { MeetingTask } from '@/types'
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

interface TaskDialogProps {
  open: boolean
  task: MeetingTask | null
  onOpenChange: (open: boolean) => void
  onSave: (input: { owner: string; what: string; due: string }) => void
}

export function TaskDialog({ open, task, onOpenChange, onSave }: TaskDialogProps) {
  const [owner, setOwner] = useState('')
  const [what, setWhat] = useState('')
  const [due, setDue] = useState('')

  useEffect(() => {
    if (!open) return
    setOwner(task?.owner === '待认领' ? '' : (task?.owner ?? ''))
    setWhat(task?.what ?? '')
    setDue(task?.due === '未设截止' ? '' : (task?.due ?? ''))
  }, [open, task])

  const submit = () => {
    const trimmedWhat = what.trim()
    if (!trimmedWhat) return
    onSave({
      owner: owner.trim() || '待认领',
      what: trimmedWhat,
      due: due.trim() || '未设截止',
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{task ? '编辑待办' : '新增待办'}</DialogTitle>
          <DialogDescription>
            手动任务同样会进入 Markdown 导出；自动识别的任务可随会议继续被补充。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-[0.05em] text-[#7d8592]">
              责任人
            </span>
            <Input
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              placeholder="例如 小王 / 产品侧"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-[0.05em] text-[#7d8592]">
              做什么
            </span>
            <Input
              value={what}
              onChange={(event) => setWhat(event.target.value)}
              placeholder="例如 输出埋点方案"
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-[10px] tracking-[0.05em] text-[#7d8592]">
              截止时间
            </span>
            <Input
              value={due}
              onChange={(event) => setDue(event.target.value)}
              placeholder="例如 下周一 / 本周五下班前"
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit()
              }}
            />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button size="sm" onClick={submit} disabled={!what.trim()}>
            {task ? '保存修改' : '添加任务'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
