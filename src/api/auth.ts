import request from './request'
import type { LoginDTO, LoginVO, RegisterDTO } from '@/types/api'

/** 注册 */
export function register(data: RegisterDTO): Promise<void> {
  return request.post('/auth/register', data)
}

/** 登录 */
export function login(data: LoginDTO): Promise<LoginVO> {
  return request.post('/auth/login', data)
}
