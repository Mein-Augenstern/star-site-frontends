import request from './request'
import type { Family, FamilyMember, FamilyMemberDTO } from '@/types/api'

/** 创建家庭 */
export function createFamily(name: string, remark?: string): Promise<Family> {
  return request.post('/family', { name, remark })
}

/** 我的家庭（没有则为 null） */
export function getMyFamily(): Promise<Family | null> {
  return request.get('/family/mine')
}

/** 添加成员档案 */
export function addMember(data: FamilyMemberDTO): Promise<FamilyMember> {
  return request.post('/family/members', data)
}

/** 成员列表 */
export function listMembers(): Promise<FamilyMember[]> {
  return request.get('/family/members')
}

/** 编辑成员档案 */
export function updateMember(id: number, data: FamilyMemberDTO): Promise<FamilyMember> {
  return request.put(`/family/members/${id}`, data)
}

/** 删除成员档案 */
export function deleteMember(id: number): Promise<void> {
  return request.delete(`/family/members/${id}`)
}
