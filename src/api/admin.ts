import request from './request'

export interface AsyncCommand {
  id: number
  cmdType: string
  bizKey: string
  payload: string | null
  status: 'PENDING' | 'RUNNING' | 'SUCCESS' | 'DEAD'
  maxRetry: number
  retryCount: number
  nextRunAt: string
  lastError: string | null
  owner: string
  createdAt: string
  updatedAt: string
}

export interface AsyncSummary {
  pending: number
  running: number
  success: number
  dead: number
  backlogDue: number
  byType: Record<string, number>
}

export function asyncSummary(): Promise<AsyncSummary> {
  return request({ url: '/admin/async/summary' })
}

export function asyncList(params: {
  status?: string
  cmdType?: string
  page?: number
  size?: number
}): Promise<{ records: AsyncCommand[]; total: number; page: number; size: number }> {
  return request({ url: '/admin/async/list', params })
}

export function asyncRetry(id: number): Promise<void> {
  return request({ url: `/admin/async/${id}/retry`, method: 'POST' })
}

export function asyncReclaim(id: number): Promise<void> {
  return request({ url: `/admin/async/${id}/reclaim`, method: 'POST' })
}

export function asyncKill(id: number): Promise<void> {
  return request({ url: `/admin/async/${id}/kill`, method: 'POST' })
}
