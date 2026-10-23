import { request } from '@/utils/request'

/** ============ recheck 垂直服务（复查闭环编排，本产品核心新能力） ============ */

export interface RecheckPlan {
  id: number
  familyMemberId: number
  memberName: string | null
  itemName: string
  baselineText: string | null
  refRange: string
  unit: string | null
  targetDate: string
  daysLeft: number | null
  status: number
  statusText: string
  metricType: string | null
  sourceReportId: number
  sourceReportTitle: string | null
  closedReportId: number | null
  closedReportTitle: string | null
  conclusion: string | null
  createdAt: string
}

/** 从报告指标创建复查计划（同时注册复查日提醒 + 可选每日监测规则） */
export function createRecheckPlan(data: {
  familyMemberId: number
  reportId: number
  indicatorId: number
  targetDate?: string
  metricType?: string
}): Promise<RecheckPlan> {
  return request({ url: '/recheck/plans', method: 'POST', data })
}

/** 复查计划状态（与后端 RecheckPlan.STATUS_* 对齐） */
export const PLAN_STATUS = {
  /** 进行中 */
  ACTIVE: 1,
  /** 已闭环 */
  CLOSED: 2,
  /** 已取消 */
  CANCELLED: 3,
} as const

/** 计划列表（全家范围或指定成员；status 见 PLAN_STATUS） */
export function listRecheckPlans(params: {
  familyMemberId?: number
  status?: number
}): Promise<RecheckPlan[]> {
  return request({ url: '/recheck/plans', params })
}

/** 闭环：关联复查新报告，按指标名对齐基线生成对比结论 */
export function closeRecheckPlan(planId: number, reportId: number): Promise<RecheckPlan> {
  return request({ url: `/recheck/plans/${planId}/close`, method: 'POST', data: { reportId } })
}

/** 取消计划（撤销提醒/监测规则） */
export function cancelRecheckPlan(planId: number): Promise<void> {
  return request({ url: `/recheck/plans/${planId}/cancel`, method: 'POST' })
}
