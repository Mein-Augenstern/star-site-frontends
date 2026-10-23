<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getMyMember } from '@/api/auth'
import { listUpcoming, listFamilyMembers } from '@/api'
import { listReports, listMetrics, searchReports } from '@/api/health'
import type { HealthReport, DailyMetric } from '@/api/health'
import { getToken } from '@/utils/request'
import { silentWxLogin } from '@/utils/auth'
import type { OccurrenceVO, FamilyMemberVO } from '@/types/api'

const member = ref<{ nickname?: string } | null>(null)
const todos = ref<OccurrenceVO[]>([])
const reportCount = ref(0)
const members = ref<FamilyMemberVO[]>([])
const feed = ref<{ time: string; text: string; url?: string }[]>([])
const keyword = ref('')
const searchResults = ref<HealthReport[] | null>(null)
const guest = ref(false)
const guestBarHidden = ref(false)
const loading = ref(true)

const ACTIONS = [
  { icon: 'drop', name: '记血压/血糖', desc: '每日打卡', url: '/pages/metrics/metrics?type=bp' },
  { icon: 'camera', name: '录报告', desc: '拍照识别', url: '/pages/report-form/report-form' },
  { icon: 'heart', name: '孕期助手', desc: '孕周·产检', url: '/pages/pregnancy/pregnancy' },
  { icon: 'bell', name: '提醒中心', desc: '复查待办', url: '/pages/reminder/reminder' },
]
const TOOLS = [
  { icon: 'doc', name: '体检报告', desc: '档案·趋势', url: '/pages/reports/reports' },
  { icon: 'cross', name: '就医记录', desc: '就诊档案', url: '/pages/visits/visits' },
  { icon: 'chart', name: '健康记录', desc: '历史数值', url: '/pages/metrics/metrics' },
]

function relLabel(r: string) {
  const MAP: Record<string, string> = { self: '本人', spouse: '配偶', child: '子女', father: '父亲', mother: '母亲', parent: '父母' }
  return MAP[r] ?? r
}

function ageOf(m: FamilyMemberVO): string {
  if (!m.birthDate) return ''
  const b = new Date(m.birthDate)
  const a = Math.floor((Date.now() - b.getTime()) / 31557600000)
  return a > 0 && a < 120 ? `${a}岁` : ''
}

onShow(async () => {
  if (getToken()) {
    guest.value = false
    refresh()
    return
  }
  // 游客转化：先试静默微信登录（无感），失败才进游客浏览模式（先逛后注册）
  const ok = await silentWxLogin()
  if (ok) {
    guest.value = false
    refresh()
  } else {
    guest.value = true
    guestBarHidden.value = Date.now() < Number(uni.getStorageSync('guest_bar_hidden_until') || 0)
    loading.value = false
  }
})

onPullDownRefresh(async () => { await refresh(); uni.stopPullDownRefresh() })

async function refresh() {
  loading.value = true
  try {
    const cached = uni.getStorageSync('star_site_member')
    if (cached) member.value = JSON.parse(cached)
    getMyMember().then((m) => { member.value = m; uni.setStorageSync('star_site_member', JSON.stringify(m)) }).catch(() => {})
    listFamilyMembers().then((ms) => { members.value = ms }).catch(() => {})
    const [up, reports, metrics] = await Promise.all([
      listUpcoming(60), listReports({ page: 1, size: 3 }), listMetrics({ page: 1, size: 3 }),
    ])
    todos.value = up
    reportCount.value = reports.total
    // 健康动态流：最近录入的报告/指标按时间混合
    const TYPE: Record<string, string> = { weight: '体重', bp_sys: '血压·高压', bp_dia: '血压·低压', glucose: '血糖', heart_rate: '心率' }
    const mName = (id: number) => members.value.find((m) => m.id === id)?.name ?? '成员'
    const items: { time: string; text: string; url?: string; ts: number; kind: string }[] = []
    for (const r of reports.records) {
      items.push({ kind: 'report', ts: new Date(r.createdAt).getTime(), time: r.createdAt.slice(5, 16), text: `${r.title} 已归档`, url: `/pages/report-detail/detail?id=${r.id}` })
    }
    for (const m of metrics.records) {
      items.push({ kind: 'metric', ts: new Date(m.createdAt).getTime(), time: m.metricDate, text: `${mName(m.familyMemberId)} 记录${TYPE[m.metricType] ?? m.metricType} ${m.valueNum}` })
    }
    feed.value = items.sort((a, b) => b.ts - a.ts).slice(0, 6)
  } finally { loading.value = false }
}

