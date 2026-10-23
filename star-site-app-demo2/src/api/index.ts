import { request } from '@/utils/request'
import { getMyMember } from '@/api/auth'
import type { FamilyMemberVO, OccurrenceVO } from '@/types/api'

/** 家庭成员列表 */
export function listFamilyMembers(): Promise<FamilyMemberVO[]> {
  return request({ url: '/family/members' })
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

/** 未来 N 天要办的事（每日监测打卡 / 复查提醒的到期实例都落在这里） */
export function listUpcoming(days = 30): Promise<OccurrenceVO[]> {
  return request({ url: `/reminder/upcoming?days=${days}` })
}

/** 提醒打卡（本次已完成） */
export function doneOccurrence(id: number): Promise<void> {
  return request({ url: `/reminder/occurrences/${id}/done`, method: 'PUT' })
}

/** 提醒忽略（本次跳过） */
export function dismissOccurrence(id: number): Promise<void> {
  return request({ url: `/reminder/occurrences/${id}/dismiss`, method: 'PUT' })
}

/** 我的资料（先缓存渲染再刷新回写） */
export function refreshMemberCache(): Promise<import('@/types/api').MemberVO> {
  return getMyMember().then((m) => {
    uni.setStorageSync('star_site_d2_member', JSON.stringify(m))
    return m
  })
}

export function cachedMember(): import('@/types/api').MemberVO | null {
  const raw = uni.getStorageSync('star_site_d2_member')
  return raw ? JSON.parse(raw) : null
}
