<script setup lang="ts">
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { listMembers } from '@/api/family'
import { upload } from '@/api/file'
import { createPolicy, deletePolicy, getCoverageMap, listPolicies, updatePolicy } from '@/api/insurance'
import type { CoverageMap, FamilyMember, InsurancePolicy } from '@/types/api'

const CATEGORIES: Record<string, string> = {
  critical_illness: '重疾',
  major_medical: '百万医疗',
  accident: '意外',
  life: '寿险',
  annuity: '年金',
  vehicle: '车险',
  property: '家财',
  other: '其他',
}

const STATUSES: Record<number, string> = { 1: '有效', 2: '缴费中断', 3: '已满期', 4: '已退保' }
const STATUS_TYPES: Record<number, string> = { 1: 'success', 2: 'warning', 3: 'info', 4: 'info' }

const activeTab = ref('policies')
const members = ref<FamilyMember[]>([])
const loading = ref(false)

// 保单列表
const policies = ref<InsurancePolicy[]>([])
const total = ref(0)
const query = reactive({ insuredMemberId: undefined as number | undefined, category: '', status: undefined as number | undefined, page: 1, size: 10 })

// 保障地图
const coverage = ref<CoverageMap | null>(null)

// 编辑抽屉
const drawer = ref(false)
const editing = ref<InsurancePolicy | null>(null)
const formRef = ref<FormInstance>()
const form = reactive({
  company: '',
  productName: '',
  policyNo: '',
  category: 'critical_illness',
  insuredMemberId: undefined as number | undefined,
  startDate: null as string | null,
  maturityDate: null as string | null,
  premium: null as number | null,
  paymentFreq: 'annual',
  nextPaymentDate: null as string | null,
  coverageAmount: null as number | null,
  status: 1,
  fileId: null as number | null,
  fileName: '',
  remark: '',
})

const rules: FormRules = {
  company: [{ required: true, message: '请输入保险公司', trigger: 'blur' }],
  productName: [{ required: true, message: '请输入产品名', trigger: 'blur' }],
  category: [{ required: true, message: '请选择险种', trigger: 'change' }],
  insuredMemberId: [{ required: true, message: '请选择被保人', trigger: 'change' }],
}

const dialogTitle = computed(() => (editing.value ? '编辑保单' : '录入保单'))

onMounted(async () => {
  members.value = await listMembers()
  await load()
})

async function load() {
  loading.value = true
  try {
    const page = await listPolicies({ ...query, category: query.category || undefined })
    policies.value = page.records
    total.value = page.total
    coverage.value = await getCoverageMap()
  } finally {
    loading.value = false
  }
}

function openAdd() {
  editing.value = null
  Object.assign(form, {
    company: '', productName: '', policyNo: '', category: 'critical_illness',
    insuredMemberId: undefined, startDate: null, maturityDate: null, premium: null,
    paymentFreq: 'annual', nextPaymentDate: null, coverageAmount: null, status: 1,
    fileId: null, fileName: '', remark: '',
  })
  drawer.value = true
}

function openEdit(p: InsurancePolicy) {
  editing.value = p
  Object.assign(form, {
    company: p.company, productName: p.productName, policyNo: p.policyNo ?? '',
    category: p.category, insuredMemberId: p.insuredMemberId,
    startDate: p.startDate, maturityDate: p.maturityDate, premium: p.premium,
    paymentFreq: p.paymentFreq, nextPaymentDate: p.nextPaymentDate,
    coverageAmount: p.coverageAmount, status: p.status,
    fileId: p.fileId, fileName: '', remark: p.remark ?? '',
  })
  drawer.value = true
}

async function uploadPolicyFile(options: UploadRequestOptions) {
  const vo = await upload(options.file, 'report')
  form.fileId = vo.fileId
  form.fileName = vo.name
  ElMessage.success('保单文件已上传')
  return vo
}

async function handleSave() {
  await formRef.value?.validate()
  const payload = {
    company: form.company.trim(),
    productName: form.productName.trim(),
    policyNo: form.policyNo || undefined,
    category: form.category,
    insuredMemberId: form.insuredMemberId!,
    startDate: form.startDate || null,
    maturityDate: form.maturityDate || null,
    premium: form.premium ?? null,
    paymentFreq: form.paymentFreq,
    nextPaymentDate: form.nextPaymentDate || null,
    coverageAmount: form.coverageAmount ?? null,
    status: form.status,
    fileId: form.fileId,
    remark: form.remark || undefined,
  }
  if (editing.value) {
    await updatePolicy(editing.value.id, payload)
    ElMessage.success('已保存')
  } else {
    await createPolicy(payload)
    ElMessage.success('已录入，缴费提醒将自动生成')
  }
  drawer.value = false
  await load()
}

async function handleDelete(p: InsurancePolicy) {
  await ElMessageBox.confirm(`确定删除「${p.productName}」（${p.insuredMemberName}）？关联提醒会一并撤销。`, '删除确认', { type: 'warning' })
  await deletePolicy(p.id)
  ElMessage.success('已删除')
  await load()
}
</script>

