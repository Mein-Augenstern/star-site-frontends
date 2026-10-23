<script setup lang="ts">
import type { FormInstance, FormRules, UploadRequestOptions } from 'element-plus'
import { ElMessage, ElMessageBox } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { listMembers } from '@/api/family'
import { upload } from '@/api/file'
import {
  createAsset,
  createDocument,
  deleteAsset,
  deleteDocument,
  getAssetSummary,
  getValuations,
  listAssets,
  listDocuments,
  updateAsset,
  updateDocument,
} from '@/api/archive'
import type { ArchiveAsset, ArchiveDocument, AssetSummary, FamilyMember } from '@/types/api'

const DOC_TYPES: Record<string, string> = {
  id_card: '身份证',
  hukou: '户口本',
  property_cert: '房产证',
  vehicle_license: '行驶证',
  diploma: '学历证书',
  marriage: '结婚证',
  birth: '出生证明',
  passport: '护照',
  contract: '合同',
  other: '其他',
}

const ASSET_TYPES: Record<string, string> = {
  real_estate: '房产',
  vehicle: '车辆',
  deposit: '存款',
  investment: '理财',
  fund: '公积金',
  other: '其他',
}

const activeTab = ref('documents')
const members = ref<FamilyMember[]>([])
const summary = ref<AssetSummary | null>(null)
const loading = ref(false)

/* ===== 证件 ===== */
const documents = ref<ArchiveDocument[]>([])
const docTotal = ref(0)
const docQuery = reactive({ holderMemberId: undefined as number | undefined, docType: '', page: 1, size: 20 })
const docDrawer = ref(false)
const editingDoc = ref<ArchiveDocument | null>(null)
const docFormRef = ref<FormInstance>()
const docForm = reactive({
  docType: 'id_card',
  holderMemberId: undefined as number | undefined,
  docNo: '',
  issueDate: null as string | null,
  expiryDate: null as string | null,
  fileId: null as number | null,
  fileName: '',
  remark: '',
})
const docRules: FormRules = {
  docType: [{ required: true, message: '请选择证件类型', trigger: 'change' }],
  holderMemberId: [{ required: true, message: '请选择持有人', trigger: 'change' }],
}

/* ===== 资产 ===== */
const assets = ref<ArchiveAsset[]>([])
const assetTotal = ref(0)
const assetQuery = reactive({ assetType: '', page: 1, size: 20 })
const assetDrawer = ref(false)
const editingAsset = ref<ArchiveAsset | null>(null)
const assetFormRef = ref<FormInstance>()
const assetForm = reactive({
  name: '',
  assetType: 'real_estate',
  holderMemberId: undefined as number | undefined,
  acquireDate: null as string | null,
  currentValue: null as number | null,
  nextInspectDate: null as string | null,
  remark: '',
})
const assetRules: FormRules = {
  name: [{ required: true, message: '请输入资产名称', trigger: 'blur' }],
  assetType: [{ required: true, message: '请选择资产类型', trigger: 'change' }],
}

// 估值历史弹层
const valuationDialog = ref(false)
const valuationAsset = ref<ArchiveAsset | null>(null)
const valuations = ref<{ value: number; valuedAt: string }[]>([])

const docDrawerTitle = computed(() => (editingDoc.value ? '编辑证件' : '录入证件'))
const assetDrawerTitle = computed(() => (editingAsset.value ? '编辑资产' : '录入资产'))

onMounted(load)

async function load() {
  loading.value = true
  try {
    const [mem, docs, as, sum] = await Promise.all([
      listMembers(),
      listDocuments({ ...docQuery, docType: docQuery.docType || undefined }),
      listAssets({ ...assetQuery, assetType: assetQuery.assetType || undefined }),
      getAssetSummary(),
    ])
    members.value = mem
    documents.value = docs.records
    docTotal.value = docs.total
    assets.value = as.records
    assetTotal.value = as.total
    summary.value = sum
  } finally {
    loading.value = false
  }
}

/* 证件操作 */
function openDocAdd() {
  editingDoc.value = null
  Object.assign(docForm, {
    docType: 'id_card', holderMemberId: undefined, docNo: '',
    issueDate: null, expiryDate: null, fileId: null, fileName: '', remark: '',
  })
  docDrawer.value = true
}

