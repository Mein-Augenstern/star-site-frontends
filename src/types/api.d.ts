/** 后端统一响应体 */
export interface R<T = unknown> {
  code: number
  message: string
  data: T
}

export interface MemberVO {
  id: number
  username: string
  nickname: string
  avatar: string
  email: string | null
  phone: string | null
  gender: number
  bio: string
  createdAt: string
}

export interface LoginVO {
  token: string
  /** 有效期（分钟） */
  expiresIn: number
  member: MemberVO
}

export interface LoginDTO {
  username: string
  password: string
}

export interface RegisterDTO {
  username: string
  password: string
  nickname?: string
}

export interface MemberUpdateDTO {
  nickname?: string
  avatar?: string
  email?: string
  phone?: string
  gender?: number
  bio?: string
}
