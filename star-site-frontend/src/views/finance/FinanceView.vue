<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import {
  createAccount,
  createGoal,
  createTransaction,
  deleteAccount,
  deleteBudget,
  deleteGoal,
  deleteTransaction,
  getBalanceSheet,
  getCashFlow,
  getCategoryShare,
  healthDiagnosis,
  getIncomeExpense,
  getMonthlyTrend,
  getNetWorthTrend,
  snapshotNow,
  importBill,
  listAccounts,
  listBudgets,
  listGoals,
  listTransactions,
  saveBudget,
  updateGoal,
} from '@/api/finance'
import type {
  BalanceSheet,
  CashFlow,
  CategoryShare,
  FinanceAccount,
  FinanceBudget,
  FinanceGoal,
  FinanceTransaction,
  IncomeExpense,
  ImportResult,
  MonthlyTrend,
  NetWorthPoint,
} from '@/types/api'

const ACCOUNT_TYPES: Record<string, string> = {
  cash: '现金', bank: '银行卡', wechat: '微信', alipay: '支付宝',
  broker: '券商', fund: '公积金', credit: '信用卡', loan: '贷款',
}
const DIRECTIONS: Record<number, string> = { 1: '收入', 2: '支出', 3: '转账', 4: '调整' }
const CATEGORIES: Record<string, string> = {
  FOOD: '餐饮', HOUSE: '住房', MORTGAGE: '房贷', CAR: '用车', INSURANCE: '保费',
  MEDICAL: '医疗', EDUCATION: '教育', SHOPPING: '购物', PARENT: '孝亲', CHILD: '育儿',
  OTHER_EXPENSE: '其他支出', SALARY: '工资', BONUS: '奖金', INTEREST: '利息',
  RED_PACKET: '红包', OTHER_INCOME: '其他收入',
}

const activeTab = ref('bookkeeping')
const accounts = ref<FinanceAccount[]>([])
const balanceSheet = ref<BalanceSheet | null>(null)
const cashFlow = ref<CashFlow | null>(null)
const incomeExpense = ref<IncomeExpense | null>(null)
const trend = ref<NetWorthPoint[]>([])
const categoryShares = ref<CategoryShare[]>([])
const monthlyTrend = ref<MonthlyTrend[]>([])
const loading = ref(false)

/* ===== 记账 ===== */
const txs = ref<FinanceTransaction[]>([])
const txTotal = ref(0)
const txQuery = reactive({
  accountId: undefined as number | undefined,
  direction: undefined as number | undefined,
  year: new Date().getFullYear(),
  month: new Date().getMonth() + 1,
  page: 1,
  size: 20,
})
const txDrawer = ref(false)
const txFormRef = ref<FormInstance>()
const txForm = reactive({
  direction: 2,
  accountId: undefined as number | undefined,
  toAccountId: undefined as number | undefined,
  amount: null as number | null,
  category: 'FOOD',
  transTime: '',
  counterparty: '',
  remark: '',
})
const txRules: FormRules = {
  accountId: [{ required: true, message: '请选择账户', trigger: 'change' }],
  amount: [{ required: true, message: '请输入金额', trigger: 'blur' }],
  transTime: [{ required: true, message: '请选择时间', trigger: 'change' }],
}

/* ===== 建户 ===== */
const accDialog = ref(false)
const accForm = reactive({ name: '', accountType: 'wechat', initialBalance: null as number | null, institution: '' })

