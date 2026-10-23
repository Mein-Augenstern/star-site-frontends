<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { listMembers } from '@/api/family'
import { preview } from '@/api/file'
import { deleteReport, getReport, interpretReport, saveIndicators } from '@/api/health'
import type { FamilyMember, HealthReport, IndicatorDTO } from '@/types/api'

const route = useRoute()
const router = useRouter()

const report = ref<HealthReport | null>(null)
const members = ref<FamilyMember[]>([])
const loading = ref(false)

// 指标录入
const dialog = ref(false)
const saving = ref(false)
const rows = ref<IndicatorDTO[]>([])

onMounted(load)

/* ===== AI 解读 ===== */
const aiText = ref('')
const aiTime = ref('')
const aiLoading = ref(false)
const aiError = ref('')

async function runAi(force = false) {
  if (!route.params.id) return
  aiLoading.value = true
  aiError.value = ''
  try {
    const r = await interpretReport(Number(route.params.id), force)
    aiText.value = r.text
    aiTime.value = r.interpretedAt ?? ''
  } catch (e: any) {
    aiError.value = e?.message ?? 'AI 解读失败'
  } finally {
    aiLoading.value = false
  }
}

async function load() {
  loading.value = true
  try {
    report.value = await getReport(Number(route.params.id))
    members.value = await listMembers()
    if (report.value.indicators && report.value.indicators.length > 0) {
      rows.value = report.value.indicators.map((i) => ({
        itemName: i.itemName,
        itemGroup: i.itemGroup || undefined,
        valueNum: i.valueNum,
        valueText: i.valueText ?? undefined,
        unit: i.unit || undefined,
        refLow: i.refLow,
        refHigh: i.refHigh,
      }))
    }
  } finally {
    loading.value = false
  }
}

function openIndicators() {
  if (rows.value.length === 0) {
    rows.value = [{ itemName: '' }]
  }
  dialog.value = true
}

