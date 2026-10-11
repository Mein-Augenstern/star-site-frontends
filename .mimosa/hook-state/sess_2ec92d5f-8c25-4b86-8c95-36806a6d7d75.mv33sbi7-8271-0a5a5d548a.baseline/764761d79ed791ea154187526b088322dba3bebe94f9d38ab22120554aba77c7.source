import { request } from '@/utils/request'
import type { FamilyMemberVO, FinanceAccount, FinanceTransaction, OccurrenceVO, PageVO } from '@/types/api'

/** 提醒 */
export function listUpcoming(days = 30): Promise<OccurrenceVO[]> {
  return request({ url: `/reminder/upcoming?days=${days}` })
}

/** 提醒打卡（本次已完成） */
export function doneOccurrence(id: number): Promise<void> {
  return request({ url: `/reminder/occurrences/${id}/done`, method: 'PUT' })
}

/** 提醒忽略（本次跳过，重复提醒不受影响） */
export function dismissOccurrence(id: number): Promise<void> {
  return request({ url: `/reminder/occurrences/${id}/dismiss`, method: 'PUT' })
}

/** 家庭成员列表 */
export function listFamilyMembers(): Promise<FamilyMemberVO[]> {
  return request({ url: '/family/members' })
}

// ==================== 用户自建提醒规则 ====================

export interface UserRuleVO {
  id: number
  familyMemberId: number
  title: string
  firstRemindAt: string
  repeatType: string
  repeatUntil: string | null
  status: number
  pendingCount: number
  createdAt: string
}

export function listUserRules(): Promise<UserRuleVO[]> {
  return request({ url: '/reminder/rules' })
}

export function createUserRule(data: {
  familyMemberId: number
  title: string
  firstRemindAt: string
  repeatType?: string
  repeatUntil?: string
}): Promise<UserRuleVO> {
  return request({ url: '/reminder/rules', method: 'POST', data })
}

export function deleteUserRule(id: number): Promise<void> {
  return request({ url: `/reminder/rules/${id}`, method: 'DELETE' })
}

export interface FamilyMemberUpsert {
  name: string
  relation: string
  gender?: number
  birthDate?: string
  phone?: string
  remark?: string
}

/** 新增家庭成员 */
export function createMember(data: FamilyMemberUpsert): Promise<FamilyMemberVO> {
  return request({ url: '/family/members', method: 'POST', data })
}

/** 编辑家庭成员 */
export function updateMember(id: number, data: FamilyMemberUpsert): Promise<void> {
  return request({ url: `/family/members/${id}`, method: 'PUT', data })
}

/** 删除家庭成员（逻辑删） */
export function deleteMember(id: number): Promise<void> {
  return request({ url: `/family/members/${id}`, method: 'DELETE' })
}

/** 账户 */
export function listAccounts(): Promise<FinanceAccount[]> {
  return request({ url: '/finance/accounts' })
}

/** 记账（1收入 2支出 3转账） */
export function createTransaction(data: {
  direction: number
  accountId: number
  toAccountId?: number
  amount: number
  category?: string
  transTime: string
  remark?: string
}): Promise<FinanceTransaction> {
  return request({ url: '/finance/transactions', method: 'POST', data })
}

/** 流水 */
export function listTransactions(params: {
  accountId?: number
  year?: number
  month?: number
  page?: number
  size?: number
}): Promise<PageVO<FinanceTransaction>> {
  return request({ url: '/finance/transactions', params })
}

/** 净资产 */
export function getBalanceSheet(): Promise<import('@/types/api').BalanceSheet> {
  return request({ url: '/finance/reports/balance-sheet' })
}