function openDocEdit(d: ArchiveDocument) {
  editingDoc.value = d
  Object.assign(docForm, {
    docType: d.docType, holderMemberId: d.holderMemberId, docNo: d.docNo ?? '',
    issueDate: d.issueDate, expiryDate: d.expiryDate, fileId: d.fileId, fileName: '', remark: d.remark ?? '',
  })
  docDrawer.value = true
}

async function uploadScanFile(options: UploadRequestOptions) {
  const vo = await upload(options.file, 'other')
  docForm.fileId = vo.fileId
  docForm.fileName = vo.name
  ElMessage.success('扫描件已上传')
  return vo
}

async function handleSaveDoc() {
  await docFormRef.value?.validate()
  const payload = {
    docType: docForm.docType,
    holderMemberId: docForm.holderMemberId!,
    docNo: docForm.docNo || undefined,
    issueDate: docForm.issueDate || null,
    expiryDate: docForm.expiryDate || null,
    fileId: docForm.fileId,
    remark: docForm.remark || undefined,
  }
  if (editingDoc.value) {
    await updateDocument(editingDoc.value.id, payload)
    ElMessage.success('已保存')
  } else {
    await createDocument(payload)
    ElMessage.success('已录入，到期将自动提醒')
  }
  docDrawer.value = false
  await load()
}

async function handleDeleteDoc(d: ArchiveDocument) {
  await ElMessageBox.confirm(`确定删除「${d.holderMemberName}」的${DOC_TYPES[d.docType]}？`, '删除确认', { type: 'warning' })
  await deleteDocument(d.id)
  ElMessage.success('已删除')
  await load()
}

function expiryClass(d: ArchiveDocument) {
  if (!d.expiryDate) return ''
  const diff = (new Date(d.expiryDate).getTime() - Date.now()) / 86_400_000
  if (diff < 0) return 'expired'
  if (diff < 90) return 'expiring'
  return ''
}

/* 资产操作 */
function openAssetAdd() {
  editingAsset.value = null
  Object.assign(assetForm, {
    name: '', assetType: 'real_estate', holderMemberId: undefined,
    acquireDate: null, currentValue: null, nextInspectDate: null, remark: '',
  })
  assetDrawer.value = true
}

function openAssetEdit(a: ArchiveAsset) {
  editingAsset.value = a
  Object.assign(assetForm, {
    name: a.name, assetType: a.assetType, holderMemberId: a.holderMemberId ?? undefined,
    acquireDate: a.acquireDate, currentValue: a.currentValue,
    nextInspectDate: a.nextInspectDate, remark: a.remark ?? '',
  })
  assetDrawer.value = true
}

async function handleSaveAsset() {
  await assetFormRef.value?.validate()
  const payload = {
    name: assetForm.name.trim(),
    assetType: assetForm.assetType,
    holderMemberId: assetForm.holderMemberId ?? null,
    acquireDate: assetForm.acquireDate || null,
    currentValue: assetForm.currentValue ?? null,
    nextInspectDate: assetForm.assetType === 'vehicle' ? assetForm.nextInspectDate || null : null,
    remark: assetForm.remark || undefined,
  }
  if (editingAsset.value) {
    await updateAsset(editingAsset.value.id, payload)
    ElMessage.success('已保存')
  } else {
    await createAsset(payload)
    ElMessage.success('已录入')
  }
  assetDrawer.value = false
  await load()
}

async function handleDeleteAsset(a: ArchiveAsset) {
  await ElMessageBox.confirm(`确定删除资产「${a.name}」？估值历史会一并失效。`, '删除确认', { type: 'warning' })
  await deleteAsset(a.id)
  ElMessage.success('已删除')
  await load()
}

async function openValuations(a: ArchiveAsset) {
  valuationAsset.value = a
  valuations.value = await getValuations(a.id)
  valuationDialog.value = true
}