function addRow() {
  rows.value.push({ itemName: '' })
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

async function handleSaveIndicators() {
  const valid = rows.value.filter((r) => r.itemName.trim())
  if (valid.length === 0) {
    ElMessage.warning('至少填写一行有效的指标名')
    return
  }
  saving.value = true
  try {
    await saveIndicators(report.value!.id, valid)
    ElMessage.success('指标已保存')
    dialog.value = false
    await load()
  } finally {
    saving.value = false
  }
}

async function handleDelete() {
  await ElMessageBox.confirm('确定删除这份报告？', '删除确认', { type: 'warning' })
  await deleteReport(report.value!.id)
  ElMessage.success('已删除')
  router.push('/reports')
}

function memberName(id: number) {
  return members.value.find((m) => m.id === id)?.name ?? `成员#${id}`
}

function abnormalTag(flag: number) {
  if (flag === 1) return { type: 'danger' as const, text: '偏高' }
  if (flag === 2) return { type: 'warning' as const, text: '偏低' }
  return { type: 'success' as const, text: '正常' }
}

function rowClass({ row }: { row: { abnormalFlag: number } }) {
  return row.abnormalFlag > 0 ? 'abnormal-row' : ''
}
</script>

<template>
  <div v-loading="loading">
    <template v-if="report">
      <el-breadcrumb separator="/" class="breadcrumb">
        <el-breadcrumb-item :to="{ path: '/reports' }">体检报告</el-breadcrumb-item>
        <el-breadcrumb-item>报告详情</el-breadcrumb-item>
      </el-breadcrumb>

      <div class="head-bar">
        <h2 class="title">{{ report.title }}</h2>
        <div style="flex: 1"></div>
        <el-button v-if="report.fileId" @click="preview(report.fileId)">查看报告文件</el-button>
        <el-button type="primary" @click="openIndicators">
          {{ report.indicators && report.indicators.length > 0 ? '重新录入指标' : '录入指标' }}
        </el-button>
        <el-button type="danger" plain @click="handleDelete">删除</el-button>
      </div>

      <el-descriptions :column="3" border class="meta">
        <el-descriptions-item label="成员">{{ memberName(report.familyMemberId) }}</el-descriptions-item>
        <el-descriptions-item label="年份">{{ report.reportYear }} 年</el-descriptions-item>
        <el-descriptions-item label="体检日期">{{ report.checkupDate || '—' }}</el-descriptions-item>
        <el-descriptions-item label="医院">{{ report.hospital || '—' }}</el-descriptions-item>
        <el-descriptions-item label="登记时间">{{ report.createdAt?.slice(0, 10) }}</el-descriptions-item>
        <el-descriptions-item label="指标数">{{ report.indicators?.length ?? 0 }}</el-descriptions-item>
      </el-descriptions>

      <p v-if="report.summary" class="summary">{{ report.summary }}</p>

      <el-card shadow="never">
        <template #header>体检指标（{{ report.indicators?.length ?? 0 }}）</template>
        <el-empty v-if="!report.indicators || report.indicators.length === 0" description="还没有录入指标" />
        <el-table v-else :data="report.indicators" :row-class-name="rowClass" stripe>
          <el-table-column prop="itemGroup" label="分组" width="110" />
          <el-table-column prop="itemName" label="指标" min-width="150" />
          <el-table-column label="结果" width="120">
            <template #default="{ row }">{{ row.valueNum ?? row.valueText ?? '—' }}</template>
          </el-table-column>
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column label="参考范围" width="150">
            <template #default="{ row }">
              {{ row.refLow ?? '—' }} ~ {{ row.refHigh ?? '—' }}
            </template>
          </el-table-column>
          <el-table-column label="判断" width="90">
            <template #default="{ row }">
              <el-tag :type="abnormalTag(row.abnormalFlag).type" size="small">
                {{ abnormalTag(row.abnormalFlag).text }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 指标录入 -->
    <el-dialog v-model="dialog" title="录入指标（保存为覆盖式）" width="860px" top="6vh">
      <el-alert type="info" :closable="false" style="margin-bottom: 10px"
        title="填写数值和参考上下限后，系统自动判断偏高/偏低；文本型结果（如 阴性）填在文本列" />
      <el-table :data="rows" size="small" max-height="420">
        <el-table-column label="分组" width="110">
          <template #default="{ row }"><el-input v-model="row.itemGroup" placeholder="血常规" size="small" /></template>
        </el-table-column>
        <el-table-column label="指标名 *" min-width="140">
          <template #default="{ row }"><el-input v-model="row.itemName" placeholder="空腹血糖" size="small" /></template>
        </el-table-column>
        <el-table-column label="数值" width="110">
          <template #default="{ row }"><el-input-number v-model="row.valueNum" :controls="false" size="small" style="width: 100%" /></template>
        </el-table-column>
        <el-table-column label="单位" width="80">
          <template #default="{ row }"><el-input v-model="row.unit" placeholder="mmol/L" size="small" /></template>
        </el-table-column>
        <el-table-column label="参考下限" width="110">
          <template #default="{ row }"><el-input-number v-model="row.refLow" :controls="false" size="small" style="width: 100%" /></template>
        </el-table-column>
        <el-table-column label="参考上限" width="110">
          <template #default="{ row }"><el-input-number v-model="row.refHigh" :controls="false" size="small" style="width: 100%" /></template>
        </el-table-column>
        <el-table-column label="文本结果" width="100">
          <template #default="{ row }"><el-input v-model="row.valueText" placeholder="阴性" size="small" /></template>
        </el-table-column>
        <el-table-column label="" width="60">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="removeRow($index)">删</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-button plain style="margin-top: 8px" @click="addRow">+ 加一行</el-button>
      <template #footer>
        <el-button @click="dialog = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="handleSaveIndicators">保存指标</el-button>
      </template>
    </el-dialog>
  <!-- AI 解读 -->
  <el-card shadow="never" class="ai-card">
    <template #header>
      <div class="ai-head">
        <span>AI 解读</span>
        <div>
          <el-button size="small" type="primary" :loading="aiLoading" @click="runAi(false)">
            {{ aiText ? '重新解读' : 'AI 解读' }}
          </el-button>
          <el-button v-if="aiText" size="small" :loading="aiLoading" @click="runAi(true)">换个说法</el-button>
        </div>
      </div>
    </template>
    <el-alert v-if="aiError" type="warning" :title="aiError" :closable="false" />
    <div v-if="aiLoading" class="ai-loading">AI 正在阅读报告……</div>
    <p v-if="aiText" class="ai-text">{{ aiText }}</p>
    <p v-if="aiTime" class="ai-time">解读时间 {{ aiTime.replace('T', ' ').slice(0, 16) }} · 仅供参考，不构成医疗诊断</p>
  </el-card>
  </div>
</template>

<style scoped>
.breadcrumb {
  margin-bottom: 12px;
}

.head-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.title {
  margin: 0;
  font-size: 18px;
}

.meta {
  margin-bottom: 14px;
}

.summary {
  color: #606266;
  background: #f5f7fa;
  padding: 10px 14px;
  border-radius: 6px;
  margin: 0 0 14px;
}

:deep(.abnormal-row) {
  --el-table-tr-bg-color: #fef0f0;
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

.ai-time {
  color: #86909c;
  font-size: 12px;
  margin-bottom: 0;
}

.ai-loading {
  color: #86909c;
  font-size: 13px;
}
</style>
