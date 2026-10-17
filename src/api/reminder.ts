import request from './request'
import type { NotificationVO, OccurrenceVO } from '@/types/api'

/** 未来 N 天要办的事 */
export function listUpcoming(days = 30): Promise<OccurrenceVO[]> {
  return request.get('/reminder/upcoming', { params: { days } })
}

/** 未读通知数（铃铛角标） */
export function getUnreadCount(): Promise<number> {
  return request.get('/reminder/notifications/unread-count')
}

/** 通知列表 */
export function listNotifications(params: { page?: number; size?: number }): Promise<NotificationVO[]> {
  return request.get('/reminder/notifications', { params })
}

/** 标记通知已读 */
export function markRead(id: number): Promise<void> {
  return request.put(`/reminder/notifications/${id}/read`)
}

/** 实例完成 */
export function completeOccurrence(id: number): Promise<void> {
  return request.put(`/reminder/occurrences/${id}/done`)
}

/** 实例忽略 */
export function dismissOccurrence(id: number): Promise<void> {
  return request.put(`/reminder/occurrences/${id}/dismiss`)
}
