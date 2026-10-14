import { request } from '@/utils/request'
import type { PageVO } from '@/types/api'

/** ============ health 横向服务（报告/指标数据源，demo2 直调既有 REST） ============ */

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

export function getTrends(params: { familyMemberId: number; itemName: string }): Promise<TrendPoint[]> {
  return request({ url: '/health/trends', params })
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

export function deleteReport(id: number): Promise<void> {
  return request({ url: `/health/reports/${id}`, method: 'DELETE' })
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

/** 拍照 OCR 结构化（只出草稿，人工核对后才落库） */
export function ocrReport(fileId: number): Promise<OcrDraft> {
  return request({ url: '/health/reports/ocr', method: 'POST', data: { fileId } })
}
