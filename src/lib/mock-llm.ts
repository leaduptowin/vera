import type { MeetingSession, TranscriptSegment } from '@/types'
import { hashString, stripSpeakerPrefix } from '@/lib/utils'

interface Sentence {
  text: string
  clean: string
  speaker: string
  kind: TranscriptSegment['kind']
  index: number
}

// Broad cue set used only for ranking an existing sentence as a key point.
const TASK_CUES =
  /负责|跟进|完成|输出|提交|整理|对接|确认|推进|落地|补一|评审|排期|迁移|修复|产出|准备|发给|同步给|安排|拉齐|复盘|需要|要做|记得/
const STRONG_TASK_CUES =
  /负责|跟进|输出|提交|整理|对接|确认|推进|落地|补一|评审|排期|迁移|修复|产出|准备|发给|同步给|安排|拉齐|复盘|完成/
const WEAK_TASK_CUES = /需要|要做|记得|必须|上线|更新/
const INSIGHT_CUES =
  /建议|认为|发现|问题|风险|关键|原因|因为|数据|完成率|下降|增长|提升|决定|结论|同意|目标|重点|优先|验证|假设|方案/

const TOPIC_GROUPS: { test: RegExp; label: string }[] = [
  { test: /登录|注册|账号/, label: '登录流程' },
  { test: /首页|首屏/, label: '首屏体验' },
  { test: /权益|入口/, label: '入口转化' },
  { test: /新手|引导/, label: '新手引导' },
  { test: /交互稿|交互/, label: '交互方案' },
  { test: /视觉|设计/, label: '设计协同' },
  { test: /开发|前端|后端|接口/, label: '开发协同' },
  { test: /测试|回归/, label: '回归测试' },
  { test: /通过率|转化率|完成率|留存率/, label: '转化指标' },
  { test: /埋点|数据/, label: '数据埋点' },
  { test: /上线|发布|排期/, label: '上线排期' },
  { test: /性能|兼容|低端机|帧率/, label: '性能兼容' },
  { test: /预算|成本/, label: '成本预算' },
  { test: /合同|客户/, label: '客户事项' },
  { test: /需求|范围/, label: '需求范围' },
  { test: /复盘/, label: '复盘计划' },
  { test: /权限/, label: '权限设计' },
]
const DUE_REGEX =
  /((?:20\d{2}年)?(?:\d{1,2}月)?\d{1,2}[日号]|(?:本|下|这)?周[一二三四五六日天](?:下班前|之前|以前|前)?|今天|明天|后天|大后天|本月底|月底|下个月|Q[1-4]|(?:上午|下午|晚上)?\d{1,2}[:：]\d{2}(?:\s*[-–~]\s*\d{1,2}[:：]\d{2})?)/g

const OWNER_ROLES = [
  '用户研究',
  '产品侧',
  '设计侧',
  '技术侧',
  '客户端',
  '服务端',
  '前端',
  '后端',
  '视觉',
  '设计',
  '产品',
  '测试',
  '运营',
  '数据',
  '市场',
  '法务',
  '财务',
  '研发',
]
const OWNER_NAMES = ['小王', '小李', '小林', '小张', '小陈', '小周', '小赵', '老张', '老王']
const ROLE_CONTEXT_REGEX = new RegExp(
  `(${[...OWNER_ROLES].sort((a, b) => b.length - a.length).join('|')})(?:同学|团队|小组|组|侧)?[^，。；,]{0,8}(?=负责|跟进|完成|输出|提交|整理|对接|确认|推进|安排|需要|同步|发给|复盘|补一|配合|处理)`,
)

function limitText(text: string, max: number) {
  const clean = text.replace(/\s+/g, ' ').trim()
  if (clean.length <= max) return clean
  const head = clean.slice(0, max)
  const lastBreak = Math.max(
    head.lastIndexOf('，'),
    head.lastIndexOf('；'),
    head.lastIndexOf('。'),
    head.lastIndexOf(' '),
  )
  return `${(lastBreak > max * 0.55 ? head.slice(0, lastBreak) : head).replace(/[，,；;。]$/, '')}…`
}

