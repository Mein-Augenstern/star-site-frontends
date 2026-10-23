/** 公共类型（与后端 VO 对齐） */

export interface LoginVO {
  token: string
  member: MemberVO
}

export interface MemberVO {
  id: number
  username?: string
  nickname?: string
  avatar?: string
  phone?: string
}

export interface FamilyMemberVO {
  id: number
  name: string
  relation: string
  gender: number
  birthDate: string | null
  phone?: string
  remark?: string
}

export interface PageVO<T> {
  records: T[]
  total: number
  page: number
  size: number
}

/** 提醒到期实例（每日监测打卡 / 复查提醒的待办） */
export interface OccurrenceVO {
  id: number
  ruleId: number
  title: string
  source: string
  bizType: string
  bizId: number
  dueDate: string
  status: number
}