/** 估值趋势折线（简易 SVG，无图表库依赖）：归一化到 400x110 视图区 */
const trendPoints = computed(() => {
  const vals = valuations.value.map((v) => v.value)
  if (vals.length === 0) return ''
  const min = Math.min(...vals)
  const max = Math.max(...vals)
  const span = max === min ? 1 : max - min
  return valuations.value
    .map((v, i) => {
      const x = vals.length === 1 ? 200 : (i / (vals.length - 1)) * 380 + 10
      const y = 110 - ((v.value - min) / span) * 100
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
})
</script>

<template>
  <div v-loading="loading">
    <PageHeader
      title="证件资产"
      :description="`全家资产总估值 ¥${summary?.totalValue ?? 0}，证件到期、车辆年检自动提醒`"
    >
      <template #actions>
        <el-button v-if="activeTab === 'documents'" type="primary" @click="openDocAdd">录入证件</el-button>
        <el-button v-else type="primary" @click="openAssetAdd">录入资产</el-button>
      </template>
    </PageHeader>

    <el-tabs v-model="activeTab">
      <!-- 证件夹 -->
      <el-tab-pane label="证件夹" name="documents">
        <div class="filter-bar">
          <el-select v-model="docQuery.holderMemberId" placeholder="持有人" clearable style="width: 120px">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
          <el-select v-model="docQuery.docType" placeholder="证件类型" clearable style="width: 130px">
            <el-option v-for="(label, value) in DOC_TYPES" :key="value" :label="label" :value="value" />
          </el-select>
          <el-button @click="load">查询</el-button>
        </div>

        <el-table :data="documents" stripe>
          <el-table-column label="证件" min-width="160">
            <template #default="{ row }">
              {{ DOC_TYPES[row.docType] || row.docType }}
            </template>
          </el-table-column>
          <el-table-column label="持有人" width="90" prop="holderMemberName" />
          <el-table-column label="号码" min-width="150">
            <template #default="{ row }">
              <span class="mono">{{ row.docNo || '—' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="有效期至" width="150">
            <template #default="{ row }">
              <span v-if="row.expiryDate" :class="expiryClass(row)">{{ row.expiryDate }}</span>
              <span v-else class="text-muted">长期</span>
            </template>
          </el-table-column>
          <el-table-column label="扫描件" width="80" align="center">
            <template #default="{ row }">
              <span v-if="row.fileId">已存</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="120" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openDocEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteDoc(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="docQuery.page"
          :page-size="docQuery.size"
          :total="docTotal"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="load"
        />
      </el-tab-pane>

      <!-- 家庭资产 -->
      <el-tab-pane label="家庭资产" name="assets">
        <div class="summary-cards" v-if="summary">
          <el-card shadow="never" class="summary-card">
            <div class="summary-label">总估值</div>
            <div class="summary-value">¥{{ summary.totalValue }}</div>
          </el-card>
          <el-card v-for="s in summary.slices" :key="s.assetType" shadow="never" class="summary-card">
            <div class="summary-label">{{ ASSET_TYPES[s.assetType] }}（{{ s.count }}）</div>
            <div class="summary-value">¥{{ s.totalValue }}</div>
          </el-card>
        </div>

        <div class="filter-bar">
          <el-select v-model="assetQuery.assetType" placeholder="资产类型" clearable style="width: 130px">
            <el-option v-for="(label, value) in ASSET_TYPES" :key="value" :label="label" :value="value" />
          </el-select>
          <el-button @click="load">查询</el-button>
        </div>

        <el-table :data="assets" stripe>
          <el-table-column label="名称" min-width="160" prop="name" />
          <el-table-column label="类型" width="90">
            <template #default="{ row }">{{ ASSET_TYPES[row.assetType] || row.assetType }}</template>
          </el-table-column>
          <el-table-column label="持有人" width="100">
            <template #default="{ row }">{{ row.holderMemberName || '家庭共有' }}</template>
          </el-table-column>
          <el-table-column label="当前估值" width="130">
            <template #default="{ row }">
              <span v-if="row.currentValue != null">¥{{ row.currentValue }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="估值时间" width="110">
            <template #default="{ row }">
              <span v-if="row.valuedAt">{{ row.valuedAt.slice(0, 10) }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="下次年检" width="110">
            <template #default="{ row }">
              <span v-if="row.nextInspectDate">{{ row.nextInspectDate }}</span>
              <span v-else class="text-muted">—</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" @click="openValuations(row)">估值</el-button>
              <el-button link type="primary" @click="openAssetEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="handleDeleteAsset(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-pagination
          v-model:current-page="assetQuery.page"
          :page-size="assetQuery.size"
          :total="assetTotal"
          layout="total, prev, pager, next"
          class="pager"
          @current-change="load"
        />
      </el-tab-pane>
    </el-tabs>

    <!-- 证件抽屉 -->
    <el-drawer v-model="docDrawer" :title="docDrawerTitle" size="440px">
      <el-form ref="docFormRef" :model="docForm" :rules="docRules" label-width="90px">
        <el-form-item label="证件类型" prop="docType">
          <el-select v-model="docForm.docType">
            <el-option v-for="(label, value) in DOC_TYPES" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="持有人" prop="holderMemberId">
          <el-select v-model="docForm.holderMemberId" placeholder="选择家庭成员">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="号码">
          <el-input v-model="docForm.docNo" maxlength="64" />
        </el-form-item>
        <el-form-item label="发证日期">
          <el-date-picker v-model="docForm.issueDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="有效期至">
          <el-date-picker v-model="docForm.expiryDate" type="date" value-format="YYYY-MM-DD" placeholder="留空 = 长期" />
        </el-form-item>
        <el-form-item label="扫描件">
          <div>
            <el-upload :http-request="uploadScanFile" :show-file-list="false" accept=".pdf,.jpg,.jpeg,.png">
              <el-button size="small">上传 PDF/图片</el-button>
            </el-upload>
            <div v-if="docForm.fileId" class="upload-done">已上传：{{ docForm.fileName || `文件 #${docForm.fileId}` }}</div>
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="docForm.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="docDrawer = false">取消</el-button>
        <el-button type="primary" @click="handleSaveDoc">保存</el-button>
      </template>
    </el-drawer>

    <!-- 资产抽屉 -->
    <el-drawer v-model="assetDrawer" :title="assetDrawerTitle" size="440px">
      <el-form ref="assetFormRef" :model="assetForm" :rules="assetRules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="assetForm.name" maxlength="64" placeholder="如：XX小区房产" />
        </el-form-item>
        <el-form-item label="类型" prop="assetType">
          <el-select v-model="assetForm.assetType">
            <el-option v-for="(label, value) in ASSET_TYPES" :key="value" :label="label" :value="value" />
          </el-select>
        </el-form-item>
        <el-form-item label="持有人">
          <el-select v-model="assetForm.holderMemberId" clearable placeholder="不选 = 家庭共有">
            <el-option v-for="m in members" :key="m.id" :label="m.name" :value="m.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="购置日期">
          <el-date-picker v-model="assetForm.acquireDate" type="date" value-format="YYYY-MM-DD" />
        </el-form-item>
        <el-form-item label="当前估值">
          <el-input-number v-model="assetForm.currentValue" :min="0" :precision="2" :controls="false" style="width: 160px" />
        </el-form-item>
        <el-form-item v-if="assetForm.assetType === 'vehicle'" label="下次年检">
          <el-date-picker v-model="assetForm.nextInspectDate" type="date" value-format="YYYY-MM-DD" placeholder="到期前 15 天提醒" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="assetForm.remark" type="textarea" maxlength="255" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assetDrawer = false">取消</el-button>
        <el-button type="primary" @click="handleSaveAsset">保存</el-button>
      </template>
    </el-drawer>

    <!-- 估值历史 -->
    <el-dialog v-model="valuationDialog" :title="`估值历史 · ${valuationAsset?.name ?? ''}`" width="480px">
      <el-empty v-if="valuations.length === 0" description="还没有估值记录" />
      <template v-else>
        <svg class="trend" viewBox="0 0 400 120" preserveAspectRatio="none">
          <polyline
            :points="trendPoints"
            fill="none"
            stroke="var(--el-color-primary)"
            stroke-width="2"
          />
        </svg>
        <el-table :data="valuations" size="small" stripe>
          <el-table-column label="估值时点" width="170">
            <template #default="{ row }">{{ row.valuedAt.slice(0, 16) }}</template>
          </el-table-column>
          <el-table-column label="估值">
            <template #default="{ row }">¥{{ row.value }}</template>
          </el-table-column>
        </el-table>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.filter-bar {
  display: flex;
  gap: 10px;
  margin-bottom: 14px;
}

.mono {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 13px;
}

.expired {
  color: var(--el-color-danger);
  font-weight: 600;
}

.expiring {
  color: var(--el-color-warning);
  font-weight: 600;
}

.text-muted {
  color: #c9cdd4;
}

.pager {
  margin-top: 14px;
  justify-content: flex-end;
}

.summary-cards {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.summary-card {
  min-width: 160px;
}

.summary-label {
  font-size: 13px;
  color: #86909c;
}

.summary-value {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin-top: 4px;
}

.upload-done {
  font-size: 12px;
  color: #86909c;
  margin-top: 6px;
}

.trend {
  width: 100%;
  height: 120px;
  margin-bottom: 12px;
  border: 1px solid var(--panel-border);
  background: #fff;
}
</style>