function splitIntoSentences(segment: TranscriptSegment, index: number): Sentence[] {
  const pieces =
    segment.text
      .replace(/\s+/g, ' ')
      .match(/[^。！？!?；;\n]+[。！？!?；;]?/g)
      ?.map((item) => item.trim()) ?? []
  return pieces
    .filter((item) => item.length >= 4)
    .map((text) => {
      const speakerMatch = text.match(/^([\u4e00-\u9fa5A-Za-z0-9_\- ]{1,10})[：:]\s*/)
      const speaker = speakerMatch?.[1]?.trim() ?? ''
      const clean = stripSpeakerPrefix(text)
        .replace(/^备注[：:]\s*/, '')
        .replace(/^记录一下[，,]\s*/, '')
        .replace(/^最后确认[，,]\s*/, '')
        .trim()
      return { text, clean, speaker, kind: segment.kind, index }
    })
}

function stripNarrativePrefix(text: string) {
  return text
    .replace(/^(今天|这次|本次|我们)(主要|重点)?(讨论|聊|过一下|聊一下|同步一下|对齐一下)?[，,]?/, '')
    .replace(/^[，,。\s]+/, '')
    .replace(/[。；;]$/, '')
    .trim()
}

function buildTopicCandidates(sentences: Sentence[], title: string, cap: number) {
  const topics: string[] = []
  const push = (value: string) => {
    const normalized = limitText(stripNarrativePrefix(value), 28).replace(/^[，,]\s*/, '')
    if (normalized.length >= 3 && !topics.includes(normalized)) topics.push(normalized)
  }

  if (!/^(新会议|未命名)/.test(title)) push(title)

  // Prefer explicit topic language: "主要讨论 / 围绕 / 对齐…".
  const cued = new Set<number>()
  sentences.forEach((sentence) => {
    const match = sentence.clean.match(
      /(?:主要|重点)?(?:讨论|聊|过一下|围绕|聚焦)(?:一下)?([^，。；,]{2,22})/,
    )
    if (match?.[1]) {
      push(match[1])
      cued.add(sentence.index)
    }
  })

  // Then derive compact themes from domain terms without repeating whole sentences.
  sentences.forEach((sentence) => {
    if (cued.has(sentence.index)) return
    const labels = TOPIC_GROUPS.filter((group) => group.test.test(sentence.clean))
      .map((group) => group.label)
      .filter((label, index, list) => list.indexOf(label) === index)
    if (labels.length >= 2) push(labels.slice(0, 2).join(' · '))
    else if (labels.length === 1) push(labels[0])
  })

  if (topics.length === 0) {
    const first = sentences.find((sentence) => sentence.clean.length >= 8)
    if (first) push(limitText(first.clean, 24))
  }

  return topics.slice(0, cap)
}

function scorePoint(sentence: Sentence) {
  let score = 0
  if (INSIGHT_CUES.test(sentence.clean)) score += 3
  if (/\d/.test(sentence.clean)) score += 2
  if (sentence.clean.length >= 18) score += 1
  if (sentence.kind === 'note') score += 1
  if (TASK_CUES.test(sentence.clean)) score += 1
  return score
}