<template>
  <div v-loading="loading">
    <PageHeader title="保单管理" :description="`全家保障一张图：${coverage?.activePolicyCount ?? 0} 份有效保单，年缴合计 ¥${coverage?.totalAnnualPremium ?? 0}`">
      <template #actions>
        <el-button type="primary" @click="openAdd">录入保单</el-button>
      </template>
    </PageHeader>

    <el-tabs v-model="activeTab">
      <el-tab-pane label="保单列表" name="policies">
        <div class="filter-bar">
          <el-select v-model="query.insuredMemberId" placeholder="被保人" clearable style="width: 120px">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
          <el-select v-model="query.category" placeholder="险种" clearable style="width: 130px">
            <el-option v-for="(label, value) in CATEGORIES" :key="value" :label="label" :value="value" />
          </el-select>
          <el-select v-model="query.status" placeholder="状态" clearable style="width: 110px">
            <el-option v-for="(label, value) in STATUSES" :key="value" :label="label" :value="value" />
          </el-select>
          <el-button @click="load(); ">查询</el-button>
        </div>

        <el-table :data="policies" stripe>
          <el-table-column label="产品" min-width="180">
            <template #default="{ row }">
              <div class="cell-product">
                <span class="product-name">{{ row.productName }}</span>
                <span class="product-sub">{{ row.company }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="被保人" width="90" prop="insuredMemberName" />
          <el-table-column label="险种" width="100">
            <template #default="{ row }">{{ CATEGORIES[row.category] || row.category }}</template>
          </el-table-column>
          <el-table-column label="年缴保费" width="110">
            <template #default="{ row }">
              <span v-if="row.premium != null">¥{{ row.premium }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="保额" width="110">
            <template #default="{ row }">
              <span v-if="row.coverageAmount != null">¥{{ row.coverageAmount }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="下次缴费" width="110">
            <template #default="{ row }">
              <span v-if="row.nextPaymentDate">{{ row.nextPaymentDate }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="满期" width="110">
            <template #default="{ row }">
              <span v-if="row.maturityDate">{{ row.maturityDate }}</span>
              <span v-else class="text-muted">终身</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag size="small" :type="STATUS_TYPES[row.status]" effect="plain">{{ STATUSES[row.status] }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>

        <el-pagination
          v-model:current-page="query.page"
          :page-size="query.size"
          :total="total"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="load"
        />
      </el-tab-pane>

      <el-tab-pane label="保障地图" name="coverage">
        <el-table :data="coverage?.rows ?? []" stripe>
          <el-table-column label="成员" width="140">
            <template #default="{ row }">
              {{ row.memberName }}
              <el-tag size="small" type="info" effect="plain" style="margin-left: 4px">{{ row.relation }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column v-for="(label, value) in CATEGORIES" :key="value" :label="label" align="center" width="90">
            <template #default="{ row }">
              <span v-if="row.categories.includes(value)" class="covered">已配</span>
              <span v-else class="uncovered">未配</span>
            </template>
          </el-table-column>
        </el-table>
        <p class="coverage-note">"未配"不代表必须配置，仅供家庭保障盘点参考；具体方案请结合预算与需求评估。</p>
      </el-tab-pane>
    </el-tabs>

    <!-- 录入/编辑 -->
    <el-drawer v-model="drawer" :title="dialogTitle" size="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="保险公司" prop="company">
          <el-input v-model="form.company" maxlength="64" />
        </el-form-item>
        <el-form-item label="产品名" prop="productName">
          <el-input v-model="form.productName" maxlength="128" />
        </el-form-item>
        <el-form-item label="保单号">
          <el-input v-model="form.policyNo" maxlength="64" />
        </el-form-item>
        <el-form-item label="险种" prop="category">
          <el-select v-model="form.category">
            <el-option v-for="(label, value) in CATEGORIES" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="被保人" prop="insuredMemberId">
          <el-select v-model="form.insuredMemberId" placeholder="选择家庭成员">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="缴费方式">
          <el-radio-group v-model="form.paymentFreq">
            <el-radio value="annual">年缴</el-radio>
            <el-radio value="single">趸交</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="年缴保费">
          <el-input-number v-model="form.premium" :min="0" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item label="保额">
          <el-input-number v-model="form.coverageAmount" :min="0" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item label="生效日">
          <el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="满期日">
          <el-date-picker v-model="form.maturityDate" type="date" value-format="YYYY-MM-DD" placeholder="留空 = 终身" />
        </el-form-item>
        <el-form-item label="下次缴费日">
          <el-date-picker v-model="form.nextPaymentDate" type="date" value-format="YYYY-MM-DD" placeholder="用于生成缴费提醒" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status">
            <el-option v-for="(label, value) in STATUSES" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="电子保单">
          <div>
            <el-upload
              :http-request="uploadPolicyFile"
              :show-file-list="false"
              accept=".pdf,.jpg,.jpeg,.png"
            >
              <el-button size="small">上传 PDF/图片</el-button>
            </el-upload>
            <div v-if="form.fileId" class="upload-done">已上传：{{ form.fileName || `文件 #${form.fileId}` }}</div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="drawer = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.cell-product {
  display: flex;
  flex-direction: column;
}

.product-name {
  font-weight: 600;
  color: #1d2129;
}

.product-sub {
  font-size: 12px;
  color: #86909c;
}

.text-muted {
  color: #c9cdd4;
}

.pager {
  margin-top: 14px;
  justify-content: flex-end;
}

.covered {
  color: var(--el-color-success);
  font-size: 13px;
}

.uncovered {
  color: #c9cdd4;
  font-size: 13px;
}

.coverage-note {
  color: #86909c;
  font-size: 13px;
  margin-top: 12px;
}

.upload-done {
  font-size: 12px;
  color: #86909c;
  margin-top: 6px;
}
</style>
