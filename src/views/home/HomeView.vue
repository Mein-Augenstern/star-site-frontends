<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { listUpcoming } from '@/api/reminder'
import { getCoverageMap } from '@/api/insurance'
import { getAssetSummary } from '@/api/archive'
import { getIncomeExpense } from '@/api/finance'
import { getMyFamily, listMembers } from '@/api/family'
import type { AssetSummary, CoverageMap, Family, FamilyMember, IncomeExpense, OccurrenceVO } from '@/types/api'

const router = useRouter()
const userStore = useUserStore()

const loading = ref(true)
const family = ref<Family | null>(null)
const members = ref<FamilyMember[]>([])
const upcoming = ref<OccurrenceVO[]>([])
const coverage = ref<CoverageMap | null>(null)
const assets = ref<AssetSummary | null>(null)
const monthly = ref<IncomeExpense | null>(null)

const ENTRIES = [
  { path: '/reports', title: '体检报告', desc: '全家报告与历年指标' },
  { path: '/insurance', title: '保单管理', desc: '保障地图与缴费提醒' },
  { path: '/archive', title: '证件资产', desc: '证件夹与家庭资产台账' },
  { path: '/family', title: '家庭成员', desc: '成员档案维护' },
]

onMounted(async () => {
  try {
    const [up, cov, sum, fam, ie] = await Promise.all([
      listUpcoming(30),
      getCoverageMap(),
      getAssetSummary(),
      getMyFamily(),
      getIncomeExpense(new Date().getFullYear(), new Date().getMonth() + 1),
    ])
    upcoming.value = up
    coverage.value = cov
    assets.value = sum
    family.value = fam
    monthly.value = ie
    if (fam) {
      members.value = await listMembers()
    }
  } finally {
    loading.value = false
  }
})

function dueLabel(dueDate: string) {
  const diff = Math.ceil((new Date(dueDate).getTime() - new Date().setHours(0, 0, 0, 0)) / 86_400_000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  if (diff > 1) return `${diff} 天后`
  return `逾期 ${-diff} 天`
}
</script>

<template>
  <div v-loading="loading">
    <div class="welcome">
      <div>
        <h2 class="hello">
          {{ userStore.member?.nickname || userStore.member?.username }}，{{ family ? `这是「${family.name}」的家庭面板` : '先去创建你的家庭吧' }}
        </h2>
        <p class="hello-sub" v-if="family">共 {{ members.length }} 位成员 · {{ coverage?.activePolicyCount ?? 0 }} 份有效保单</p>
      </div>
      <el-button v-if="!family" type="primary" @click="router.push('/family')">创建家庭</el-button>
    </div>

    <!-- 最近要办的事 -->
    <el-card shadow="never" class="block">
      <template #header>
        <div class="block-head">
          <span>最近 30 天要办的事</span>
          <el-button link type="primary" @click="router.push('/reminders')">提醒中心 →</el-button>
        </div>
      </template>
      <el-empty v-if="upcoming.length === 0" description="最近没有要办的事，很清净" :image-size="72" />
      <div v-else class="todo-list">
        <div
          v-for="o in upcoming.slice(0, 5)"
          :key="o.id"
          class="todo-item"
          @click="router.push('/reminders')"
        >
          <span class="todo-due" :class="{ overdue: new Date(o.dueDate) < new Date() }">{{ dueLabel(o.dueDate) }}</span>
          <span class="todo-title">{{ o.title }}</span>
          <span class="todo-date">{{ o.dueDate }}</span>
        </div>
        <div v-if="upcoming.length > 5" class="todo-more">还有 {{ upcoming.length - 5 }} 件，去提醒中心查看</div>
      </div>
    </el-card>

    <!-- 数字概览 -->
    <div class="stat-cards">
      <el-card shadow="never" class="stat-card" @click="router.push('/insurance')">
        <div class="stat-label">年缴保费</div>
        <div class="stat-value">¥{{ coverage?.totalAnnualPremium ?? 0 }}</div>
        <div class="stat-sub">{{ coverage?.activePolicyCount ?? 0 }} 份有效保单</div>
      </el-card>
      <el-card shadow="never" class="stat-card" @click="router.push('/archive')">
        <div class="stat-label">家庭资产总估值</div>
        <div class="stat-value">¥{{ assets?.totalValue ?? 0 }}</div>
        <div class="stat-sub">{{ assets?.slices?.length ?? 0 }} 类资产</div>
      </el-card>
      <el-card shadow="never" class="stat-card" @click="router.push('/reports')">
        <div class="stat-label">家庭成员</div>
        <div class="stat-value">{{ members.length }}</div>
        <div class="stat-sub">健康档案随成员建立</div>
      </el-card>
      <el-card shadow="never" class="stat-card" @click="router.push('/finance')">
        <div class="stat-label">本月收支</div>
        <div class="stat-value">¥{{ monthly?.income ?? 0 }} / ¥{{ monthly?.expense ?? 0 }}</div>
        <div class="stat-sub">收入 / 支出 · 点看三张表</div>
      </el-card>
    </div>

    <!-- 快捷入口 -->
    <div class="entry-grid">
      <el-card v-for="e in ENTRIES" :key="e.path" shadow="never" class="entry-card" @click="router.push(e.path)">
        <div class="entry-title">{{ e.title }}</div>
        <div class="entry-desc">{{ e.desc }}</div>
      </el-card>
    </div>
  </div>
</template>

<style scoped>
.welcome {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.hello {
  font-size: 18px;
  font-weight: 600;
  color: #1d2129;
  margin: 0;
}

.hello-sub {
  font-size: 13px;
  color: #86909c;
  margin: 6px 0 0;
}

.block {
  margin-bottom: 16px;
}

.block-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.todo-list {
  display: flex;
  flex-direction: column;
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 4px;
  border-bottom: 1px solid var(--panel-border);
  cursor: pointer;
}

.todo-item:last-of-type {
  border-bottom: none;
}

.todo-due {
  min-width: 64px;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  padding: 3px 8px;
  border-radius: 3px;
}

.todo-due.overdue {
  color: var(--el-color-danger);
  background: var(--el-color-danger-light-9);
}

.todo-title {
  flex: 1;
  font-size: 14px;
  color: #1d2129;
}

.todo-date {
  font-size: 12px;
  color: #86909c;
}

.todo-more {
  padding-top: 10px;
  font-size: 13px;
  color: var(--el-color-primary);
  cursor: pointer;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 16px;
}

.stat-card {
  cursor: pointer;
}

.stat-card:hover {
  border-color: var(--el-color-primary-light-5);
}

.stat-label {
  font-size: 13px;
  color: #86909c;
}

.stat-value {
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
  margin: 8px 0 4px;
}

.stat-sub {
  font-size: 12px;
  color: #86909c;
}

.entry-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.entry-card {
  cursor: pointer;
}

.entry-card:hover {
  border-color: var(--el-color-primary-light-5);
}

.entry-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
}

.entry-desc {
  font-size: 13px;
  color: #86909c;
  margin-top: 6px;
}
</style>
