<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listRecheckPlans, closeRecheckPlan, cancelRecheckPlan, PLAN_STATUS } from '@/api/recheck'
import { listFamilyMembers } from '@/api'
import { listReports } from '@/api/health'
import type { RecheckPlan } from '@/api/recheck'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const TABS = [
  { status: PLAN_STATUS.ACTIVE, label: '进行中' },
  { status: PLAN_STATUS.CLOSED, label: '已闭环' },
  { status: PLAN_STATUS.CANCELLED, label: '已取消' },
]
const status = ref(1)
const plans = ref<RecheckPlan[]>([])
const members = ref<FamilyMemberVO[]>([])
const loading = ref(true)

onShow(async () => {
  if (!getToken()) { uni.reLaunch({ url: '/pages/login/login' }); return }
  if (!members.value.length) {
    members.value = await listFamilyMembers().catch(() => [])
  }
  await refresh()
})

onPullDownRefresh(async () => { await refresh(); uni.stopPullDownRefresh() })

async function refresh() {
  loading.value = true
  try {
    plans.value = await listRecheckPlans({ status: status.value })
  } finally {
    loading.value = false
  }
}

function switchTab(s: number) {
  status.value = s
  refresh()
}

function memberName(id: number) {
  return members.value.find((m) => m.id === id)?.name ?? '成员'
}

function daysText(p: RecheckPlan) {
  if (status.value !== 1) return p.targetDate
  const d = p.daysLeft
  if (d == null) return p.targetDate
  if (d === 0) return '今天到期'
  if (d === 1) return '明天到期'
  return d > 1 ? `${d} 天后复查` : `逾期 ${-d} 天`
}

/** 闭环：选该成员最近的一份复查报告 */
function closeFlow(p: RecheckPlan) {
  listReports({ familyMemberId: p.familyMemberId, page: 1, size: 6 }).then((page) => {
    const reports = page.records
    if (!reports.length) {
      uni.showToast({ title: '先给该成员拍一份复查报告', icon: 'none' })
      return
    }
    uni.showActionSheet({
      itemList: reports.map((r) => `${r.title}（${r.checkupDate || r.reportYear + '年'}）`).slice(0, 6),
      success: async (res) => {
        const report = reports[res.tapIndex]
        const confirmed = await new Promise<boolean>((resolve) => {
          uni.showModal({
            title: '确认闭环',
            content: `用「${report.title}」与基线对比，闭环「${p.itemName}」复查？`,
            success: (m) => resolve(!!m.confirm),
            fail: () => resolve(false),
          })
        })
        if (!confirmed) return
        const closed = await closeRecheckPlan(p.id, report.id)
        uni.showToast({ title: '已闭环', icon: 'success' })
        if (closed.conclusion) {
          setTimeout(() => uni.showModal({ title: '复查结论', content: closed.conclusion!, showCancel: false }), 400)
        }
        refresh()
      },
    })
  }).catch(() => {})
}

function cancelFlow(p: RecheckPlan) {
  uni.showModal({
    title: '取消复查计划',
    content: `取消「${memberName(p.familyMemberId)} · ${p.itemName}」的复查安排？关联提醒与每日监测会一并撤销。`,
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return
      await cancelRecheckPlan(p.id)
      uni.showToast({ title: '已取消', icon: 'success' })
      refresh()
    },
  })
}

function goForm(p: RecheckPlan) {
  // 到期直达拍新报告（闭环回到起点）
  uni.navigateTo({ url: `/pages/report-form/report-form?familyMemberId=${p.familyMemberId}` })
}
</script>

<template>
  <view class="page">
    <view class="tabs">
      <view
        v-for="t in TABS"
        :key="t.status"
        class="tab"
        :class="{ on: status === t.status }"
        @click="switchTab(t.status)"
      >{{ t.label }}</view>
    </view>

    <view v-if="!loading && !plans.length" class="empty">
      <view class="empty-t">{{ status === 1 ? '暂无进行中的复查' : '这里还没有记录' }}</view>
      <view class="empty-s">在报告详情里点异常指标旁的「复查」，即可安排复查并挂上提醒</view>
    </view>

    <view v-for="p in plans" :key="p.id" class="card">
      <view class="card-top">
        <view class="p-title">{{ memberName(p.familyMemberId) }} · {{ p.itemName }}</view>
        <view class="p-days" :class="{ overdue: status === 1 && (p.daysLeft ?? 1) < 0 }">{{ daysText(p) }}</view>
      </view>
      <view class="p-baseline">
        基线 {{ p.baselineText || '—' }}<text v-if="p.refRange">（参考 {{ p.refRange }}）</text>
        <text v-if="p.metricType"> · 每日监测中</text>
      </view>
      <view v-if="p.sourceReportTitle" class="p-src">来自「{{ p.sourceReportTitle }}」</view>
      <view v-if="p.conclusion" class="p-conclusion">{{ p.conclusion }}</view>

      <view v-if="status === 1" class="p-actions">
        <view class="act ghost" @click="goForm(p)">拍复查报告</view>
        <view class="act ghost" @click="closeFlow(p)">关联新报告闭环</view>
        <view class="act danger" @click="cancelFlow(p)">取消</view>
      </view>
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f4f5f7; padding: 20rpx 0 60rpx; }
.tabs { display: flex; gap: 14rpx; padding: 0 32rpx 20rpx; }
.tab { font-size: 26rpx; color: #5c6470; background: #fff; border: 1rpx solid #e7eaee; border-radius: 999rpx; padding: 12rpx 36rpx; }
.tab.on { color: #07c160; border-color: #07c160; background: rgba(7, 193, 96, 0.06); font-weight: 600; }
.card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 26rpx 30rpx; margin: 0 32rpx 20rpx; }
.card-top { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.p-title { flex: 1; font-size: 29rpx; font-weight: 600; color: #16233a; }
.p-days { font-size: 23rpx; font-weight: 600; color: #07c160; background: rgba(7, 193, 96, 0.09); border-radius: 10rpx; padding: 8rpx 18rpx; flex-shrink: 0; }
.p-days.overdue { color: #fa5151; background: rgba(250, 81, 81, 0.08); }
.p-baseline { font-size: 25rpx; color: #4e5969; margin-top: 14rpx; }
.p-src { font-size: 22rpx; color: #a2a8b0; margin-top: 8rpx; }
.p-conclusion { font-size: 25rpx; color: #16233a; background: #f6f8fa; border-radius: 12rpx; padding: 16rpx 20rpx; margin-top: 16rpx; line-height: 1.6; }
.p-actions { display: flex; gap: 16rpx; margin-top: 22rpx; }
.act { font-size: 24rpx; border-radius: 999rpx; padding: 12rpx 28rpx; }
.act.ghost { color: #07c160; border: 1rpx solid #07c160; background: rgba(7, 193, 96, 0.05); }
.act.danger { color: #fa5151; border: 1rpx solid rgba(250, 81, 81, 0.55); background: rgba(250, 81, 81, 0.04); }
.empty { text-align: center; padding: 140rpx 60rpx 0; }
.empty-t { font-size: 30rpx; color: #16233a; font-weight: 600; }
.empty-s { font-size: 24rpx; color: #a2a8b0; margin-top: 14rpx; line-height: 1.7; }
</style>
