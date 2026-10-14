<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listUpcoming, listFamilyMembers, refreshMemberCache, cachedMember, doneOccurrence } from '@/api'
import { listReports } from '@/api/health'
import { listRecheckPlans, PLAN_STATUS } from '@/api/recheck'
import type { RecheckPlan } from '@/api/recheck'
import type { OccurrenceVO, FamilyMemberVO, MemberVO } from '@/types/api'
import { getToken } from '@/utils/request'
import { silentWxLogin } from '@/utils/auth'

const member = ref<MemberVO | null>(null)
const reportCount = ref(0)
const activePlans = ref<RecheckPlan[]>([])
const todos = ref<OccurrenceVO[]>([])
const recentReports = ref<{ id: number; title: string; meta: string }[]>([])
const members = ref<FamilyMemberVO[]>([])
const loading = ref(true)

onShow(async () => {
  if (getToken()) {
    refresh()
    return
  }
  const ok = await silentWxLogin()
  if (ok) refresh()
  else uni.reLaunch({ url: '/pages/login/login' })
})

onPullDownRefresh(async () => { await refresh(); uni.stopPullDownRefresh() })

async function refresh() {
  loading.value = true
  try {
    member.value = cachedMember()
    refreshMemberCache().then((m) => (member.value = m)).catch(() => {})
    listFamilyMembers().then((ms) => (members.value = ms)).catch(() => {})
    const [reports, plans, up] = await Promise.all([
      listReports({ page: 1, size: 3 }),
      listRecheckPlans({ status: PLAN_STATUS.ACTIVE }).catch(() => [] as RecheckPlan[]),
      listUpcoming(30).catch(() => [] as OccurrenceVO[]),
    ])
    reportCount.value = reports.total
    recentReports.value = reports.records.map((r) => ({
      id: r.id,
      title: r.title,
      meta: `${r.checkupDate || r.reportYear + ' 年'}${r.hospital ? ' · ' + r.hospital : ''}`,
    }))
    activePlans.value = plans
      .filter((p) => p.daysLeft == null || p.daysLeft > -30)
      .sort((a, b) => (a.daysLeft ?? 999) - (b.daysLeft ?? 999))
    todos.value = up
  } finally {
    loading.value = false
  }
}

function go(url: string) { uni.navigateTo({ url }) }

function shootReport() { go('/pages/report-form/report-form') }

function memberName(id: number) {
  return members.value.find((m) => m.id === id)?.name ?? '成员'
}

function daysLabel(p: RecheckPlan) {
  const d = p.daysLeft
  if (d == null) return ''
  if (d === 0) return '今天到期'
  if (d === 1) return '明天到期'
  return d > 1 ? `${d} 天后复查` : `逾期 ${-d} 天`
}

