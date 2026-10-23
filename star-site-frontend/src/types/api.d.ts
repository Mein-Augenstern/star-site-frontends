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

export interface InterpretationResult {
  text: string
  interpretedAt: string | null
  cached: boolean
}

export interface PageVO<T> {
  records: T[]
  total: number
  page: number
  size: number
}

/* ===== 保单域 ===== */
export interface InsurancePolicy {
  id: number
  company: string
  productName: string
  policyNo: string
  category: string
  insuredMemberId: number
  insuredMemberName: string
  startDate: string | null
  maturityDate: string | null
  premium: number | null
  paymentFreq: string
  nextPaymentDate: string | null
  coverageAmount: number | null
  status: number
  fileId: number | null
  remark: string
  createdAt: string
}

export interface PolicySaveDTO {
  company: string
  productName: string
  policyNo?: string
  category: string
  insuredMemberId: number
  startDate?: string | null
  maturityDate?: string | null
  premium?: number | null
  paymentFreq?: string
  nextPaymentDate?: string | null
  coverageAmount?: number | null
  status?: number
  fileId?: number | null
  remark?: string
}

export interface CoverageMapRow {
  memberId: number
  memberName: string
  relation: string
  categories: string[]
}

export interface CoverageMap {
  rows: CoverageMapRow[]
  totalAnnualPremium: number
  activePolicyCount: number
}

/* ===== 提醒域 ===== */
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

export interface NotificationVO {
  id: number
  occurrenceId: number
  title: string
  readFlag: number
  createdAt: string
}

/* ===== 财务域 ===== */
export interface FinanceAccount {
  id: number
  name: string
  accountType: string
  balance: number
  initialBalance: number
  liabilityFlag: number
  institution: string
  remark: string
  createdAt: string
}

export interface FinanceTransaction {
  id: number
  accountId: number
  accountName: string
  direction: number
  amount: number
  category: string | null
  categoryName: string
  transTime: string
  counterparty: string
  transferGroupId: number | null
  balanceAfter: number | null
  source: number
  remark: string
  createdAt: string
}

export interface BalanceSheet {
  accountAsset: number
  archiveAsset: number | null
  archiveAvailable: boolean
  totalAsset: number
  totalLiability: number
  netWorth: number
}

export interface IncomeExpense {
  year: number
  month: number | null
  income: number
  expense: number
  surplus: number
  surplusRate: number | null
}

export interface CashFlow {
  liquidBalance: number
  monthlyAvgExpense: number | null
  monthsCovered: number | null
}

export interface NetWorthPoint {
  date: string
  netWorth: number
}

export interface CategoryShare {
  category: string
  categoryName: string
  amount: number
}

export interface MonthlyTrend {
  month: string
  income: number
  expense: number
}

export interface FinanceBudget {
  id: number
  category: string
  categoryName: string
  period: string
  amount: number
  spent: number
  remaining: number
  usageRate: number | null
}

export interface FinanceGoal {
  id: number
  name: string
  targetAmount: number
  currentAmount: number
  deadline: string | null
  progress: number | null
  remark: string
}

export interface ImportResult {
  channel: string
  parsed: number
  imported: number
  duplicates: number
  skipped: number
}

/* ===== 家庭档案域（证件 + 资产） ===== */
export interface ArchiveDocument {
  id: number
  holderMemberId: number
  holderMemberName: string
  docType: string
  docNo: string
  issueDate: string | null
  expiryDate: string | null
  fileId: number | null
  remark: string
  createdAt: string
}

export interface DocumentSaveDTO {
  docType: string
  holderMemberId: number
  docNo?: string
  issueDate?: string | null
  expiryDate?: string | null
  fileId?: number | null
  remark?: string
}

export interface ArchiveAsset {
  id: number
  name: string
  assetType: string
  holderMemberId: number | null
  holderMemberName: string | null
  acquireDate: string | null
  currentValue: number | null
  valuedAt: string | null
  nextInspectDate: string | null
  remark: string
  createdAt: string
}

export interface AssetSaveDTO {
  name: string
  assetType: string
  holderMemberId?: number | null
  acquireDate?: string | null
  currentValue?: number | null
  nextInspectDate?: string | null
  remark?: string
}

export interface ValuationPoint {
  value: number
  valuedAt: string
}

export interface AssetSummary {
  totalValue: number
  slices: { assetType: string; totalValue: number; count: number }[]
}
