import type { KeyInfoItem } from '@/types'
import { hashString } from '@/lib/utils'

const URL_SOURCE = String.raw`https?:\/\/[^\s<>"'，。；、）】》]+`
const DATE_SOURCE = String.raw`(?:20\d{2}[年/.-]\d{1,2}[月/.-]\d{1,2}[日号]?|\d{1,2}月\d{1,2}[日号]?|(?:本|下|这)?周[一二三四五六日天](?:下班前|之前|前)?|今天|明天|后天|本月底|月底|下个月|Q[1-4]|(?:上午|下午|晚上)?\d{1,2}[:：]\d{2}(?:\s*[-–~]\s*\d{1,2}[:：]\d{2})?)`
const IDENTIFIER_SOURCE = String.raw`(?:[Vv]\d+(?:\.\d+)+|#\d+|[A-Z]{2,8}-\d{2,})`
const NUMBER_SOURCE = String.raw`\d+(?:\.\d+)?\s*(?:%|％|个百分点|个点|fps|ms|万|w|k|元|人|天|小时|分钟|次|条|版)`

export const KEY_INFO_REGEX = new RegExp(
  `(${URL_SOURCE}|${IDENTIFIER_SOURCE}|${DATE_SOURCE}|${NUMBER_SOURCE})`,
  'gi',
)

export type TokenType = 'link' | 'date' | 'number' | 'identifier'

export interface TextToken {
  text: string
  type?: TokenType
}

function trimTrailingPunctuation(value: string) {
  return value.replace(/[.,;:!?，。；：！？、]+$/g, '')
}

export function classifyToken(value: string): TokenType | undefined {
  if (/^https?:\/\//i.test(value)) return 'link'
  if (
    /^(?:[Vv]\d+(?:\.\d+)+|#\d+|[A-Z]{2,8}-\d{2,})$/i.test(value.trim())
  ) {
    return 'identifier'
  }
  if (
    /(?:年|月|日|号|今天|明天|后天|周[一二三四五六日天]|月底|Q[1-4]|\d[:：]\d)/.test(
      value,
    )
  ) {
    return 'date'
  }
  return 'number'
}

export function tokenizeText(text: string): TextToken[] {
  const tokens: TextToken[] = []
  let cursor = 0
  KEY_INFO_REGEX.lastIndex = 0
  let match = KEY_INFO_REGEX.exec(text)
  while (match) {
    if (match.index > cursor) {
      tokens.push({ text: text.slice(cursor, match.index) })
    }
    const raw = trimTrailingPunctuation(match[0])
    if (raw) {
      tokens.push({ text: raw, type: classifyToken(raw) })
      cursor = match.index + raw.length
    } else {
      cursor = match.index + match[0].length
    }
    KEY_INFO_REGEX.lastIndex = Math.max(KEY_INFO_REGEX.lastIndex, cursor)
    match = KEY_INFO_REGEX.exec(text)
  }
  if (cursor < text.length) tokens.push({ text: text.slice(cursor) })
  return tokens
}

export function extractKeyInfo(texts: string[], limit = 18): KeyInfoItem[] {
  const found = new Map<string, KeyInfoItem>()
  for (const text of texts) {
    KEY_INFO_REGEX.lastIndex = 0
    let match = KEY_INFO_REGEX.exec(text)
    while (match) {
      const value = trimTrailingPunctuation(match[0])
      const type = classifyToken(value)
      if (value && type) {
        const key = `${type}:${value.toLowerCase()}`
        if (!found.has(key)) {
          found.set(key, { key: hashString(key), type, value })
        }
      }
      match = KEY_INFO_REGEX.exec(text)
    }
  }
  return Array.from(found.values()).slice(-limit)
}

export const KEY_INFO_META: Record<
  TokenType,
  { label: string; className: string }
> = {
  link: { label: '链接', className: 'text-[#89a7d4] decoration-[#89a7d4]/40' },
  date: { label: '时间', className: 'text-[#b5a0cf]' },
  number: { label: '数字', className: 'text-[#c9b184]' },
  identifier: { label: '编号', className: 'text-[#8fb7b1]' },
}