const incomeCats = computed(() => Object.entries(CATEGORIES).filter(([k]) => !k.endsWith('_EXPENSE') && !['HOUSE', 'CAR', 'MEDICAL', 'SHOPPING', 'PARENT', 'CHILD', 'MORTGAGE'].includes(k)))
const expenseCats = computed(() => Object.entries(CATEGORIES).filter(([k]) => !['SALARY', 'BONUS', 'INTEREST', 'RED_PACKET', 'OTHER_INCOME'].includes(k)))

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [acc, sheet, flow, ie, trendData] = await Promise.all([
      listAccounts(),
      getBalanceSheet(),
      getCashFlow(),
      getIncomeExpense(txQuery.year, txQuery.month),
      getNetWorthTrend(),
    ])
    accounts.value = acc
    balanceSheet.value = sheet
    cashFlow.value = flow
    incomeExpense.value = ie
    trend.value = trendData
    categoryShares.value = await getCategoryShare(txQuery.year, txQuery.month)
    monthlyTrend.value = await getMonthlyTrend()
    await loadTxs()
    await Promise.all([loadBudgets()])
    goals.value = await listGoals()
  } finally {
    loading.value = false
  }
}

async function loadTxs() {
  const page = await listTransactions({ ...txQuery })
  txs.value = page.records
  txTotal.value = page.total
}

function openTx(direction: number) {
  Object.assign(txForm, {
    direction,
    accountId: accounts.value[0]?.id,
    toAccountId: undefined,
    amount: null,
    category: direction === 1 ? 'SALARY' : 'FOOD',
    transTime: new Date().toISOString().slice(0, 19),
    counterparty: '',
    remark: '',
  })
  txDrawer.value = true
}

async function handleSaveTx() {
  await txFormRef.value?.validate()
  await createTransaction({
    direction: txForm.direction,
    accountId: txForm.accountId!,
    toAccountId: txForm.direction === 3 ? txForm.toAccountId : undefined,
    amount: txForm.amount!,
    category: txForm.direction === 3 ? undefined : txForm.category,
    transTime: txForm.transTime,
    counterparty: txForm.counterparty || undefined,
    remark: txForm.remark || undefined,
  })
  ElMessage.success('已记账')
  txDrawer.value = false
  await load()
}

async function handleDeleteTx(t: FinanceTransaction) {
  await ElMessageBox.confirm(`删除该笔流水并回滚余额？${t.direction === 3 ? '转账会整组回滚。' : ''}`, '删除确认', { type: 'warning' })
  await deleteTransaction(t.id)
  ElMessage.success('已删除并回滚')
  await load()
}

function openAccAdd() {
  Object.assign(accForm, { name: '', accountType: 'wechat', initialBalance: null, institution: '' })
  accDialog.value = true
}

async function handleSaveAcc() {
  if (!accForm.name.trim()) {
    ElMessage.warning('请输入账户名称')
    return
  }
  await createAccount({
    name: accForm.name.trim(),
    accountType: accForm.accountType,
    initialBalance: accForm.initialBalance ?? 0,
    institution: accForm.institution || undefined,
  })
  ElMessage.success('已建户')
  accDialog.value = false
  await load()
}

async function handleDeleteAcc(a: FinanceAccount) {
  await ElMessageBox.confirm(`注销「${a.name}」？余额须为 0。`, '注销确认', { type: 'warning' })
  try {
    await deleteAccount(a.id)
    ElMessage.success('已注销')
    await load()
  } catch {
    /* 余额非 0 的拒绝信息已由拦截器弹出 */
  }
}

function amountClass(t: FinanceTransaction) {
  if (t.direction === 1) return 'amount-in'
  if (t.direction === 2) return 'amount-out'
  return ''
}

function fmtAmount(t: FinanceTransaction) {
  const abs = Math.abs(t.amount)
  if (t.direction === 1) return `+${abs}`
  if (t.direction === 2) return `-${abs}`
  return t.amount < 0 ? `-${abs}` : `+${abs}`
}

/* ===== 预算 ===== */
const budgetPeriod = ref(new Date().toISOString().slice(0, 7))
const budgets = ref<FinanceBudget[]>([])
const budgetDialog = ref(false)
const budgetForm = reactive({ category: 'FOOD', period: new Date().toISOString().slice(0, 7), amount: null as number | null })

async function loadBudgets() {
  budgets.value = await listBudgets(budgetPeriod.value)
}

function openBudget() {
  Object.assign(budgetForm, { category: 'FOOD', period: budgetPeriod.value, amount: null })
  budgetDialog.value = true
}

