export type SegmentKind = 'speech' | 'note'

export interface TranscriptSegment {
  id: string
  kind: SegmentKind
  text: string
  createdAt: number
  /** Seconds since the meeting timer started. */
  atSec: number
  highlighted?: boolean
}

export type SummarySource = 'ai' | 'excerpt' | 'seed'

export interface SummaryEntry {
  id: string
  key: string
  text: string
  source: SummarySource
  createdAt: number
}

export interface MeetingTask {
  id: string
  sourceKey: string
  owner: string
  what: string
  due: string
  done: boolean
  auto: boolean
  createdAt: number
  updatedAt: number
}

export interface TimelineItem {
  id: string
  key: string
  date: string
  label: string
  createdAt: number
}

export interface MeetingSummary {
  topics: SummaryEntry[]
  points: SummaryEntry[]
  excerpts: SummaryEntry[]
  tasks: MeetingTask[]
  timeline: TimelineItem[]
  markdown: string
  updatedAt: number | null
}

export interface MeetingSession {
  id: string
  title: string
  createdAt: number
  /** Accumulated seconds, persisted locally. */
  durationSec: number
  segments: TranscriptSegment[]
  summary: MeetingSummary
  dismissedTaskKeys: string[]
  isDemo?: boolean
}

export interface WorkspaceState {
  version: 1
  sessions: MeetingSession[]
  activeSessionId: string
  sensitivity: number
}

export interface ParsedSummary {
  topics: { text: string; key: string }[]
  points: { text: string; key: string }[]
  tasks: { owner: string; what: string; due: string; key: string }[]
  timeline: { date: string; label: string; key: string }[]
}

export interface SegmentSelectionPart {
  id: string
  start: number
  end: number
}

export type SpeechStatus =
  | 'idle'
  | 'requesting'
  | 'listening'
  | 'paused'
  | 'denied'
  | 'unsupported'
  | 'error'

export interface KeyInfoItem {
  key: string
  type: 'link' | 'date' | 'number' | 'identifier'
  value: string
}
