<script setup lang="ts">
import { onPullDownRefresh, onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { addMetrics, listMetrics, deleteMetric } from '@/api/health'
import type { DailyMetric } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

/** 类型定义：key=后端 metricType；血压一次录双值 */
const TYPES = [
  { key: 'bp', label: '血压', unit: 'mmHg', dual: true },
  { key: 'glucose', label: '血糖', unit: 'mmol/L', dual: false },
  { key: 'weight', label: '体重', unit: 'kg', dual: false },
  { key: 'heart_rate', label: '心率', unit: '次/分', dual: false },
] as const

const members = ref<FamilyMemberVO[]>([])
const activeMember = ref<number | null>(null)
const activeType = ref<string>('bp')
const list = ref<DailyMetric[]>([])
const metricDate = ref(today())
const valA = ref('') // 血压=高压 / 其他=数值
const valB = ref('') // 血压=低压
const submitting = ref(false)
const loading = ref(true)

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const typeDef = () => TYPES.find((t) => t.key === activeType.value)!
const memberName = (id: number) => members.value.find((m) => m.id === id)?.name ?? ''
const typeLabel = (t: string) =>
  t === 'bp_sys' ? '血压·高压' : t === 'bp_dia' ? '血压·低压' : TYPES.find((x) => x.key === t)?.label ?? t

// 首页快捷动作带参预选 + 记忆上次选择（成员/类型），减少高频打卡的点击
let paramApplied = false
onLoad((options) => {
  const t = options?.type
  if (t && TYPES.some((x) => x.key === t)) {
    activeType.value = t
    uni.setStorageSync('metrics_last_type', t)
    paramApplied = true
  }
})

function rememberMember(id: number) {
  activeMember.value = id
  uni.setStorageSync('metrics_last_member', id)
  refresh()
}

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!members.value.length) {
    members.value = await listFamilyMembers().catch(() => [])
    const remembered = Number(uni.getStorageSync('metrics_last_member')) || null
    if (!activeMember.value && members.value.length) {
      activeMember.value = members.value.some((m) => m.id === remembered)
        ? remembered
        : members.value[0].id
    }
  }
  if (!paramApplied) {
    const lastType = uni.getStorageSync('metrics_last_type')
    if (lastType && TYPES.some((x) => x.key === lastType)) activeType.value = lastType
  }
  await refresh()
})

onPullDownRefresh(async () => {
  await refresh()
  uni.stopPullDownRefresh()
})

async function refresh() {
  loading.value = true
  try {
    const page = await listMetrics({
      familyMemberId: activeMember.value ?? undefined,
      page: 1,
      size: 30,
    })
    list.value = page.records
  } finally {
    loading.value = false
  }
}

function bindDateChange(e: { detail: { value: string } }) {
  metricDate.value = e.detail.value
}

async function submit() {
  if (!activeMember.value) {
    uni.showToast({ title: '请选择成员', icon: 'none' })
    return
  }
  const t = typeDef()
  const a = Number(valA.value)
  if (!valA.value || isNaN(a)) {
    uni.showToast({ title: `请填写${t.dual ? '高压' : t.label}`, icon: 'none' })
    return
  }
  if (t.dual) {
    const b = Number(valB.value)
    if (!valB.value || isNaN(b)) {
      uni.showToast({ title: '请填写低压', icon: 'none' })
      return
    }
    if (a < b) {
      uni.showToast({ title: '高压应大于低压', icon: 'none' })
      return
    }
  }
  submitting.value = true
  try {
    const base = { familyMemberId: activeMember.value, metricDate: metricDate.value }
    await addMetrics({
      items: t.dual
        ? [
            { ...base, metricType: 'bp_sys', valueNum: a },
            { ...base, metricType: 'bp_dia', valueNum: Number(valB.value) },
          ]
        : [{ ...base, metricType: activeType.value, valueNum: a }],
    })
    uni.showToast({ title: '已记录', icon: 'success' })
    valA.value = ''
    valB.value = ''
    refresh()
  } finally {
    submitting.value = false
  }
}

function removeMetric(m: DailyMetric) {
  uni.showModal({
    title: '删除记录',
    content: `删除 ${m.metricDate} 的${typeLabel(m.metricType)}记录？`,
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return
      await deleteMetric(m.id)
      refresh()
    },
  })
}

function openTrend(m: DailyMetric) {
  uni.navigateTo({
    url: `/pages/metric-trends/metric-trends?familyMemberId=${m.familyMemberId}` +
      `&metricType=${m.metricType}&memberName=${encodeURIComponent(memberName(m.familyMemberId))}`,
  })
}
</script>