async function handleSaveBudget() {
  if (!budgetForm.amount || budgetForm.amount <= 0) {
    ElMessage.warning('请输入预算金额')
    return
  }
  await saveBudget({ category: budgetForm.category, period: budgetForm.period, amount: budgetForm.amount })
  ElMessage.success('预算已保存')
  budgetDialog.value = false
  await loadBudgets()
}

async function handleDeleteBudget(b: FinanceBudget) {
  await ElMessageBox.confirm(`删除「${b.categoryName}」的预算？`, '删除确认', { type: 'warning' })
  await deleteBudget(b.id)
  await loadBudgets()
}

/* ===== 目标 ===== */
const goals = ref<FinanceGoal[]>([])
const goalDialog = ref(false)
const goalEditing = ref<FinanceGoal | null>(null)
const goalForm = reactive({
  name: '',
  targetAmount: null as number | null,
  currentAmount: null as number | null,
  deadline: null as string | null,
  remark: '',
})

function openGoal(g?: FinanceGoal) {
  goalEditing.value = g ?? null
  Object.assign(goalForm, {
    name: g?.name ?? '',
    targetAmount: g?.targetAmount ?? null,
    currentAmount: g?.currentAmount ?? null,
    deadline: g?.deadline ?? null,
    remark: g?.remark ?? '',
  })
  goalDialog.value = true
}

async function handleSaveGoal() {
  if (!goalForm.name.trim() || !goalForm.targetAmount) {
    ElMessage.warning('请填写目标名称与金额')
    return
  }
  const payload = {
    name: goalForm.name.trim(),
    targetAmount: goalForm.targetAmount,
    currentAmount: goalForm.currentAmount ?? 0,
    deadline: goalForm.deadline || null,
    remark: goalForm.remark || undefined,
  }
  if (goalEditing.value) {
    await updateGoal(goalEditing.value.id, payload)
    ElMessage.success('已保存')
  } else {
    await createGoal(payload)
    ElMessage.success('目标已创建')
  }
  goalDialog.value = false
  goals.value = await listGoals()
}

async function handleDeleteGoal(g: FinanceGoal) {
  await ElMessageBox.confirm(`删除目标「${g.name}」？`, '删除确认', { type: 'warning' })
  await deleteGoal(g.id)
  goals.value = await listGoals()
}

/* ===== 账单导入 ===== */
const importDialog = ref(false)
const importAccountId = ref<number | undefined>(undefined)
const importFile = ref<globalThis.File | null>(null)
const importResult = ref<ImportResult | null>(null)
const importing = ref(false)

async function handleImport() {
  if (!importAccountId.value || !importFile.value) {
    ElMessage.warning('请选择账户与账单文件')
    return
  }
  importing.value = true
  try {
    importResult.value = await importBill(importAccountId.value, importFile.value)
    ElMessage.success(`导入完成：新入账 ${importResult.value.imported} 笔`)
    await load()
  } finally {
    importing.value = false
  }
}

/* ===== AI 财务诊断 ===== */
const aiDiag = ref('')
const aiDiagLoading = ref(false)
const aiDiagError = ref('')

async function runDiagnosis() {
  aiDiagLoading.value = true
  aiDiagError.value = ''
  try {
    aiDiag.value = await healthDiagnosis()
  } catch (e: any) {
    aiDiagError.value = e?.message ?? 'AI 诊断失败'
  } finally {
    aiDiagLoading.value = false
  }
}

function onImportFileChange(file: globalThis.File) {
  importFile.value = file
  return file
}

async function makeSnapshot() {
  const point = await snapshotNow()
  ElMessage.success(`今日快照已生成：净资产 ¥${point.netWorth}`)
  trend.value = await getNetWorthTrend()
}

const maxTrend = computed(() =>
  Math.max(1, ...monthlyTrend.value.flatMap((m) => [m.income, m.expense])))