function dueLabel(due: string) {
  const diff = Math.ceil((new Date(due).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  return diff > 1 ? `${diff} 天后` : `逾期 ${-diff} 天`
}

async function onTodo(o: OccurrenceVO) {
  // 每日监测/复查类待办：点击即打卡完成（监测类也可去报告页继续操作）
  try {
    await doneOccurrence(o.id)
    todos.value = todos.value.filter((t) => t.id !== o.id)
    uni.showToast({ title: '已完成', icon: 'success' })
  } catch { /* toast 已弹 */ }
}
</script>

<template>
  <view class="page">
    <!-- 矛场景置顶（A2）：一句话定位 + 录报告主入口 -->
    <view class="hero-wrap">
      <view class="hero-inner">
        <view class="slogan">爸妈的体检报告，拍进来就看懂</view>
        <view class="slogan-sub">AI 提取指标 · 异常标红 · 一键安排复查</view>
        <view class="hero-actions">
          <view class="shoot-btn" hover-class="shoot-btn_hover" @click="shootReport">拍 报 告</view>
          <view class="hero-sub-actions">
            <view class="sub-action" hover-class="sub-action_hover" @click="go('/pages/reports/reports')">全部报告</view>
            <view class="sub-action" hover-class="sub-action_hover" @click="go('/pages/recheck/recheck')">复查计划</view>
          </view>
        </view>
      </view>
      <view class="hero-curve"></view>
    </view>

    <!-- 统计 -->
    <view class="quick-grid">
      <view class="quick-card" hover-class="hover" @click="go('/pages/reports/reports')">
        <view class="quick-num">{{ reportCount }}</view>
        <view class="quick-label">全家报告</view>
      </view>
      <view class="quick-card" hover-class="hover" @click="go('/pages/recheck/recheck')">
        <view class="quick-num">{{ activePlans.length }}</view>
        <view class="quick-label">复查进行中</view>
      </view>
    </view>

    <!-- 复查闭环：进行中的计划（回访钩子置顶于动态流） -->
    <view class="card">
      <view class="card-head">
        <view class="card-head-t">进行中的复查</view>
        <view class="card-head-more" @click="go('/pages/recheck/recheck')">全部 ›</view>
      </view>
      <view v-if="!activePlans.length" class="empty-s">报告里发现异常指标后，可在这里安排复查</view>
      <view
        v-for="p in activePlans.slice(0, 3)"
        :key="p.id"
        class="row"
        hover-class="row_hover"
        @click="go('/pages/recheck/recheck')"
      >
        <view class="due-badge" :class="{ overdue: (p.daysLeft ?? 1) < 0 }">{{ daysLabel(p) }}</view>
        <view class="row-main">
          <view class="row-title">{{ memberName(p.familyMemberId) }} · {{ p.itemName }}</view>
          <view class="row-sub">基线 {{ p.baselineText || '—' }}<text v-if="p.refRange">（{{ p.refRange }}）</text></view>
        </view>
      </view>
    </view>

    <!-- 最近要办的事（每日监测打卡/复查提醒） -->
    <view class="card">
      <view class="card-head"><view class="card-head-t">最近要办的事</view></view>
      <view v-if="!todos.length" class="empty-s">暂无待办，挂上监测计划后会在这里打卡</view>
      <view v-for="o in todos.slice(0, 4)" :key="o.id" class="row" hover-class="row_hover" @click="onTodo(o)">
        <view class="due-badge">{{ dueLabel(o.dueDate) }}</view>
        <view class="row-main">
          <view class="row-title">{{ o.title }}</view>
        </view>
        <view class="row-act">打卡</view>
      </view>
    </view>

    <!-- 最近报告 -->
    <view class="card">
      <view class="card-head">
        <view class="card-head-t">最近报告</view>
        <view class="card-head-more" @click="go('/pages/reports/reports')">全部 ›</view>
      </view>
      <view v-if="!recentReports.length" class="empty-s">还没有报告，点上方「拍报告」录入第一份</view>
      <view
        v-for="r in recentReports"
        :key="r.id"
        class="row"
        hover-class="row_hover"
        @click="go(`/pages/report-detail/detail?id=${r.id}`)"
      >
        <view class="row-main">
          <view class="row-title">{{ r.title }}</view>
          <view class="row-sub">{{ r.meta }}</view>
        </view>
        <view class="arrow">›</view>
      </view>
    </view>

    <view class="footer-slogan">报告看得懂 · 异常跑不掉</view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f4f5f7; padding: 0 0 48rpx; }
.hero-wrap { background: linear-gradient(180deg, #7ddba4 0%, #52cf8e 88%); padding: 40rpx 32rpx 0; }
.hero-curve { height: 36rpx; background: #f4f5f7; border-radius: 36rpx 36rpx 0 0; margin: 0 -32rpx; }
.slogan { font-size: 40rpx; font-weight: 700; color: #ffffff; letter-spacing: 2rpx; }
.slogan-sub { font-size: 24rpx; color: rgba(255, 255, 255, 0.85); margin-top: 12rpx; }
.hero-actions { display: flex; align-items: center; gap: 24rpx; padding: 32rpx 0 30rpx; }
.shoot-btn { background: #ffffff; color: #07c160; font-size: 32rpx; font-weight: 700; border-radius: 999rpx; padding: 24rpx 72rpx; letter-spacing: 4rpx; }
.shoot-btn_hover { opacity: 0.88; }
.hero-sub-actions { display: flex; flex-direction: column; gap: 14rpx; }
.sub-action { font-size: 25rpx; color: #ffffff; background: rgba(255, 255, 255, 0.18); border: 1rpx solid rgba(255, 255, 255, 0.55); border-radius: 999rpx; padding: 10rpx 28rpx; }
.sub-action_hover { opacity: 0.8; }
.quick-grid { display: flex; gap: 16rpx; margin: 20rpx 32rpx 16rpx; }
.quick-card { flex: 1; background: #fff; border: 1rpx solid #eceef2; border-radius: 20rpx; padding: 28rpx 0 24rpx; text-align: center; }
.quick-num { font-size: 52rpx; font-weight: 700; color: #07c160; line-height: 1.1; }
.quick-label { font-size: 23rpx; color: #8a9099; margin-top: 8rpx; }
.hover { background: #fafbfc; }
.card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 8rpx 26rpx; margin: 0 32rpx 24rpx; }
.card-head { display: flex; align-items: center; justify-content: space-between; padding: 18rpx 0 6rpx; }
.card-head-t { font-size: 26rpx; color: #5c6470; font-weight: 600; }
.card-head-more { font-size: 23rpx; color: #98a0ab; }
.row { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #f2f4f6; }
.row:last-child { border-bottom: none; }
.row_hover { background: #fafbfc; }
.row-main { flex: 1; min-width: 0; }
.row-title { font-size: 27rpx; color: #16233a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-sub { font-size: 22rpx; color: #8a9099; margin-top: 6rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.row-act { font-size: 23rpx; color: #07c160; font-weight: 600; background: rgba(7, 193, 96, 0.09); border-radius: 999rpx; padding: 8rpx 24rpx; margin-left: 16rpx; flex-shrink: 0; }
.arrow { color: #c8c9cc; font-size: 32rpx; margin-left: 12rpx; flex-shrink: 0; }
.due-badge { min-width: 118rpx; text-align: center; font-size: 22rpx; font-weight: 600; color: #07c160; background: rgba(7, 193, 96, 0.09); border-radius: 10rpx; padding: 10rpx 8rpx; margin-right: 18rpx; flex-shrink: 0; }
.due-badge.overdue { color: #fa5151; background: rgba(250, 81, 81, 0.08); }
.empty-s { text-align: center; color: #a2a8b0; font-size: 25rpx; padding: 36rpx 0; }
.footer-slogan { text-align: center; font-size: 22rpx; color: #c3c8cf; padding: 16rpx 0 8rpx; }
</style>
