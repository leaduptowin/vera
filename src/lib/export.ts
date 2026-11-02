import type { MeetingSession } from '@/types'
import { extractKeyInfo, KEY_INFO_META } from '@/lib/key-info'
import { formatClock, formatFullDate } from '@/lib/time'
import { safeFileName } from '@/lib/utils'

export function buildSummaryClipboard(session: MeetingSession) {
  const { summary } = session
  const lines = [`# ${session.title}`, '', '## 核心议题']
  if (summary.topics.length) summary.topics.forEach((item) => lines.push(`- ${item.text}`))
  else lines.push('- 暂无')
  lines.push('', '## 关键观点')
  if (summary.points.length) summary.points.forEach((item) => lines.push(`- ${item.text}`))
  else lines.push('- 暂无')

  if (summary.excerpts.length) {
    lines.push('', '## 重点摘录')
    summary.excerpts.forEach((item) => lines.push(`> ${item.text}`))
  }

  lines.push('', '## 待办事项（带责任人、截止时间）')
  if (summary.tasks.length) {
    summary.tasks.forEach((task) =>
      lines.push(
        `- [${task.done ? 'x' : ' '}] ${task.owner}｜${task.what}｜${task.due}`,
      ),
    )
  } else {
    lines.push('- 暂无')
  }

  lines.push('', '## 时间节点 & 关键信息')
  if (summary.timeline.length) {
    summary.timeline.forEach((item) => lines.push(`- ${item.date}｜${item.label}`))
  } else {
    lines.push('- 暂无')
  }
  const keyInfo = extractKeyInfo(session.segments.map((segment) => segment.text), 20)
  if (keyInfo.length) {
    lines.push('', '### 关键信息')
    keyInfo.forEach((item) => lines.push(`- ${KEY_INFO_META[item.type].label}：${item.value}`))
  }
  return lines.join('\n')
}

export function buildMeetingMarkdown(session: MeetingSession) {
  const lines: string[] = [
    `# ${session.title}`,
    '',
    `> 会议时间：${formatFullDate(session.createdAt)} · 时长 ${formatClock(session.durationSec)}`,
    `> 导出时间：${formatFullDate(Date.now())} · Minute 实时会议工作台`,
    '',
    '## 会议原文',
    '',
  ]

  if (session.segments.length === 0) {
    lines.push('_暂无转写内容_')
  } else {
    session.segments.forEach((segment) => {
      const tag = segment.kind === 'note' ? '手动备注' : '语音转写'
      const highlight = segment.highlighted ? ' · 重点' : ''
      lines.push(`**[${formatClock(segment.atSec)}] ${tag}${highlight}**`)
      lines.push('')
      lines.push(segment.text)
      lines.push('')
    })
  }

  lines.push('---', '', '## 结构化摘要', '', '### 核心议题')
  if (session.summary.topics.length) {
    session.summary.topics.forEach((item) => lines.push(`- ${item.text}`))
  } else {
    lines.push('- 暂无')
  }

  lines.push('', '### 关键观点')
  if (session.summary.points.length) {
    session.summary.points.forEach((item) => lines.push(`- ${item.text}`))
  } else {
    lines.push('- 暂无')
  }

  if (session.summary.excerpts.length) {
    lines.push('', '### 重点摘录')
    session.summary.excerpts.forEach((item) => lines.push(`> ${item.text}`))
  }

  lines.push('', '### 待办事项')
  if (session.summary.tasks.length) {
    session.summary.tasks.forEach((task) =>
      lines.push(
        `- [${task.done ? 'x' : ' '}] **${task.owner}**｜${task.what}｜${task.due}`,
      ),
    )
  } else {
    lines.push('- 暂无')
  }

  lines.push('', '### 时间节点 & 关键信息')
  if (session.summary.timeline.length) {
    session.summary.timeline.forEach((item) => lines.push(`- **${item.date}**｜${item.label}`))
  } else {
    lines.push('- 暂无')
  }

  const keyInfo = extractKeyInfo(session.segments.map((segment) => segment.text), 30)
  if (keyInfo.length) {
    lines.push('', '### 自动识别信息')
    keyInfo.forEach((item) => lines.push(`- ${KEY_INFO_META[item.type].label}：${item.value}`))
  }

  return lines.join('\n')
}

function fallbackCopy(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

export async function copyText(text: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // Fall through to the legacy path.
  }
  return fallbackCopy(text)
}

export function downloadMeetingMarkdown(session: MeetingSession) {
  const content = buildMeetingMarkdown(session)
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  const date = new Date(session.createdAt)
  const stamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(
    date.getDate(),
  ).padStart(2, '0')}`
  anchor.href = url
  anchor.download = `${stamp}-${safeFileName(session.title) || 'meeting'}.md`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
