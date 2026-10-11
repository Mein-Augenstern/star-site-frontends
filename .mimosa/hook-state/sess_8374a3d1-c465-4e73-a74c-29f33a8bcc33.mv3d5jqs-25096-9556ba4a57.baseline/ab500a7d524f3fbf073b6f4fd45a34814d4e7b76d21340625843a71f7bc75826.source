import { request } from '@/utils/request'
import type { PageVO } from '@/types/api'

export interface HealthReport {
  id: number
  familyMemberId: number
  reportYear: number
  checkupDate: string | null
  hospital: string
  title: string
  summary: string
  remark: string
  createdAt: string
  fileId: number | null
  indicators?: HealthIndicator[]
}

export interface HealthIndicator {
  id: number
  itemName: string
  itemGroup: string
  valueNum: number | null
  valueText: string | null
  unit: string
  refLow: number | null
  refHigh: number | null
  abnormalFlag: number
  sortNo: number
}

export interface TrendPoint {
  reportYear: number
  reportId: number
  valueNum: number | null
  valueText: string | null
  unit: string
  refLow: number | null
  refHigh: number | null
  abnormalFlag: number
}

export interface InterpretationResult {
  text: string
  interpretedAt: string | null
  cached: boolean
}

export function listReports(params: {
  familyMemberId?: number
  year?: number
  page?: number
  size?: number
}): Promise<PageVO<HealthReport>> {
  return request({ url: '/health/reports', params })
}

export function getReport(id: number): Promise<HealthReport> {
  return request({ url: `/health/reports/${id}` })
}

export function interpretReport(id: number, force = false): Promise<InterpretationResult> {
  return request({ url: `/health/reports/${id}/interpretation`, method: 'POST', data: { force } })
}

export function getTrends(params: {
  familyMemberId: number
  itemName: string
}): Promise<TrendPoint[]> {
  return request({ url: '/health/trends', params })
}

export interface VisitRecord {
  id: number
  familyMemberId: number
  visitDate: string
  hospital: string
  department: string
  diagnosis: string
  medication: string
  cost: number | null
  remark: string
  createdAt: string
}

export function listVisits(params: {
  familyMemberId?: number
  page?: number
  size?: number
}): Promise<PageVO<VisitRecord>> {
  return request({ url: '/health/visits', params })
}

export function createVisit(data: Partial<VisitRecord>): Promise<VisitRecord> {
  return request({ url: '/health/visits', method: 'POST', data })
}

export function deleteVisit(id: number): Promise<void> {
  return request({ url: `/health/visits/${id}`, method: 'DELETE' })
}

export function deleteReport(id: number): Promise<void> {
  return request({ url: `/health/reports/${id}`, method: 'DELETE' })
}

export interface DailyMetric {
  id: number
  familyMemberId: number
  metricDate: string
  metricType: string
  valueNum: number
  remark: string
  createdAt: string
}

export function addMetrics(data: { items: Array<Omit<DailyMetric, 'id' | 'createdAt'>> }): Promise<DailyMetric[]> {
  return request({ url: '/health/metrics', method: 'POST', data })
}

export function listMetrics(params: {
  familyMemberId?: number
  metricType?: string
  page?: number
  size?: number
}): Promise<PageVO<DailyMetric>> {
  return request({ url: '/health/metrics', params })
}

export function deleteMetric(id: number): Promise<void> {
  return request({ url: `/health/metrics/${id}`, method: 'DELETE' })
}

export function createReport(data: {
  familyMemberId: number
  reportYear: number
  checkupDate?: string
  hospital?: string
  title?: string
  summary?: string
  fileId?: number
}): Promise<HealthReport> {
  return request({ url: '/health/reports', method: 'POST', data })
}

export function addIndicators(reportId: number, indicators: Array<{
  itemName: string
  itemGroup?: string
  valueNum?: number
  valueText?: string
  unit?: string
  refLow?: number
  refHigh?: number
}>): Promise<void> {
  return request({ url: `/health/reports/${reportId}/indicators`, method: 'POST', data: { indicators } })
}

export interface OcrDraft {
  title: string | null
  hospital: string | null
  checkupDate: string | null
  reportYear: number
  indicators: Array<{
    itemName: string
    itemGroup: string | null
    valueNum: number | null
    valueText: string | null
    unit: string | null
    refLow: number | null
    refHigh: number | null
  }>
}

export function ocrReport(fileId: number): Promise<OcrDraft> {
  return request({ url: '/health/reports/ocr', method: 'POST', data: { fileId } })
}

export interface PregnancyMilestone { name: string; fromWeek: number; toWeek: number; status: string; tip: string }
export interface PregnancyVO {
  familyMemberId: number
  lmpDate: string
  dueDate: string
  gestationalWeek: number
  gestationalDay: number
  stage: string
  daysToDue: number
  preBmi: number | null
  weightGainAdvice: string | null
  milestones: PregnancyMilestone[]
}

export function getPregnancy(familyMemberId: number): Promise<PregnancyVO | null> {
  return request({ url: '/health/pregnancy', params: { familyMemberId } })
}

export function upsertPregnancy(data: {
  familyMemberId: number
  lmpDate: string
  heightCm?: number
  prePregnancyWeight?: number
}): Promise<PregnancyVO> {
  return request({ url: '/health/pregnancy', method: 'POST', data })
}

export interface MetricTrendPoint { metricDate: string; valueNum: number }

export function metricTrends(params: { familyMemberId: number; metricType: string }): Promise<MetricTrendPoint[]> {
  return request({ url: '/health/metrics/trends', params })
}

export function searchReports(keyword: string): Promise<HealthReport[]> {
  return request({ url: '/health/search', params: { keyword } })
}