<template>
  <view class="page">
    <!-- 品牌色头：标题+成员筛选反白 -->
    <view class="hero-wrap">
      <view class="hero-title">健康记录</view>
      <view class="hero-sub">血压 / 血糖 / 体重 / 心率，测完随手记</view>
      <scroll-view scroll-x class="chips">
        <view
          v-for="m in members"
          :key="m.id"
          class="chip"
          :class="{ active: activeMember === m.id }"
          @click="rememberMember(m.id)"
        >{{ m.name }}</view>
      </scroll-view>
      <view class="hero-curve"></view>
    </view>

    <view class="body">
      <!-- 快捷录入 -->
      <view class="card form-card">
        <view class="form-row">
          <view class="label">类型</view>
          <view class="type-list">
            <view
              v-for="t in TYPES"
              :key="t.key"
              class="type-chip"
              :class="{ active: activeType === t.key }"
              @click="activeType = t.key; uni.setStorageSync('metrics_last_type', t.key)"
            >{{ t.label }}</view>
          </view>
        </view>
        <view class="form-row">
          <view class="label">日期</view>
          <picker mode="date" :value="metricDate" @change="bindDateChange">
            <view class="picker-value">{{ metricDate }} <text class="arrow">›</text></view>
          </picker>
        </view>
        <view class="form-row">
          <view class="label">{{ typeDef().dual ? '高压' : typeDef().label }}</view>
          <input v-model="valA" class="ipt" type="digit" :placeholder="typeDef().unit" />
          <text v-if="typeDef().dual" class="slash">/</text>
          <template v-if="typeDef().dual">
            <view class="label b">低压</view>
            <input v-model="valB" class="ipt" type="digit" :placeholder="typeDef().unit" />
          </template>
          <text class="unit">{{ typeDef().unit }}</text>
        </view>
        <button class="btn" :loading="submitting" @click="submit">记一笔</button>
      </view>

      <!-- 近期记录 -->
      <view class="card">
        <view class="sec-head">近期记录 · 点看曲线 · 长按删除</view>
        <view v-if="!loading && list.length === 0" class="empty">还没有记录，测完随手记一笔</view>
      <view
        v-for="m in list"
        :key="m.id"
        class="row"
        hover-class="row_active"
        @click="openTrend(m)"
        @longpress="removeMetric(m)"
      >
        <view class="date">{{ m.metricDate.slice(5) }}</view>
        <view class="type">{{ typeLabel(m.metricType) }}</view>
        <view class="value">{{ m.valueNum }}</view>
      </view>
      </view>
    </view>
  </view>
</template>

<style>
@import '../../styles/icons.css';
.page {
  min-height: 100vh;
  background: #f4f5f7;
  padding: 0 0 48rpx;
}
.hero-wrap { background: linear-gradient(180deg, #7ddbA4 0%, #52cf8e 88%); padding: 28rpx 32rpx 0; }
.hero-title { font-size: 38rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 23rpx; color: rgba(255, 255, 255, 0.75); margin-top: 6rpx; }
.hero-curve { height: 36rpx; background: #f4f5f7; border-radius: 36rpx 36rpx 0 0; margin: 24rpx -32rpx 0; }
.body { padding: 20rpx 32rpx 0; }
.chips {
  white-space: nowrap;
  padding-bottom: 4rpx;
}
.chip {
  display: inline-block;
  font-size: 26rpx;
  color: #07c160;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999rpx;
  padding: 10rpx 30rpx;
  margin-right: 16rpx;
}
.chip.active {
  background: #fff;
  color: #06ad56;
  font-weight: 700;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 8rpx 32rpx 28rpx;
  margin-bottom: 24rpx;
}
.sec-head { font-size: 22rpx; color: #98a0ab; font-weight: 400; padding: 16rpx 4rpx 6rpx; }
.form-row {
  display: flex;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.label {
  width: 110rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.label.b {
  width: auto;
  margin-left: 8rpx;
}
.type-list {
  flex: 1;
  display: flex;
  gap: 14rpx;
  flex-wrap: wrap;
}
.type-chip {
  font-size: 24rpx;
  color: #4e5969;
  background: #f4f6f8;
  border-radius: 999rpx;
  padding: 8rpx 24rpx;
}
.type-chip.active {
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
  font-weight: 600;
}
.picker-value {
  font-size: 28rpx;
  color: #4e5969;
}
.arrow {
  color: #c8c9cc;
}
.ipt {
  width: 140rpx;
  font-size: 30rpx;
  font-weight: 600;
  text-align: center;
  border-bottom: 2rpx solid #e8e8e8;
  padding: 4rpx 0;
}
.slash {
  color: #999;
  margin: 0 8rpx;
}
.unit {
  font-size: 22rpx;
  color: #999;
  margin-left: 8rpx;
}
.btn {
  margin-top: 28rpx;
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
}
.section-title {
  font-size: 26rpx;
  color: #999;
  margin: 8rpx 8rpx 16rpx;
}
.row {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
  border-bottom: 1rpx solid #f4f4f4;
}
.row:last-child {
  border-bottom: none;
}
.row_active {
  background: #fafafa;
}
.date {
  width: 130rpx;
  font-size: 26rpx;
  color: #999;
}
.type {
  flex: 1;
  font-size: 28rpx;
  color: #1a1a1a;
}
.value {
  font-size: 30rpx;
  font-weight: 700;
  color: #07c160;
}
.empty {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 48rpx 0;
}
</style>
