import { request } from '@/utils/request'
import type { LoginVO } from '@/types/api'

export function login(username: string, password: string): Promise<LoginVO> {
  return request({ url: '/auth/login', method: 'POST', data: { username, password } })
}

export function getMyMember(): Promise<import('@/types/api').MemberVO> {
  return request({ url: '/member/me' })
}

export interface IdentityVO {
  id: number
  identityType: string
  identifier: string
  createdAt: string | null
}

/** 微信小程序登录：code 换 token（后端静默注册/登录） */
export function wxLogin(code: string): Promise<LoginVO> {
  return request({ url: '/auth/wx-login', method: 'POST', data: { code } })
}

/** 我的登录方式 */
export function listIdentities(): Promise<IdentityVO[]> {
  return request({ url: '/auth/identities' })
}

export function unbindIdentity(id: number): Promise<void> {
  return request({ url: `/auth/identities/${id}`, method: 'DELETE' })
}

export function completeProfile(data: { nickname?: string; avatar?: string }): Promise<import('@/types/api').MemberVO> {
  return request({ url: '/auth/profile', method: 'PUT', data })
}

export function sendEmailCode(email: string): Promise<void> {
  return request({ url: '/auth/bind/email-code', method: 'POST', data: { email } })
}

export function bindEmail(email: string, code: string): Promise<void> {
  return request({ url: '/auth/bind/email', method: 'POST', data: { email, code } })
}
