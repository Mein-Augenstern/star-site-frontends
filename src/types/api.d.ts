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

/* ===== 家庭域 ===== */
export interface Family {
  id: number
  name: string
  remark: string
  createdAt: string
}

export interface FamilyMember {
  id: number
  familyId: number
  name: string
  relation: string
  gender: number
  birthDate: string | null
  phone: string | null
  avatarFileId: number | null
  linkedMemberId: number | null
  remark: string
  createdAt: string
}

export interface FamilyMemberDTO {
  name: string
  relation: string
  gender?: number
  birthDate?: string | null
  phone?: string
  avatarFileId?: number | null
  linkedMemberId?: number | null
  remark?: string
}

/* ===== 文件域 ===== */
export interface FileVO {
  fileId: number
  name: string
  contentType: string
  size: number
}

/* ===== 体检报告域 ===== */
export interface HealthReport {
  id: number
  familyMemberId: number
  reportYear: number
  checkupDate: string | null
  hospital: string
  title: string
  summary: string
  fileId: number | null
  remark: string
  createdAt: string
  indicators?: HealthIndicator[]
}

export interface HealthIndicator {
  id: number
  reportId: number
  reportYear: number
  itemName: string
  itemGroup: string
  valueNum: number | null
  valueText: string | null
  unit: string
  refLow: number | null
  refHigh: number | null
  abnormalFlag: number
  sortNo: number
}

export interface IndicatorDTO {
  itemName: string
  itemGroup?: string
  valueNum?: number | null
  valueText?: string
  unit?: string
  refLow?: number | null
  refHigh?: number | null
}

export interface TrendPoint {
  reportYear: number
  reportId: number
  valueNum: number | null
  valueText: string | null
  unit: string
  abnormalFlag: number
}

export interface PageVO<T> {
  records: T[]
  total: number
  page: number
  size: number
}