function go(url: string) { uni.navigateTo({ url }) }
function goTool(e: any) {
  const u = e?.currentTarget?.dataset?.url
  if (!u) return
  // 游客点写操作直达登录，省"跳过去再被踢回来"的一跳
  if (guest.value) {
    uni.showToast({ title: '登录后即可使用', icon: 'none' })
    uni.navigateTo({ url: '/pages/login/login' })
    return
  }
  uni.navigateTo({ url: u })
}
function dismissGuestBar() {
  guestBarHidden.value = true
  uni.setStorageSync('guest_bar_hidden_until', Date.now() + 24 * 3600 * 1000)
}
function goReports() { uni.navigateTo({ url: '/pages/reports/reports' }) }
function goMine() { uni.switchTab({ url: '/pages/mine/mine' }) }
function goMember(m: FamilyMemberVO) { uni.navigateTo({ url: `/pages/reports/reports?familyMemberId=${m.id}` }) }

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) { searchResults.value = null; return }
  searchResults.value = await searchReports(kw).catch(() => [])
}

function clearSearch() { keyword.value = ''; searchResults.value = null }

function dueLabel(due: string) {
  const diff = Math.ceil((new Date(due).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (diff === 0) return '今天'; if (diff === 1) return '明天'
  return diff > 1 ? `${diff} 天后` : `逾期 ${-diff} 天`
}
function dueClass(due: string) {
  const diff = Math.ceil((new Date(due).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (diff < 0) return 'weui-cell__desc-danger'
  if (diff <= 1) return 'weui-cell__desc-warn'
  return ''
}
</script>

<template>
  <view class="page">
    <!-- 品牌色头：搜索 + 四大动作反白其上，弧线过渡 -->
    <view class="hero-wrap">
      <view class="hero-inner">
        <view class="search-bar">
          <input v-model="keyword" class="s-ipt" placeholder="搜指标 / 医院 / 诊断，如 血红蛋白" confirm-type="search" @confirm="doSearch" />
          <text v-if="keyword" class="s-clear" @click="clearSearch">×</text>
        </view>
        <view class="action-row">
          <view v-for="a in ACTIONS" :key="a.name" class="action" hover-class="action_hover" :data-url="a.url" @click="goTool">
            <view class="a-ico-w" :class="'ico-' + a.icon + '-w'"></view>
            <view class="action-name">{{ a.name }}</view>
            <view class="action-desc">{{ a.desc }}</view>
          </view>
        </view>
      </view>
      <view class="hero-curve"></view>
    </view>

    <!-- 游客模式：先逛后注册的转化横幅（可关闭，24h 内不再打扰） -->
    <view v-if="guest && !guestBarHidden" class="guest-bar">
      <view class="guest-text" @click="go('/pages/login/login')">
        <view class="guest-title">登录后同步全家健康数据</view>
        <view class="guest-sub">微信一键登录，3 秒完成</view>
      </view>
      <view class="guest-btn" @click="go('/pages/login/login')">去登录</view>
      <view class="guest-close" @click="dismissGuestBar">×</view>
    </view>

    <!-- 搜索结果浮层 -->
    <view v-if="searchResults" class="card">
      <view class="sec-t">搜到 {{ searchResults.length }} 份报告</view>
      <view v-if="!searchResults.length" class="empty-s">换个关键词试试</view>
      <view v-for="r in searchResults" :key="r.id" class="s-row" hover-class="row_hover" @click="go(`/pages/report-detail/detail?id=${r.id}`)">
        <view class="s-title">{{ r.title }}</view>
        <view class="s-desc">{{ r.checkupDate || r.reportYear + '年' }}<text v-if="r.hospital"> · {{ r.hospital }}</text></view>
      </view>
    </view>

    <!-- L2 统计 -->
    <view class="quick-grid">
      <view class="quick-card" hover-class="hover" @click="goReports">
        <view class="quick-num">{{ reportCount }}</view>
        <view class="quick-label">体检报告</view>
      </view>
      <view class="quick-card" hover-class="hover" @click="goMine">
        <view class="quick-num">{{ todos.length }}</view>
        <view class="quick-label">待办事项</view>
      </view>
    </view>

    <!-- L3 工具宫格 -->
    <view class="sec sec-purple">
      <view class="sec-head">健康工具</view>
      <view class="tool-grid">
        <view v-for="t in TOOLS" :key="t.name" class="tool" hover-class="tool_hover" :data-url="t.url" @click="goTool">
          <view class="a-ico blue" :class="'ico-' + t.icon"></view>
          <view class="tool-name">{{ t.name }}</view>
          <view class="tool-desc">{{ t.desc }}</view>
        </view>
      </view>
    </view>

    <!-- L4 常用：家庭成员 -->
    <view class="sec sec-warm">
      <view class="sec-head">家庭成员</view>
      <scroll-view scroll-x class="member-scroll">
        <view v-for="m in members" :key="m.id" class="member" hover-class="tool_hover" @click="goMember(m)">
          <view class="avatar">{{ (m.name || '?').slice(0, 1) }}</view>
          <view class="m-name">{{ m.name }}</view>
          <view class="m-rel">{{ relLabel(m.relation) }}<text v-if="ageOf(m)"> · {{ ageOf(m) }}</text></view>
        </view>
      </scroll-view>
    </view>

    <!-- L5 健康动态 -->
    <view class="card">
      <view class="sec-head">最近动态</view>
      <view v-if="!loading && !feed.length" class="empty-s">还没有动态，去记一笔吧</view>
      <view v-for="(f, i) in feed" :key="i" class="s-row" hover-class="row_hover" @click="f.url && go(f.url)">
        <view class="feed-dot" :class="f.kind === 'report' ? 'dot-report' : 'dot-metric'"></view>
        <view class="s-title">{{ f.text }}</view>
        <view class="feed-time">{{ f.time }}</view>
      </view>
    </view>

    <!-- L6 待办提醒 -->
    <view class="card">
      <view class="sec-head">最近要办的事</view>
      <view v-if="todos.length === 0" class="empty-s">暂无待办提醒</view>
      <view v-for="o in todos.slice(0, 5)" :key="o.id" class="s-row" hover-class="row_hover" @click="go('/pages/reminder/reminder')">
        <view class="due-badge" :class="dueClass(o.dueDate)">{{ dueLabel(o.dueDate) }}</view>
        <view class="s-title">{{ o.title }}</view>
        <view class="feed-time">{{ o.dueDate }}</view>
      </view>
    </view>
  </view>
</template>

<style>
@import '../../styles/icons.css';
.page { min-height: 100vh; background: #f4f5f7; padding: 0 0 48rpx; }
/* 品牌色头：渐变绿 + 弧线下缘（支付宝头部蓝的等价物） */
/* 品牌色头：浅一档的绿 + 弧线下缘 */
.hero-wrap { background: linear-gradient(180deg, #7ddba4 0%, #52cf8e 88%); padding: 28rpx 32rpx 0; }
.hero-curve { height: 36rpx; background: #f4f5f7; border-radius: 36rpx 36rpx 0 0; margin: 0 -32rpx; }
.guest-bar { display: flex; align-items: center; background: #fff8ee; border: 1rpx solid #ffe1b8; border-radius: 20rpx; padding: 24rpx 28rpx; margin: 20rpx 32rpx 0; }
.guest-text { flex: 1; }
.guest-title { font-size: 27rpx; font-weight: 600; color: #8a5b1f; }
.guest-sub { font-size: 22rpx; color: #b08d55; margin-top: 4rpx; }
.guest-btn { background: #ffa300; color: #fff; font-size: 24rpx; font-weight: 600; border-radius: 999rpx; padding: 12rpx 30rpx; }
.guest-close { color: #c8a45e; font-size: 36rpx; padding: 0 4rpx 0 18rpx; }
.search-bar { display: flex; align-items: center; background: rgba(255, 255, 255, 0.92); border-radius: 999rpx; padding: 16rpx 28rpx; }
.s-ipt { flex: 1; font-size: 26rpx; color: #16233a; }
.s-clear { color: #07c160; font-size: 34rpx; padding: 0 8rpx; }
.action-row { display: flex; gap: 10rpx; padding: 26rpx 0 20rpx; }
.action { flex: 1; text-align: center; }
.action_hover { opacity: 0.8; }
.a-ico-w { width: 56rpx; height: 56rpx; margin: 0 auto 10rpx; background-repeat: no-repeat; background-position: center; background-size: contain; }
.action-name { font-size: 25rpx; font-weight: 600; color: #ffffff; }
.action-desc { font-size: 20rpx; color: rgba(255, 255, 255, 0.72); margin-top: 4rpx; }
.hover { background: #fafbfc; }
.quick-grid { display: flex; gap: 16rpx; margin: 20rpx 32rpx 16rpx; }
.quick-card { flex: 1; background: #fff; border: 1rpx solid #eceef2; border-radius: 20rpx; padding: 28rpx 0 24rpx; text-align: center; }
.quick-num { font-size: 52rpx; font-weight: 700; color: #07c160; line-height: 1.1; }
.quick-label { font-size: 23rpx; color: #8a9099; margin-top: 8rpx; }
.sec { border-radius: 24rpx; padding: 12rpx 16rpx 6rpx; margin-bottom: 24rpx; }
.sec-purple { background: #f6f8fa; }
.sec-warm { background: #f6f8fa; }
.sec-t { font-size: 26rpx; color: #5c6470; font-weight: 600; margin: 12rpx 8rpx 18rpx; }
.a-ico { width: 52rpx; height: 52rpx; margin: 0 auto 10rpx; background-repeat: no-repeat; background-position: center; background-size: contain; }
.sec-head { font-size: 22rpx; color: #98a0ab; font-weight: 400; padding: 4rpx 10rpx 10rpx; }
.tool-grid { display: flex; gap: 14rpx; margin-bottom: 12rpx; }
.tool { flex: 1; background: #fff; border: 1rpx solid #eeeef6; border-radius: 20rpx; padding: 24rpx 0; text-align: center; }
.tool_hover { background: #fafafc; }
.tool-name { font-size: 26rpx; font-weight: 600; color: #16233a; }
.tool-desc { font-size: 20rpx; color: #a2a8b0; margin-top: 6rpx; }
.member-scroll { white-space: nowrap; margin-bottom: 12rpx; }
.member { display: inline-block; width: 156rpx; background: #fff; border: 1rpx solid #f3ebe0; border-radius: 20rpx; padding: 26rpx 0 22rpx; text-align: center; margin-right: 14rpx; }
.avatar { width: 84rpx; height: 84rpx; border-radius: 50%; background: #07c160; color: #fff; font-size: 34rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; margin: 0 auto; }
.m-name { font-size: 26rpx; color: #16233a; margin-top: 14rpx; font-weight: 600; }
.m-rel { font-size: 20rpx; color: #a2a8b0; margin-top: 4rpx; }
.card { background: #f6f8fa; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 8rpx 26rpx; margin-bottom: 24rpx; }
.s-row { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #f2f4f6; }
.s-row:last-child { border-bottom: none; }
.row_hover { background: #fafbfc; }
.feed-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #cfd4da; margin-right: 18rpx; flex-shrink: 0; }
.dot-report { background: #07c160; }
.dot-metric { background: #10aeff; }
.s-title { flex: 1; font-size: 27rpx; color: #16233a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.s-desc { font-size: 22rpx; color: #8a9099; margin-top: 6rpx; }
.feed-time { font-size: 22rpx; color: #b4bac1; margin-left: 16rpx; flex-shrink: 0; }
.empty-s { text-align: center; color: #a2a8b0; font-size: 25rpx; padding: 36rpx 0; }
.due-badge { min-width: 96rpx; text-align: center; font-size: 22rpx; font-weight: 600; color: #07c160; background: rgba(7,193,96,.09); border-radius: 10rpx; padding: 10rpx 0; margin-right: 18rpx; flex-shrink: 0; }
</style>
