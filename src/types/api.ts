/** 类型与 API 层（与 web 前端 types/api.d.ts 同构，按需增补） */

export interface MemberVO {
  id: number
  username: string
  nickname: string
  email: string | null
}

export interface LoginVO {
  token: string
  expiresIn: number
  member: MemberVO
}

export interface OccurrenceVO {
  id: number
  title: string
  source: string
  bizType: string
  bizId: number
  dueDate: string
  status: number
  notifiedAt: string | null
}

/** 家庭成员（family 服务自然人档案） */
export interface FamilyMemberVO {
  id: number
  familyId: number
  name: string
  relation: string
  gender: number
  birthDate: string | null
  remark: string
}

export interface FinanceAccount {
  id: number
  name: string
  accountType: string
  balance: number
  liabilityFlag: number
}

export interface FinanceTransaction {
  id: number
  accountId: number
  accountName: string
  direction: number
  amount: number
  categoryName: string
  transTime: string
  balanceAfter: number | null
}

export interface BalanceSheet {
  accountAsset: number
  archiveAsset: number | null
  archiveAvailable: boolean
  totalAsset: number
  totalLiability: number
  netWorth: number
}

export interface PageVO<T> {
  records: T[]
  total: number
  page: number
  size: number
}