function barH(v: number, max: number) {
  return Math.max(2, Math.round((v / max) * 110))
}
function barY(v: number, max: number) {
  return 125 - barH(v, max)
}

/** 净资产折线（简易 SVG） */
const trendPoints = computed(() => {
  const vals = trend.value.map((p) => p.netWorth)
  if (vals.length === 0) return ''
  const min = Math.min(...vals, 0)
  const max = Math.max(...vals, 1)
  const span = max - min || 1
  return trend.value
    .map((p, i) => {
      const x = trend.value.length === 1 ? 200 : (i / (trend.value.length - 1)) * 380 + 10
      const y = 110 - ((p.netWorth - min) / span) * 100
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <div v-loading="loading">
    <PageHeader title="家庭财务" description="记账、三张表与净资产曲线——钱的事，一页看清" />

    <el-tabs v-model="activeTab">
      <!-- 记账 -->
      <el-tab-pane label="记账" name="bookkeeping">
        <div class="acc-bar">
          <el-card v-for="a in accounts" :key="a.id" shadow="never" class="acc-card">
            <div class="acc-name">{{ a.name }} <el-tag size="small" type="info" effect="plain">{{ ACCOUNT_TYPES[a.accountType] }}</el-tag></div>
            <div class="acc-balance" :class="{ negative: a.balance < 0 }">¥{{ a.balance }}</div>
            <el-button v-if="a.balance == 0" link type="danger" size="small" @click="handleDeleteAcc(a)">注销</el-button>
          </el-card>
          <el-button class="acc-add" @click="openAccAdd">+ 建户</el-button>
        </div>

        <div class="tx-actions">
          <el-button type="success" plain @click="openTx(1)">记收入</el-button>
          <el-button type="danger" plain @click="openTx(2)">记支出</el-button>
          <el-button type="primary" plain @click="openTx(3)">转账</el-button>
        </div>

        <div class="filter-bar">
          <el-select v-model="txQuery.accountId" placeholder="全部账户" clearable style="width: 140px">
            <el-option v-for="a in accounts" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
          <el-select v-model="txQuery.direction" placeholder="类型" clearable style="width: 110px">
            <el-option v-for="(label, value) in DIRECTIONS" :key="value" :label="label" :value="value" />
          </el-select>
          <el-input-number v-model="txQuery.year" :min="2020" :max="2030" :controls="false" style="width: 80px" />
          年
          <el-input-number v-model="txQuery.month" :min="0" :max="12" :controls="false" style="width: 64px" />
          月（0=全年）
          <el-button @click="loadTxs">查询</el-button>
        </div>

        <el-table :data="txs" stripe>
          <el-table-column label="时间" width="160">
            <template #default="{ row }">{{ row.transTime?.slice(0, 16) }}</template>
          </el-table-column>
          <el-table-column label="类型" width="80">
            <template #default="{ row }">{{ DIRECTIONS[row.direction] }}</template>
          </el-table-column>
          <el-table-column label="账户" width="120" prop="accountName" />
          <el-table-column label="分类/对手方" min-width="120">
            <template #default="{ row }">{{ row.categoryName || row.counterparty || '—' }}</template>
          </el-table-column>
          <el-table-column label="金额" width="120" align="right">
            <template #default="{ row }">
              <span :class="amountClass(row)">{{ fmtAmount(row) }}</span>
            </template>
          </el-table-column>
          <el-table-column label="记账后余额" width="120" align="right" prop="balanceAfter" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button link type="danger" @click="handleDeleteTx(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="txQuery.page"
          :page-size="txQuery.size"
          :total="txTotal"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="loadTxs"
        />
      </el-tab-pane>

      <!-- 三张表 -->
      <el-tab-pane label="三张表" name="reports">
        <div class="report-grid">
          <el-card shadow="never">
            <template #header>资产负债表</template>
            <div class="report-row"><span>账户资产</span><b>¥{{ balanceSheet?.accountAsset ?? 0 }}</b></div>
            <div class="report-row">
              <span>档案资产估值</span>
              <b v-if="balanceSheet?.archiveAvailable">¥{{ balanceSheet?.archiveAsset ?? 0 }}</b>
              <el-tag v-else size="small" type="info">档案服务不可用</el-tag>
            </div>
            <div class="report-row total"><span>总资产</span><b>¥{{ balanceSheet?.totalAsset ?? 0 }}</b></div>
            <div class="report-row"><span>总负债（信用卡/贷款）</span><b>¥{{ balanceSheet?.totalLiability ?? 0 }}</b></div>
            <div class="report-row net"><span>净资产</span><b>¥{{ balanceSheet?.netWorth ?? 0 }}</b></div>
          </el-card>

          <el-card shadow="never">
            <template #header>
              <div class="block-head">
                <span>收支表 · {{ txQuery.year }}年{{ txQuery.month }}月</span>
              </div>
            </template>
            <div class="report-row"><span>收入</span><b class="amount-in">¥{{ incomeExpense?.income ?? 0 }}</b></div>
            <div class="report-row"><span>支出</span><b class="amount-out">¥{{ incomeExpense?.expense ?? 0 }}</b></div>
            <div class="report-row total"><span>结余</span><b>¥{{ incomeExpense?.surplus ?? 0 }}</b></div>
            <div class="report-row"><span>结余率</span><b>{{ incomeExpense?.surplusRate != null ? (incomeExpense.surplusRate * 100).toFixed(1) + '%' : '—' }}</b></div>
          </el-card>

          <el-card shadow="never">
            <template #header>现金流量表</template>
            <div class="report-row"><span>手头能动的钱</span><b>¥{{ cashFlow?.liquidBalance ?? 0 }}</b></div>
            <div class="report-row"><span>近 12 月月均支出</span><b>¥{{ cashFlow?.monthlyAvgExpense ?? '—' }}</b></div>
            <div class="report-row net"><span>可撑月数</span><b>{{ cashFlow?.monthsCovered ?? '∞' }}</b></div>
          </el-card>
        </div>

        <el-card shadow="never" class="ai-card">
          <template #header>
            <div class="ai-head">
              <span>AI 财务健康诊断</span>
              <el-button size="small" type="primary" :loading="aiDiagLoading" @click="runDiagnosis">
                {{ aiDiag ? '重新诊断' : '开始诊断' }}
              </el-button>
            </div>
          </template>
          <el-alert v-if="aiDiagError" type="warning" :title="aiDiagError" :closable="false" />
          <div v-if="aiDiagLoading" class="ai-loading">AI 正在分析三张表……</div>
          <p v-if="aiDiag" class="ai-text">{{ aiDiag }}</p>
          <p v-if="aiDiag" class="text-muted" style="font-size: 12px; margin-bottom: 0">仅供参考，不构成投资建议</p>
        </el-card>
      </el-tab-pane>

      <!-- 图表 -->
      <el-tab-pane label="图表分析" name="charts">
        <div class="report-grid">
          <el-card shadow="never">
            <template #header>
              <div class="block-head"><span>当月分类支出 · {{ txQuery.year }}年{{ txQuery.month }}月</span></div>
            </template>
            <el-empty v-if="categoryShares.length === 0" description="当月还没有支出" :image-size="60" />
            <div v-else class="bar-list">
              <div v-for="c in categoryShares" :key="c.category" class="bar-item">
                <div class="bar-top"><span>{{ c.categoryName }}</span><span>¥{{ c.amount }}</span></div>
                <el-progress
                  :percentage="Math.round((c.amount / (categoryShares[0]?.amount || 1)) * 100)"
                  :show-text="false"
                  :stroke-width="10"
                />
              </div>
            </div>
          </el-card>

          <el-card shadow="never">
            <template #header>
              <div class="block-head"><span>近 12 个月收支趋势</span></div>
            </template>
            <svg class="trend" viewBox="0 0 400 140" preserveAspectRatio="none">
              <g v-for="(m, i) in monthlyTrend" :key="m.month">
                <rect
                  :x="15 + i * 32" :y="barY(m.income, maxTrend)" :width="10"
                  :height="barH(m.income, maxTrend)" fill="var(--el-color-success)" opacity="0.85"
                />
                <rect
                  :x="27 + i * 32" :y="barY(m.expense, maxTrend)" :width="10"
                  :height="barH(m.expense, maxTrend)" fill="var(--el-color-danger)" opacity="0.85"
                />
              </g>
            </svg>
            <div class="legend">
              <span><i class="dot in"></i>收入</span>
              <span><i class="dot out"></i>支出</span>
              <span class="text-muted">每月一对柱：左收入右支出</span>
            </div>
          </el-card>
        </div>
      </el-tab-pane>

      <!-- 净资产曲线 -->
      <el-tab-pane label="净资产曲线" name="trend">
        <div class="section-head">
          <span>每日 02:30 自动快照</span>
          <el-button size="small" @click="makeSnapshot">生成今日快照</el-button>
        </div>
        <el-empty v-if="trend.length === 0" description="还没有快照，点右上角立即生成" :image-size="60" />
        <template v-else>
          <svg class="trend" viewBox="0 0 400 120" preserveAspectRatio="none">
            <polyline :points="trendPoints" fill="none" stroke="var(--el-color-primary)" stroke-width="2" />
          </svg>
          <el-table :data="trend" size="small" stripe>
            <el-table-column label="日期" width="120" prop="date" />
            <el-table-column label="净资产"><template #default="{ row }">¥{{ row.netWorth }}</template></el-table-column>
          </el-table>
        </template>
      </el-tab-pane>

      <!-- 预算与目标 -->
      <el-tab-pane label="预算与目标" name="budget">
        <div class="section-head">
          <span>月度预算 · {{ budgetPeriod }}</span>
          <div>
            <el-date-picker v-model="budgetPeriod" type="month" value-format="YYYY-MM" :clearable="false" style="width: 120px" @change="loadBudgets" />
            <el-button type="primary" plain @click="openBudget">设预算</el-button>
          </div>
        </div>
        <el-empty v-if="budgets.length === 0" description="还没有设置预算" :image-size="60" />
        <div v-else class="budget-list">
          <div v-for="b in budgets" :key="b.id" class="budget-item">
            <div class="budget-top">
              <span>{{ b.categoryName }}</span>
              <span>预算 ¥{{ b.amount }} · 已花 ¥{{ b.spent }}</span>
            </div>
            <el-progress
              :percentage="Math.min(100, Math.round((b.usageRate ?? 0) * 100))"
              :status="(b.usageRate ?? 0) > 1 ? 'exception' : (b.usageRate ?? 0) > 0.8 ? 'warning' : 'success'"
            />
            <div class="budget-bottom">
              <span :class="(b.remaining ?? 0) < 0 ? 'amount-out' : ''">{{ (b.remaining ?? 0) < 0 ? `超支 ¥${Math.abs(b.remaining)}` : `剩余 ¥${b.remaining}` }}</span>
              <el-button link type="danger" size="small" @click="handleDeleteBudget(b)">删除</el-button>
            </div>
          </div>
        </div>

        <div class="section-head" style="margin-top: 24px">
          <span>家庭目标</span>
          <el-button type="primary" plain @click="openGoal()">新目标</el-button>
        </div>
        <el-empty v-if="goals.length === 0" description="还没有家庭目标，比如「教育金」「换房基金」" :image-size="60" />
        <div v-else class="budget-list">
          <div v-for="g in goals" :key="g.id" class="budget-item">
            <div class="budget-top">
              <span>{{ g.name }} <el-tag v-if="g.deadline" size="small" type="info" effect="plain">{{ g.deadline }} 前</el-tag></span>
              <span>¥{{ g.currentAmount }} / ¥{{ g.targetAmount }}</span>
            </div>
            <el-progress :percentage="Math.min(100, Math.round((g.progress ?? 0) * 100))" />
            <div class="budget-bottom">
              <span class="text-muted">{{ g.remark || '——' }}</span>
              <div>
                <el-button link type="primary" size="small" @click="openGoal(g)">更新进度</el-button>
                <el-button link type="danger" size="small" @click="handleDeleteGoal(g)">删除</el-button>
              </div>
            </div>
          </div>
        </div>

        <div class="section-head" style="margin-top: 24px">
          <span>账单导入</span>
          <el-button plain @click="importDialog = true; importResult = null; importFile = null">导入微信/支付宝账单</el-button>
        </div>
        <p class="text-muted" style="font-size: 13px">导出微信「我-服务-钱包-账单-下载账单」或支付宝「收支明细查询」CSV，重复导入自动去重。</p>
      </el-tab-pane>
    </el-tabs>

    <!-- 记账抽屉 -->
    <el-drawer v-model="txDrawer" :title="DIRECTIONS[txForm.direction]" size="420px">
      <el-form ref="txFormRef" :model="txForm" :rules="txRules" label-width="90px">
        <el-form-item label="账户" prop="accountId">
          <el-select v-model="txForm.accountId">
            <el-option v-for="a in accounts" :key="a.id" :label="`${a.name}（余额 ${a.balance}）`" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="txForm.direction === 3" label="转入账户" required>
          <el-select v-model="txForm.toAccountId">
            <el-option v-for="a in accounts.filter((x) => x.id !== txForm.accountId)" :key="a.id" :label="a.name" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="金额" prop="amount">
          <el-input-number v-model="txForm.amount" :min="0.01" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item v-if="txForm.direction !== 3" label="分类">
          <el-select v-model="txForm.category">
            <template v-if="txForm.direction === 1">
              <el-option v-for="[value, label] in incomeCats" :key="value" :label="label" :value="value" />
            </template>
            <template v-else>
              <el-option v-for="[value, label] in expenseCats" :key="value" :label="label" :value="value" />
            </template>
          </el-select>
        </el-form-item>
        <el-form-item label="时间" prop="transTime">
          <el-date-picker v-model="txForm.transTime" type="datetime" value-format="YYYY-MM-DDTHH:mm:ss" />
        </el-form-item>
        <el-form-item label="对手方">
          <el-input v-model="txForm.counterparty" maxlength="64" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="txForm.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="txDrawer = false">取消</el-button>
        <el-button type="primary" @click="handleSaveTx">保存</el-button>
      </template>
    </el-drawer>

    <!-- 预算设置 -->
    <el-dialog v-model="budgetDialog" title="设置月度预算" width="420px">
      <el-form label-width="90px">
        <el-form-item label="分类" required>
          <el-select v-model="budgetForm.category">
            <el-option v-for="[value, label] in expenseCats" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="月份" required>
          <el-date-picker v-model="budgetForm.period" type="month" value-format="YYYY-MM" :clearable="false" />
        </el-form-item>
        <el-form-item label="预算金额" required>
          <el-input-number v-model="budgetForm.amount" :min="1" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="budgetDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveBudget">保存</el-button>
      </template>
    </el-dialog>

    <!-- 目标编辑 -->
    <el-dialog v-model="goalDialog" :title="goalEditing ? '更新目标' : '新建目标'" width="440px">
      <el-form label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="goalForm.name" maxlength="64" placeholder="如：教育金" />
        </el-form-item>
        <el-form-item label="目标金额" required>
          <el-input-number v-model="goalForm.targetAmount" :min="1" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item label="已攒金额">
          <el-input-number v-model="goalForm.currentAmount" :min="0" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item label="截止日">
          <el-date-picker v-model="goalForm.deadline" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="goalForm.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="goalDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveGoal">保存</el-button>
      </template>
    </el-dialog>

    <!-- 账单导入 -->
    <el-dialog v-model="importDialog" title="导入微信/支付宝账单" width="460px">
      <el-form label-width="90px">
        <el-form-item label="导入账户" required>
          <el-select v-model="importAccountId" placeholder="账单流水挂到哪个账户">
            <el-option v-for="a in accounts" :key="a.id" :label="`${a.name}（余额 ${a.balance}）`" :value="a.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="账单文件" required>
          <el-upload
            :auto-upload="false"
            :limit="1"
            accept=".csv"
            :on-change="(f: any) => onImportFileChange(f.raw)"
          >
            <el-button>选择 CSV 文件</el-button>
          </el-upload>
          <div class="upload-done">支持微信支付/支付宝导出的账单 CSV，自动识别格式与去重</div>
        </el-form-item>
        <el-alert v-if="importResult" type="success" :closable="false"
          :title="`渠道 ${importResult.channel}：解析 ${importResult.parsed} 笔，新入账 ${importResult.imported} 笔，重复跳过 ${importResult.duplicates}，解析跳过 ${importResult.skipped}`" />
      </el-form>
      <template #footer>
        <el-button @click="importDialog = false">关闭</el-button>
        <el-button type="primary" :loading="importing" @click="handleImport">开始导入</el-button>
      </template>
    </el-dialog>

    <!-- 建户 -->
    <el-dialog v-model="accDialog" title="新建账户" width="420px">
      <el-form label-width="90px">
        <el-form-item label="名称" required>
          <el-input v-model="accForm.name" maxlength="64" />
        </el-form-item>
        <el-form-item label="类型" required>
          <el-select v-model="accForm.accountType">
            <el-option v-for="(label, value) in ACCOUNT_TYPES" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="期初余额">
          <el-input-number v-model="accForm.initialBalance" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item label="机构">
          <el-input v-model="accForm.institution" maxlength="64" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="accDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAcc">创建</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.acc-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.acc-card {
  min-width: 180px;
}

.acc-add {
  align-self: stretch;
}

.acc-name {
  font-size: 13px;
  color: #86909c;
  display: flex;
  gap: 6px;
  align-items: center;
}

.acc-balance {
  font-size: 20px;
  font-weight: 600;
  margin-top: 6px;
}

.acc-balance.negative {
  color: var(--el-color-danger);
}

.tx-actions {
  margin-bottom: 14px;
}

.filter-bar {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 14px;
}

.pager {
  margin-top: 14px;
  justify-content: flex-end;
}

.amount-in {
  color: var(--el-color-success);
  font-weight: 600;
}

.amount-out {
  color: var(--el-color-danger);
  font-weight: 600;
}

.report-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
}

.block-head {
  font-weight: 600;
}

.report-row {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px dashed var(--panel-border);
  font-size: 14px;
}

.report-row.total {
  border-bottom: 1px solid var(--panel-border);
}

.report-row.net {
  border-bottom: none;
  font-size: 16px;
}

.report-row b {
  font-weight: 600;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
  margin-bottom: 12px;
}

.budget-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-item {
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--panel-border);
}

.budget-top {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  margin-bottom: 8px;
}

.budget-bottom {
  display: flex;
  justify-content: space-between;
  margin-top: 6px;
  font-size: 13px;
}

.text-muted {
  color: #86909c;
}

.upload-done {
  font-size: 12px;
  color: #86909c;
  margin-top: 6px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 600;
}

.bar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.bar-item .bar-top {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 4px;
}

.legend {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #86909c;
  margin-top: 8px;
}

.legend .dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 4px;
  border-radius: 2px;
}

.legend .dot.in {
  background: var(--el-color-success);
}

.legend .dot.out {
  background: var(--el-color-danger);
}

.ai-card {
  margin-top: 16px;
}

.ai-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.ai-text {
  white-space: pre-wrap;
  line-height: 1.8;
  color: #1d2129;
  margin: 0;
}

.ai-loading {
  color: #86909c;
  font-size: 13px;
}

.trend {
  width: 100%;
  height: 140px;
  margin-bottom: 12px;
  border: 1px solid var(--panel-border);
  background: #fff;
}
</style>
