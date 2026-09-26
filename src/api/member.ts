import request from './request'
import type { MemberUpdateDTO, MemberVO } from '@/types/api'

/** 查询个人资料 */
export function getMe(): Promise<MemberVO> {
  return request.get('/member/me')
}

/** 编辑个人资料 */
export function updateMe(data: MemberUpdateDTO): Promise<MemberVO> {
  return request.put('/member/me', data)
}

/** 修改密码 */
export function changePassword(oldPassword: string, newPassword: string): Promise<void> {
  return request.put('/member/me/password', { oldPassword, newPassword })
}