function buildPoints(sentences: Sentence[], cap: number) {
  const candidates = sentences.filter((sentence) => sentence.clean.length >= 8)

  const selected = [...candidates]
    .sort((a, b) => scorePoint(b) - scorePoint(a) || a.index - b.index)
    .slice(0, cap)
    .sort((a, b) => a.index - b.index)

  const seen = new Set<string>()
  return selected
    .map((sentence) => limitText(stripNarrativePrefix(sentence.clean), 82))
    .filter((text) => {
      const key = text.replace(/\s/g, '')
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function expandRole(clean: string, base: string) {
  const index = clean.indexOf(base)
  if (index < 0) return base
  const suffix = clean.slice(index + base.length).match(/^(同学|团队|小组|组)/)?.[1]
  if (suffix && !base.endsWith('侧')) return `${base}${suffix}`
  return base
}

function findOwner(sentence: Sentence) {
  if (/^我(来|去|负责|会|需要|这边)/.test(sentence.clean)) return '我'

  // "小王负责…" / "测试同学完成…" — nearest explicit actor before the action.
  const explicit = sentence.clean.match(
    /([\u4e00-\u9fa5]{2,3}(?:同学|侧|团队|组)?)(?=负责|跟进|完成|输出|提交|整理|对接|确认|推进|安排|补一|发给)/,
  )
  if (explicit?.[1] && !/周|月|日|号|今天|明天|后天|上午|下午|晚上|本|下|这/.test(explicit[1])) {
    return explicit[1]
  }

  // A named person anywhere in the sentence beats a department word such as
  // "测试" inside "测试报告".
  const name = OWNER_NAMES.find((word) => sentence.clean.includes(word))
  if (name) return name

  const roleMatch = sentence.clean.match(ROLE_CONTEXT_REGEX)
  if (roleMatch?.[1]) return expandRole(sentence.clean, roleMatch[1])

  const startRole = OWNER_ROLES.find((word) => sentence.clean.startsWith(word))
  if (startRole) return expandRole(sentence.clean, startRole)

  if (sentence.speaker && !/^(记录|备注|主持人|所有人)$/.test(sentence.speaker)) {
    return sentence.speaker
  }
  return '待认领'
}

function findDue(text: string) {
  DUE_REGEX.lastIndex = 0
  const matches = Array.from(text.matchAll(DUE_REGEX))
  if (matches.length === 0) return ''
  const value = matches[matches.length - 1][0].trim()
  return value
}

function cleanTaskWhat(sentence: Sentence, owner: string, due: string) {
  let what = sentence.clean
    .replace(/^(请|麻烦|记得|需要|要|我们|大家|后续)\s*/, '')

  if (owner !== '待认领') {
    const ownerPattern = new RegExp(`^${owner.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    what = what.replace(ownerPattern, '').replace(owner, '')
  }

  what = what
    .replace(/^(负责|来|去|会|需要|跟进|安排)\s*/, '')
    .replace(/^[，,、。\s]+/, '')

  if (due) what = what.split(due).join('')

  what = what
    .replace(/[，,；;：:]\s*$/, '')
    .replace(/^[，,、。\s]+/, '')
    .trim()

  return limitText(what || sentence.clean, 60)
}

function buildTasks(sentences: Sentence[], cap: number) {
  const tasks: { owner: string; what: string; due: string; key: string }[] = []
  const seen = new Set<string>()

  for (const sentence of sentences) {
    if (sentence.clean.length < 8) continue
    const owner = findOwner(sentence)
    const due = findDue(sentence.clean)
    const strong = STRONG_TASK_CUES.test(sentence.clean)
    const weak = WEAK_TASK_CUES.test(sentence.clean)
    if (!strong && !weak) continue
    if (!strong && owner === '待认领') continue
    if (owner === '待认领' && !due) continue

    const what = cleanTaskWhat(sentence, owner, due)
    if (what.length < 3) continue
    const key = hashString(`task:${owner}｜${what}｜${due || '未设截止'}`)
    if (seen.has(key)) continue
    seen.add(key)
    tasks.push({ owner, what, due: due || '未设截止', key })
    if (tasks.length >= cap) break
  }

  return tasks
}

function buildTimeline(sentences: Sentence[], cap: number) {
  const items: { date: string; label: string; key: string }[] = []
  const seen = new Set<string>()

  for (const sentence of sentences) {
    const date = findDue(sentence.clean)
    if (!date) continue

    const label = limitText(
      stripNarrativePrefix(sentence.clean)
        .replace(date, '')
        .replace(/^[，,、。\s]+/, '')
        .replace(/[。；;]$/, ''),
      58,
    )
    if (label.length < 3) continue
    const key = hashString(`timeline:${date}｜${label}`)
    if (seen.has(key)) continue
    seen.add(key)
    items.push({ date, label, key })
    if (items.length >= cap) break
  }

  return items
}

export function buildSummaryMarkdown(input: {
  title: string
  segments: TranscriptSegment[]
  sensitivity: number
}) {
  const t = Math.min(1, Math.max(0, input.sensitivity / 100))
  const sentences = input.segments.flatMap(splitIntoSentences)
  const topicCap = Math.round(2 + t * 2)
  const topicCandidates = buildTopicCandidates(sentences, input.title, topicCap)
  const pointCap = Math.round(3 + t * 4)
  const taskCap = Math.round(2 + t * 3)
  const timelineCap = Math.round(2 + t * 3)

  const points = buildPoints(sentences, pointCap)
  const tasks = buildTasks(sentences, taskCap)
  const timeline = buildTimeline(sentences, timelineCap)

  const lines: string[] = ['# 会议摘要', '', '## 核心议题']
  topicCandidates.forEach((topic) => lines.push(`- ${topic}`))
  lines.push('', '## 关键观点')
  points.forEach((point) => lines.push(`- ${point}`))
  lines.push('', '## 待办事项（带责任人、截止时间）')
  tasks.forEach((item) => lines.push(`- [ ] ${item.owner}｜${item.what}｜${item.due}`))
  lines.push('', '## 时间节点 & 关键信息')
  timeline.forEach((item) => lines.push(`- ${item.date}｜${item.label}`))
  lines.push('')
  return lines.join('\n')
}

/**
 * Builds the real prompt that is sent alongside the sliding transcript window.
 * Replace the mock transport below with a real SSE endpoint without changing the
 * rest of the application. The response contract is the fixed four-section Markdown.
 */
export function buildSummaryPrompt(input: {
  title: string
  previousMarkdown: string
  recentWindow: string
  freshWindow: string
  sensitivity: number
}) {
  return [
    '你是一个会议纪要提炼引擎。请基于「新增转写」更新已有摘要，只输出固定结构 Markdown。',
    '固定结构：',
    '# 会议摘要',
    '## 核心议题',
    '## 关键观点',
    '## 待办事项（带责任人、截止时间）',
    '## 时间节点 & 关键信息',
    '',
    '规则：任务行使用 "- [ ] 责任人｜做什么｜截止时间"；不要编造未出现的信息；保留已有正确结论。',
    `提炼灵敏度：${input.sensitivity}/100（越高越细碎，越低越凝练）。`,
    '',
    `会议标题：${input.title}`,
    '',
    '已有摘要：',
    input.previousMarkdown || '（无，这是第一次提炼）',
    '',
    '最近上下文：',
    input.recentWindow,
    '',
    '本次新增转写：',
    input.freshWindow,
  ].join('\n')
}

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })
}

export interface SummarySSERequest {
  session: MeetingSession
  sensitivity: number
  prompt: string
  signal: AbortSignal
}

/**
 * MOCK SSE TRANSPORT.
 *
 * Real integration: replace this generator body with:
 *
 *   const response = await fetch('/api/summary/stream', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ prompt }),
 *     signal,
 *   })
 *   const reader = response.body!.getReader()
 *   const decoder = new TextDecoder()
 *   let buffer = ''
 *   while (true) {
 *     const { done, value } = await reader.read()
 *     if (done) break
 *     buffer += decoder.decode(value, { stream: true })
 *     const events = buffer.split('\n\n')
 *     buffer = events.pop() ?? ''
 *     for (const event of events) {
 *       const data = event.split('\n').find((line) => line.startsWith('data:'))
 *       if (!data) continue
 *       const payload = JSON.parse(data.slice(5).trim())
 *       if (payload.delta) yield payload.delta
 *     }
 *   }
 *
 * Keep the yielded value as a Markdown delta. Nothing else in the UI needs to change.
 */
export async function* mockSummarySSE({
  session,
  sensitivity,
  signal,
}: SummarySSERequest): AsyncGenerator<string> {
  const thinking = Math.max(140, 520 - sensitivity * 3)
  await sleep(thinking, signal)

  const markdown = buildSummaryMarkdown({
    title: session.title,
    segments: session.segments,
    sensitivity,
  })

  // Stream in uneven chunks, like a real token stream. Chunk sizes stay small so
  // new Markdown lines surface one at a time rather than arriving as a single block.
  let cursor = 0
  let tick = 0
  while (cursor < markdown.length) {
    if (signal.aborted) return
    const size = 4 + ((tick * 7) % 12)
    yield markdown.slice(cursor, cursor + size)
    cursor += size
    tick += 1
    await sleep(14 + ((tick * 5) % 18), signal)
  }
}
