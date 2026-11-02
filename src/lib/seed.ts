import type {
  MeetingSession,
  MeetingSummary,
  MeetingTask,
  SummaryEntry,
  TimelineItem,
  TranscriptSegment,
  WorkspaceState,
} from '@/types'
import { hashString, uid } from '@/lib/utils'

export const EMPTY_SUMMARY: MeetingSummary = {
  topics: [],
  points: [],
  excerpts: [],
  tasks: [],
  timeline: [],
  markdown: '',
  updatedAt: null,
}

export function createEmptySummary(): MeetingSummary {
  return {
    topics: [],
    points: [],
    excerpts: [],
    tasks: [],
    timeline: [],
    markdown: '',
    updatedAt: null,
  }
}

export function createMeetingSession(title = defaultSessionTitle()): MeetingSession {
  const now = Date.now()
  return {
    id: uid('meeting'),
    title,
    createdAt: now,
    durationSec: 0,
    segments: [],
    summary: createEmptySummary(),
    dismissedTaskKeys: [],
  }
}

export function defaultSessionTitle() {
  const date = new Date()
  const stamp = new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(date)
    .replace(/\//g, '.')
  return `新会议 · ${stamp}`
}

function entry(section: string, text: string, createdAt: number): SummaryEntry {
  return {
    id: `entry-${hashString(`${section}:${text}`)}`,
    key: hashString(`${section}:${text}`),
    text,
    source: 'seed',
    createdAt,
  }
}

function task(
  owner: string,
  what: string,
  due: string,
  createdAt: number,
  done = false,
): MeetingTask {
  const key = hashString(`task:${owner}｜${what}｜${due}`)
  return {
    id: `task-${key}`,
    sourceKey: key,
    owner,
    what,
    due,
    done,
    auto: true,
    createdAt,
    updatedAt: createdAt,
  }
}

function timeline(date: string, label: string, createdAt: number): TimelineItem {
  return {
    id: `timeline-${hashString(`${date}:${label}`)}`,
    key: hashString(`${date}:${label}`),
    date,
    label,
    createdAt,
  }
}

function summaryMarkdown(input: {
  topics: SummaryEntry[]
  points: SummaryEntry[]
  tasks: MeetingTask[]
  timeline: TimelineItem[]
}) {
  const lines = ['# 会议摘要', '', '## 核心议题']
  input.topics.forEach((item) => lines.push(`- ${item.text}`))
  lines.push('', '## 关键观点')
  input.points.forEach((item) => lines.push(`- ${item.text}`))
  lines.push('', '## 待办事项（带责任人、截止时间）')
  input.tasks.forEach((item) =>
    lines.push(`- [${item.done ? 'x' : ' '}] ${item.owner}｜${item.what}｜${item.due}`),
  )
  lines.push('', '## 时间节点 & 关键信息')
  input.timeline.forEach((item) => lines.push(`- ${item.date}｜${item.label}`))
  return lines.join('\n')
}

function createDemoSession(): MeetingSession {
  const now = Date.now()
  const startedAt = now - 18 * 60_000 - 12_000
  const durationSec = 18 * 60 + 12

  const segments: TranscriptSegment[] = [
    {
      id: uid('seg'),
      kind: 'speech',
      text: '今天主要过一下 V2.3 移动端的体验问题，目标是本周五之前锁定改版范围。',
      createdAt: startedAt + 8_000,
      atSec: 8,
    },
    {
      id: uid('seg'),
      kind: 'speech',
      text: '小林：我这边发现新用户在首页的路径太长，建议把权益入口前置到首屏。',
      createdAt: startedAt + 51_000,
      atSec: 51,
    },
    {
      id: uid('seg'),
      kind: 'speech',
      text: '同意。视觉这边周四下班前补一版首屏对比稿，重点看信息密度和按钮层级。',
      createdAt: startedAt + 2 * 60_000 + 10_000,
      atSec: 130,
    },
    {
      id: uid('seg'),
      kind: 'speech',
      text: '数据上，上周新手引导的完成率只有 41%，比上版掉了 6 个点，这个需要产品侧跟进。',
      createdAt: startedAt + 3 * 60_000 + 40_000,
      atSec: 220,
      highlighted: true,
    },
    {
      id: uid('seg'),
      kind: 'note',
      text: '备注：这次改版必须兼容 iPhone SE，低端机首屏帧率不能低于 50fps。',
      createdAt: startedAt + 5 * 60_000 + 4_000,
      atSec: 304,
    },
    {
      id: uid('seg'),
      kind: 'speech',
      text: '记录一下，小王负责下周一之前输出埋点方案，链接放在 https://notion.so/mobile-v23 。',
      createdAt: startedAt + 7 * 60_000 + 22_000,
      atSec: 442,
    },
    {
      id: uid('seg'),
      kind: 'speech',
      text: '最后确认，下周一一起复盘引导数据，范围锁定后再排开发，不要在低端机上掉帧。',
      createdAt: startedAt + 9 * 60_000 + 5_000,
      atSec: 545,
    },
  ]

  const topics = [
    entry('topic', 'V2.3 移动端体验改版范围', now - 16 * 60_000),
    entry('topic', '新用户首屏路径与引导转化', now - 14 * 60_000),
    entry('topic', '埋点方案与低端机兼容性', now - 8 * 60_000),
  ]
  const points = [
    entry(
      'point',
      '新用户首页路径过长，权益入口需要前置到首屏，降低首次访问的理解成本。',
      now - 14 * 60_000,
    ),
    entry(
      'point',
      '新版新手引导完成率为 41%，较上一版本下降 6 个百分点，需要产品侧定位流失环节。',
      now - 11 * 60_000,
    ),
    entry(
      'point',
      '首屏调整重点看信息密度与按钮层级，同时保证 iPhone SE 等低端机帧率不低于 50fps。',
      now - 8 * 60_000,
    ),
    entry(
      'point',
      '本周先锁定改版范围，埋点方案与数据复盘并行，避免在范围未定时提前进入开发。',
      now - 4 * 60_000,
    ),
  ]
  const tasks = [
    task('视觉', '补一版首屏对比稿，重点看信息密度和按钮层级', '周四下班前', startedAt + 130_000),
    task('产品侧', '跟进新手引导完成率下降问题', '下周一', startedAt + 220_000),
    task('小王', '输出埋点方案', '下周一', startedAt + 442_000),
  ]
  const timelineItems = [
    timeline('本周五', '锁定 V2.3 改版范围', startedAt + 8_000),
    timeline('周四下班前', '首屏对比稿交付', startedAt + 130_000),
    timeline('下周一', '埋点方案 & 引导数据复盘', startedAt + 545_000),
  ]

  return {
    id: uid('demo'),
    title: 'V2.3 移动端体验评审',
    createdAt: startedAt,
    durationSec,
    segments,
    summary: {
      topics,
      points,
      excerpts: [],
      tasks,
      timeline: timelineItems,
      markdown: summaryMarkdown({ topics, points, tasks, timeline: timelineItems }),
      updatedAt: now - 4 * 60_000,
    },
    dismissedTaskKeys: [],
    isDemo: true,
  }
}

export function createSeedWorkspace(): WorkspaceState {
  const demo = createDemoSession()
  return {
    version: 1,
    sessions: [demo],
    activeSessionId: demo.id,
    sensitivity: 68,
  }
}

export function normalizeWorkspace(value: unknown): WorkspaceState {
  if (!value || typeof value !== 'object') return createSeedWorkspace()
  const candidate = value as Partial<WorkspaceState>
  if (!Array.isArray(candidate.sessions) || candidate.sessions.length === 0) {
    return createSeedWorkspace()
  }

  const sessions = candidate.sessions
    .filter((session): session is MeetingSession => Boolean(session && session.id))
    .map((session) => ({
      ...session,
      segments: Array.isArray(session.segments) ? session.segments : [],
      dismissedTaskKeys: Array.isArray(session.dismissedTaskKeys)
        ? session.dismissedTaskKeys
        : [],
      durationSec: Number.isFinite(session.durationSec) ? session.durationSec : 0,
      summary: {
        ...EMPTY_SUMMARY,
        ...(session.summary ?? {}),
        topics: session.summary?.topics ?? [],
        points: session.summary?.points ?? [],
        excerpts: session.summary?.excerpts ?? [],
        tasks: session.summary?.tasks ?? [],
        timeline: session.summary?.timeline ?? [],
        markdown: session.summary?.markdown ?? '',
      },
    }))

  if (sessions.length === 0) return createSeedWorkspace()
  const activeSessionId = sessions.some((item) => item.id === candidate.activeSessionId)
    ? (candidate.activeSessionId as string)
    : sessions[0].id

  return {
    version: 1,
    sessions,
    activeSessionId,
    sensitivity: Math.min(
      100,
      Math.max(0, Number.isFinite(candidate.sensitivity) ? (candidate.sensitivity as number) : 68),
    ),
  }
}
