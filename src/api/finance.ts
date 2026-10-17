import request from './request'
import type {
  BalanceSheet,
  CategoryShare,
  MonthlyTrend,
  CashFlow,
  FinanceAccount,
  FinanceBudget,
  FinanceGoal,
  FinanceTransaction,
  ImportResult,
  IncomeExpense,
  NetWorthPoint,
  PageVO,
} from '@/types/api'

/* ===== 账户 ===== */
export function createAccount(data: {
  name: string
  accountType: string
  initialBalance?: number
  institution?: string
  remark?: string
}): Promise<FinanceAccount> {
  return request.post('/finance/accounts', data)
}

export function listAccounts(): Promise<FinanceAccount[]> {
  return request.get('/finance/accounts')
}

export function updateAccount(
  id: number,
  data: { name: string; accountType: string; institution?: string; remark?: string },
): Promise<FinanceAccount> {
  return request.put(`/finance/accounts/${id}`, data)
}

export function deleteAccount(id: number): Promise<void> {
  return request.delete(`/finance/accounts/${id}`)
}

/* ===== 记账 ===== */
export function createTransaction(data: {
  direction: number
  accountId: number
  toAccountId?: number
  amount: number
  category?: string
  transTime: string
  counterparty?: string
  fileId?: number | null
  remark?: string
}): Promise<FinanceTransaction> {
  return request.post('/finance/transactions', data)
}

export function listTransactions(params: {
  accountId?: number
  direction?: number
  year?: number
  month?: number
  page?: number
  size?: number
}): Promise<PageVO<FinanceTransaction>> {
  return request.get('/finance/transactions', { params })
}

export function deleteTransaction(id: number): Promise<void> {
  return request.delete(`/finance/transactions/${id}`)
}

/* ===== 三张表 ===== */
export function getBalanceSheet(): Promise<BalanceSheet> {
  return request.get('/finance/reports/balance-sheet')
}

export function getIncomeExpense(year: number, month: number): Promise<IncomeExpense> {
  return request.get('/finance/reports/income-expense', { params: { year, month } })
}

export function getCashFlow(): Promise<CashFlow> {
  return request.get('/finance/reports/cash-flow')
}

export function getNetWorthTrend(): Promise<NetWorthPoint[]> {
  return request.get('/finance/reports/net-worth-trend')
}

export function getCategoryShare(year: number, month: number): Promise<CategoryShare[]> {
  return request.get('/finance/reports/category-share', { params: { year, month } })
}

export function getMonthlyTrend(): Promise<MonthlyTrend[]> {
  return request.get('/finance/reports/monthly-trend')
}

export function snapshotNow(): Promise<NetWorthPoint> {
  return request.post('/finance/reports/snapshot-now')
}

export function healthDiagnosis(): Promise<string> {
  return request.post('/finance/reports/health-diagnosis')
}

/* ===== 预算 ===== */
export function saveBudget(data: { category: string; period: string; amount: number }): Promise<FinanceBudget> {
  return request.post('/finance/budgets', data)
}

export function listBudgets(period: string): Promise<FinanceBudget[]> {
  return request.get('/finance/budgets', { params: { period } })
}

export function deleteBudget(id: number): Promise<void> {
  return request.delete(`/finance/budgets/${id}`)
}

/* ===== 目标 ===== */
export function createGoal(data: {
  name: string
  targetAmount: number
  currentAmount?: number
  deadline?: string | null
  remark?: string
}): Promise<FinanceGoal> {
  return request.post('/finance/goals', data)
}

export function listGoals(): Promise<FinanceGoal[]> {
  return request.get('/finance/goals')
}

export function updateGoal(
  id: number,
  data: { name: string; targetAmount: number; currentAmount?: number; deadline?: string | null; remark?: string },
): Promise<FinanceGoal> {
  return request.put(`/finance/goals/${id}`, data)
}

export function deleteGoal(id: number): Promise<void> {
  return request.delete(`/finance/goals/${id}`)
}

/* ===== 账单导入 ===== */
export function importBill(accountId: number, file: globalThis.File): Promise<ImportResult> {
  const form = new FormData()
  form.append('accountId', String(accountId))
  form.append('file', file)
  return request.post('/finance/import', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
}
