<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { onMounted, onUnmounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { asyncKill, asyncList, asyncReclaim, asyncRetry, asyncSummary } from '@/api/admin'
import type { AsyncCommand, AsyncSummary } from '@/api/admin'

const summary = ref<AsyncSummary | null>(null)
const records = ref<AsyncCommand[]>([])
const total = ref(0)
const loading = ref(false)
const query = reactive({ status: '', cmdType: '', page: 1, size: 20 })
let timer: number | undefined

const STATUS_TAG: Record<string, string> = {
  PENDING: 'warning',
  RUNNING: 'primary',
  SUCCESS: 'success',
  DEAD: 'danger',
}

const STATS = [
  { key: 'pending', label: '待执行', color: '#e6a23c' },
  { key: 'running', label: '执行中', color: '#409eff' },
  { key: 'success', label: '已成功', color: '#67c23a' },
  { key: 'dead', label: '死信', color: '#f56c6c' },
  { key: 'backlogDue', label: '到期积压', color: '#909399' },
] as const

async function load() {
  loading.value = true
  try {
    summary.value = await asyncSummary()
    const page = await asyncList({
      status: query.status || undefined,
      cmdType: query.cmdType || undefined,
      page: query.page,
      size: query.size,
    })
    records.value = page.records
    total.value = page.total
  } finally {
    loading.value = false
  }
}

function switchStatus(s: string) {
  query.status = query.status === s ? '' : s
  query.page = 1
  load()
}

async function op(row: AsyncCommand, action: 'retry' | 'reclaim' | 'kill', label: string) {
  const tip: Record<string, string> = {
    retry: `重置任务 #${row.id} 为待执行（重试计数清零，立即调度）？`,
    reclaim: `把卡死的 RUNNING 任务 #${row.id} 放回队列重新执行？请确认执行器确已停止。`,
    kill: `终止任务 #${row.id} 并标记死信（不再重试）？`,
  }
  const ok = await ElMessageBox.confirm(tip[action], label, { type: 'warning' }).catch(() => false)
  if (!ok) return
  if (action === 'retry') await asyncRetry(row.id)
  if (action === 'reclaim') await asyncReclaim(row.id)
  if (action === 'kill') await asyncKill(row.id)
  ElMessage.success(`${label}成功`)
  load()
}

onMounted(() => {
  load()
  timer = window.setInterval(load, 30000)
})
onUnmounted(() => window.clearInterval(timer))
</script>

<template>
  <div class="page">
    <PageHeader title="异步任务管控" description="star-async 异步命令运维：监控积压、重试失败、处理卡单">
      <template #actions>
        <el-button @click="load" :loading="loading">刷新</el-button>
      </template>
    </PageHeader>

    <!-- 监控总览 -->
    <el-row :gutter="12" class="stat-row">
      <el-col v-for="s in STATS" :key="s.key" :span="4">
        <div class="stat-card" :class="{ active: query.status === s.key.toUpperCase() }" @click="switchStatus(s.key.toUpperCase())">
          <div class="stat-num" :style="{ color: s.color }">{{ summary?.[s.key] ?? '-' }}</div>
          <div class="stat-label">{{ s.label }}</div>
        </div>
      </el-col>
      <el-col :span="4">
        <div class="stat-card type-card">
          <div class="type-list">
            <el-tag v-for="(n, t) in summary?.byType ?? {}" :key="t" size="small" type="info" class="type-tag">
              {{ t }}: {{ n }}
            </el-tag>
            <span v-if="!summary?.byType || !Object.keys(summary.byType).length" class="stat-label">暂无任务</span>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 筛选 -->
    <el-form inline class="filter-bar">
      <el-form-item label="命令类型">
        <el-input v-model="query.cmdType" placeholder="如 AI_INTERPRET" clearable style="width: 180px" @keyup.enter="query.page = 1; load()" @clear="query.page = 1; load()" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" @click="query.page = 1; load()">查询</el-button>
      </el-form-item>
    </el-form>

    <!-- 任务表 -->
    <el-table :data="records" v-loading="loading" stripe @row-click="(r: AsyncCommand) => switchStatus(r.status)">
      <el-table-column prop="id" label="ID" width="70" />
      <el-table-column prop="cmdType" label="类型" width="150" />
      <el-table-column prop="bizKey" label="业务键" width="160" show-overflow-tooltip />
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag :type="STATUS_TAG[row.status]" size="small">{{ row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="重试" width="70">
        <template #default="{ row }">{{ row.retryCount }}/{{ row.maxRetry }}</template>
      </el-table-column>
      <el-table-column prop="owner" label="提交方" width="130" show-overflow-tooltip />
      <el-table-column prop="nextRunAt" label="下次执行" width="170">
        <template #default="{ row }">{{ row.nextRunAt?.replace('T', ' ').slice(0, 19) ?? '—' }}</template>
      </el-table-column>
      <el-table-column prop="lastError" label="最近错误" show-overflow-tooltip />
      <el-table-column label="操作" width="190" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.status === 'DEAD' || row.status === 'PENDING'"
            size="small" type="primary" link @click.stop="op(row, 'retry', '重试')"
          >重试</el-button>
          <el-button
            v-if="row.status === 'RUNNING'"
            size="small" type="warning" link @click.stop="op(row, 'reclaim', '重占')"
          >重占</el-button>
          <el-button
            v-if="row.status !== 'SUCCESS'"
            size="small" type="danger" link @click.stop="op(row, 'kill', '终止')"
          >终止</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      layout="prev, pager, next, total"
      :total="total"
      :page-size="query.size"
      v-model:current-page="query.page"
      @current-change="load"
    />

    <!-- 载荷查看 -->
    <el-table-column v-if="false" />
  </div>
</template>

<style scoped>
.stat-row {
  margin-bottom: 16px;
}
.stat-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.2s;
}
.stat-card:hover {
  border-color: #409eff;
}
.stat-card.active {
  border-color: #409eff;
  background: #f0f7ff;
}
.stat-num {
  font-size: 28px;
  font-weight: 700;
}
.stat-label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}
.type-card {
  cursor: default;
  text-align: left;
}
.type-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  justify-content: center;
}
.type-tag {
  font-size: 11px;
}
.filter-bar {
  margin-bottom: 8px;
}
.pager {
  margin-top: 12px;
  justify-content: flex-end;
}
</style>
