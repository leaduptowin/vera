import type { MeetingSession, MeetingSummary, ParsedSummary } from '@/types'
import { hashString } from '@/lib/utils'

type Section = 'topics' | 'points' | 'tasks' | 'timeline' | null

function cleanInline(value: string) {
  return value
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s*/, '')
    .trim()
}

function sectionFromHeading(heading: string): Section {
  if (heading.includes('核心议题')) return 'topics'
  if (heading.includes('关键观点')) return 'points'
  if (heading.includes('待办')) return 'tasks'
  if (heading.includes('时间节点')) return 'timeline'
  return null
}

/**
 * Parses the fixed four-section Markdown contract from the LLM.
 * During SSE streaming the last (possibly incomplete) line is intentionally ignored,
 * so a bullet only hits the UI once its full line has arrived.
 */
export function parseSummaryMarkdown(markdown: string): ParsedSummary {
  const result: ParsedSummary = { topics: [], points: [], tasks: [], timeline: [] }
  const lines = markdown.split('\n')
  let section: Section = null

  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index]
    const isLast = index === lines.length - 1
    if (isLast && rawLine.trim().length > 0) continue

    const line = rawLine.trim()
    if (line.startsWith('## ')) {
      section = sectionFromHeading(cleanInline(line.slice(3)))
      continue
    }
    if (!section || !/^[-*]\s+/.test(line)) continue

    let content = cleanInline(line.replace(/^[-*]\s+/, ''))
    if (!content) continue

    if (section === 'tasks') {
      content = content.replace(/^\[[ xX]\]\s*/, '')
      const parts = content.split(/[｜|]/).map((part) => part.trim())
      const owner = parts[0] || '待认领'
      const what = parts[1] || parts[0] || content
      const due = parts[2] || '未设截止'
      if (!what) continue
      result.tasks.push({
        owner,
        what,
        due,
        key: hashString(`task:${owner}｜${what}｜${due}`),
      })
      continue
    }

    if (section === 'timeline') {
      const parts = content.split(/[｜|]/).map((part) => part.trim())
      let date = parts[0] || ''
      let label = parts.slice(1).join(' · ') || parts[0] || ''
      if (parts.length === 1) {
        const dateMatch = content.match(
          /(\d{1,2}月\d{1,2}[日号]?|(?:本|下|这)?周[一二三四五六日天]|今天|明天|后天|月底|Q[1-4]|\d{1,2}[:：]\d{2})/,
        )
        date = dateMatch?.[1] ?? '待定'
        label = content
      }
      if (!label) continue
      result.timeline.push({
        date,
        label,
        key: hashString(`timeline:${date}｜${label}`),
      })
      continue
    }

    if (section === 'topics') {
      result.topics.push({ text: content, key: hashString(`topic:${content}`) })
    } else {
      result.points.push({ text: content, key: hashString(`point:${content}`) })
    }
  }

  return result
}

/** Full structured summary → Markdown. Used as the LLM's "existing summary" context. */
export function serializeSummaryMarkdown(summary: MeetingSummary) {
  const lines = ['# 会议摘要', '', '## 核心议题']
  summary.topics.forEach((item) => lines.push(`- ${item.text}`))
  lines.push('', '## 关键观点')
  summary.points.forEach((item) => lines.push(`- ${item.text}`))
  if (summary.excerpts.length) {
    lines.push('', '## 重点摘录')
    summary.excerpts.forEach((item) => lines.push(`> ${item.text}`))
  }
  lines.push('', '## 待办事项（带责任人、截止时间）')
  summary.tasks.forEach((item) =>
    lines.push(`- [${item.done ? 'x' : ' '}] ${item.owner}｜${item.what}｜${item.due}`),
  )
  lines.push('', '## 时间节点 & 关键信息')
  summary.timeline.forEach((item) => lines.push(`- ${item.date}｜${item.label}`))
  lines.push('')
  return lines.join('\n')
}

/**
 * Line-level merge: the SSE stream can replay the cumulative Markdown, but only
 * genuinely new bullets are appended to the persisted state. Existing checkboxes,
 * edits and highlighted excerpts are never overwritten by the next model pass.
 */
export function mergeStreamedSummary(
  session: MeetingSession,
  markdown: string,
  parsed: ParsedSummary,
): MeetingSession {
  const now = Date.now()
  const existingTopicKeys = new Set(session.summary.topics.map((item) => item.key))
  const existingPointKeys = new Set(session.summary.points.map((item) => item.key))
  const existingTimelineKeys = new Set(session.summary.timeline.map((item) => item.key))
  const existingTaskKeys = new Set(
    session.summary.tasks.map((item) => item.sourceKey),
  )
  const dismissed = new Set(session.dismissedTaskKeys)

  let changed = false

  const topics = [...session.summary.topics]
  parsed.topics.forEach((item) => {
    if (existingTopicKeys.has(item.key)) return
    existingTopicKeys.add(item.key)
    topics.push({
      id: `entry-${item.key}`,
      key: item.key,
      text: item.text,
      source: 'ai',
      createdAt: now,
    })
    changed = true
  })

  const points = [...session.summary.points]
  parsed.points.forEach((item) => {
    if (existingPointKeys.has(item.key)) return
    existingPointKeys.add(item.key)
    points.push({
      id: `entry-${item.key}`,
      key: item.key,
      text: item.text,
      source: 'ai',
      createdAt: now,
    })
    changed = true
  })

  const tasks = [...session.summary.tasks]
  parsed.tasks.forEach((item) => {
    if (existingTaskKeys.has(item.key) || dismissed.has(item.key)) return
    existingTaskKeys.add(item.key)
    tasks.push({
      id: `task-${item.key}`,
      sourceKey: item.key,
      owner: item.owner,
      what: item.what,
      due: item.due,
      done: false,
      auto: true,
      createdAt: now,
      updatedAt: now,
    })
    changed = true
  })

  const timeline = [...session.summary.timeline]
  parsed.timeline.forEach((item) => {
    if (existingTimelineKeys.has(item.key)) return
    existingTimelineKeys.add(item.key)
    timeline.push({
      id: `timeline-${item.key}`,
      key: item.key,
      date: item.date,
      label: item.label,
      createdAt: now,
    })
    changed = true
  })

  if (!changed) return session

  return {
    ...session,
    summary: {
      ...session.summary,
      topics,
      points,
      tasks,
      timeline,
      markdown,
      updatedAt: now,
    },
  }
}
