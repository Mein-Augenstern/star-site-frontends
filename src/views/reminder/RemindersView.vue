<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { completeOccurrence, dismissOccurrence, listNotifications, listUpcoming, markRead } from '@/api/reminder'
import type { NotificationVO, OccurrenceVO } from '@/types/api'

const activeTab = ref('upcoming')

const upcoming = ref<OccurrenceVO[]>([])
const notifications = ref<NotificationVO[]>([])
const loading = ref(false)

// 简单过滤
const filter = reactive({ showDone: false })

const filteredUpcoming = computed(() =>
  upcoming.value.filter((o) => filter.showDone || o.status === 1 || o.status === 2),
)

const STATUS: Record<number, string> = { 1: '待提醒', 2: '已通知', 3: '已完成', 4: '已忽略' }
const STATUS_TYPES: Record<number, string> = { 1: 'warning', 2: 'primary', 3: 'success', 4: 'info' }

onMounted(load)

async function load() {
  loading.value = true
  try {
    upcoming.value = await listUpcoming(60)
    notifications.value = await listNotifications({ page: 1, size: 20 })
  } finally {
    loading.value = false
  }
}

async function handleDone(o: OccurrenceVO) {
  await completeOccurrence(o.id)
  ElMessage.success('已完成')
  await load()
}

async function handleDismiss(o: OccurrenceVO) {
  await dismissOccurrence(o.id)
  await load()
}

async function handleRead(n: NotificationVO) {
  if (n.readFlag === 0) {
    await markRead(n.id)
    n.readFlag = 1
  }
}

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
    <PageHeader title="提醒中心" description="缴费、到期、体检复检……全家要办的事都在这里" />

    <el-tabs v-model="activeTab">
      <el-tab-pane label="要办的事" name="upcoming">
        <div class="filter-bar">
          <el-checkbox v-model="filter.showDone">显示已完成/已忽略</el-checkbox>
        </div>

        <el-empty v-if="filteredUpcoming.length === 0" description="最近 60 天没有要办的事" />

        <div v-else class="occur-list">
          <div v-for="o in filteredUpcoming" :key="o.id" class="occur-item">
            <div class="occur-date" :class="{ overdue: new Date(o.dueDate) < new Date() && o.status !== 3 && o.status !== 4 }">
              <div class="date-label">{{ dueLabel(o.dueDate) }}</div>
              <div class="date-value">{{ o.dueDate }}</div>
            </div>
            <div class="occur-body">
              <div class="occur-title">
                {{ o.title }}
                <el-tag size="small" :type="STATUS_TYPES[o.status]" effect="plain">{{ STATUS[o.status] }}</el-tag>
              </div>
              <div class="occur-sub">{{ o.source }}</div>
            </div>
            <div v-if="o.status === 1 || o.status === 2" class="occur-actions">
              <el-button size="small" type="primary" plain @click="handleDone(o)">办完</el-button>
              <el-button size="small" plain @click="handleDismiss(o)">忽略</el-button>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <el-tab-pane label="通知记录" name="notifications">
        <el-empty v-if="notifications.length === 0" description="暂无通知" />
        <div v-else class="noti-list">
          <div
            v-for="n in notifications"
            :key="n.id"
            class="noti-item"
            :class="{ unread: n.readFlag === 0 }"
            @click="handleRead(n)"
          >
            <span class="noti-dot" v-if="n.readFlag === 0"></span>
            <span class="noti-title">{{ n.title }}</span>
            <span class="noti-time">{{ n.createdAt }}</span>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<style scoped>
.filter-bar {
  margin-bottom: 12px;
}

.occur-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.occur-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: #fff;
  border: 1px solid var(--panel-border);
}

.occur-date {
  min-width: 96px;
  text-align: center;
  padding: 6px 8px;
  background: var(--el-color-primary-light-9);
  border-radius: 4px;
}

.occur-date.overdue {
  background: var(--el-color-danger-light-9);
}

.date-label {
  font-size: 13px;
  font-weight: 600;
  color: var(--el-color-primary);
}

.occur-date.overdue .date-label {
  color: var(--el-color-danger);
}

.date-value {
  font-size: 12px;
  color: #86909c;
  margin-top: 2px;
}

.occur-body {
  flex: 1;
}

.occur-title {
  font-size: 14px;
  color: #1d2129;
  display: flex;
  align-items: center;
  gap: 8px;
}

.occur-sub {
  font-size: 12px;
  color: #86909c;
  margin-top: 4px;
}

.occur-actions {
  display: flex;
  gap: 8px;
}

.noti-list {
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--panel-border);
}

.noti-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--panel-border);
  cursor: pointer;
}

.noti-item:last-child {
  border-bottom: none;
}

.noti-item.unread .noti-title {
  font-weight: 600;
}

.noti-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--el-color-danger);
  flex-shrink: 0;
}

.noti-title {
  flex: 1;
  font-size: 14px;
  color: #1d2129;
}

.noti-time {
  font-size: 12px;
  color: #86909c;
}
</style>
