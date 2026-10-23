import { request } from '@/utils/request'
import type { LoginVO, MemberVO } from '@/types/api'

export function login(username: string, password: string): Promise<LoginVO> {
  return request({ url: '/auth/login', method: 'POST', data: { username, password } })
}

export function getMyMember(): Promise<MemberVO> {
  return request({ url: '/member/me' })
}

/** 微信小程序登录：code 换 token（后端静默注册/登录） */
export function wxLogin(code: string): Promise<LoginVO> {
  return request({ url: '/auth/wx-login', method: 'POST', data: { code } })
}
