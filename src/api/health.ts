import request from './request'
import type { HealthReport, IndicatorDTO, PageVO, TrendPoint } from '@/types/api'

/** 上传报告元数据 */
export function createReport(data: {
  familyMemberId: number
  reportYear: number
  checkupDate?: string | null
  hospital?: string
  title?: string
  summary?: string
  fileId?: number | null
  remark?: string
}): Promise<HealthReport> {
  return request.post('/health/reports', data)
}

/** 报告分页列表 */
export function listReports(params: {
  familyMemberId?: number
  year?: number
  page?: number
  size?: number
}): Promise<PageVO<HealthReport>> {
  return request.get('/health/reports', { params })
}

/** 报告详情（含指标） */
export function getReport(id: number): Promise<HealthReport> {
  return request.get(`/health/reports/${id}`)
}

/** 批量录入指标（覆盖式） */
export function saveIndicators(id: number, indicators: IndicatorDTO[]): Promise<void> {
  return request.post(`/health/reports/${id}/indicators`, { indicators })
}

/** 删除报告 */
export function deleteReport(id: number): Promise<void> {
  return request.delete(`/health/reports/${id}`)
}

/** 历年趋势 */
export function trends(familyMemberId: number, itemName: string): Promise<TrendPoint[]> {
  return request.get('/health/trends', { params: { familyMemberId, itemName } })
}

/** 关键词搜索 */
export function searchReports(keyword: string, familyMemberId?: number): Promise<HealthReport[]> {
  return request.get('/health/search', { params: { keyword, familyMemberId } })
}
