<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getPregnancy, upsertPregnancy } from '@/api/health'
import type { PregnancyVO } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const members = ref<FamilyMemberVO[]>([])
const memberId = ref<number | null>(null)
const profile = ref<PregnancyVO | null>(null)
const lmpDate = ref('')
const heightCm = ref('')
const preWeight = ref('')
const loading = ref(true)

const memberName = () => members.value.find((m) => m.id === memberId.value)?.name ?? ''

onShow(async () => {
  if (!getToken()) { uni.reLaunch({ url: '/pages/login/login' }); return }
  if (!members.value.length) {
    members.value = await listFamilyMembers().catch(() => [])
    const spouse = members.value.find((m) => m.relation === 'spouse')
    memberId.value = spouse?.id ?? members.value[0]?.id ?? null
  }
  await load()
})

async function load() {
  loading.value = true
  try {
    if (memberId.value) {
      profile.value = await getPregnancy(memberId.value).catch(() => null)
      if (profile.value) {
        lmpDate.value = profile.value.lmpDate
      }
    }
  } finally { loading.value = false }
}

function bindLmp(e: { detail: { value: string } }) { lmpDate.value = e.detail.value }

async function save() {
  if (!memberId.value || !lmpDate.value) {
    uni.showToast({ title: '请选择成员和末次月经日期', icon: 'none' })
    return
  }
  profile.value = await upsertPregnancy({
    familyMemberId: memberId.value, lmpDate: lmpDate.value,
    heightCm: heightCm.value ? Number(heightCm.value) : undefined,
    prePregnancyWeight: preWeight.value ? Number(preWeight.value) : undefined,
  })
  uni.showToast({ title: '已保存', icon: 'success' })
}

function switchMember(id: number) {
  memberId.value = id
  profile.value = null
  load()
}

function statusText(s: string) {
  return s === 'current' ? '进行中' : s === 'done' ? '已过' : '未到'
}

function goWeightTrend() {
  if (!memberId.value) return
  uni.navigateTo({
    url: `/pages/metric-trends/metric-trends?familyMemberId=${memberId.value}` +
      `&metricType=weight&memberName=${encodeURIComponent(memberName())}`,
  })
}
</script>

<template>
  <view class="page">
    <view class="hero-wrap">
      <view class="hero-title">孕期助手</view>
      <view class="hero-sub">孕周 · 预产期 · 产检计划 · 增重参考</view>
      <scroll-view scroll-x class="chips">
        <view v-for="m in members" :key="m.id" class="chip" :class="{ active: memberId === m.id }" @click="switchMember(m.id)">{{ m.name }}</view>
      </scroll-view>
      <view class="hero-curve"></view>
    </view>
    <view class="body">

    <!-- 孕周中枢 -->
    <view v-if="profile" class="card hero">
      <view class="week">{{ profile.stage }} · 孕 {{ profile.gestationalWeek }} 周 + {{ profile.gestationalDay }} 天</view>
      <view class="due">预产期 {{ profile.dueDate }} · 还有 {{ profile.daysToDue }} 天</view>
      <view v-if="profile.weightGainAdvice" class="bmi">
        孕前 BMI {{ profile.preBmi }} · 全孕期建议增重 {{ profile.weightGainAdvice }} kg
        （体重可在"健康记录"每日打卡）
      </view>
      <button class="btn line" @click="goWeightTrend">查看体重曲线</button>
    </view>

    <!-- 设置/更新档案 -->
    <view class="card">
      <view class="fr"><view class="lb">末次月经</view>
        <picker mode="date" :value="lmpDate" @change="bindLmp"><view class="pv">{{ lmpDate || '选择第一天' }} ›</view></picker></view>
      <view class="fr"><view class="lb">身高 cm</view><input v-model="heightCm" type="digit" class="ipt" placeholder="选填（算BMI）" /></view>
      <view class="fr"><view class="lb">孕前体重 kg</view><input v-model="preWeight" type="digit" class="ipt" placeholder="选填" /></view>
      <button class="btn" @click="save">{{ profile ? '更新档案' : '建立孕期档案' }}</button>
    </view>

    <!-- 产检计划 -->
    <view v-if="profile" class="section-title">产检与关键节点 · {{ memberName() }}</view>
    <view v-if="profile" class="card">
      <view v-for="(m, i) in profile.milestones" :key="i" class="ms" :class="m.status">
        <view class="ms-week">孕{{ m.fromWeek }}-{{ m.toWeek }}周</view>
        <view class="ms-body">
          <view class="ms-name">{{ m.name }}</view>
          <view class="ms-tip">{{ m.tip }}</view>
        </view>
        <view class="ms-status">{{ statusText(m.status) }}</view>
      </view>
    </view>
    <view v-if="loading" class="loading">加载中…</view>
    </view>
  </view>
</template>

<style>
@import '../../styles/icons.css';
.page { min-height: 100vh; background: #f4f5f7; padding: 0 0 48rpx; }
.hero-wrap { background: linear-gradient(180deg, #7ddbA4 0%, #52cf8e 88%); padding: 28rpx 32rpx 0; }
.hero-title { font-size: 38rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 23rpx; color: rgba(255, 255, 255, 0.75); margin-top: 6rpx; }
.hero-curve { height: 36rpx; background: #f4f5f7; border-radius: 36rpx 36rpx 0 0; margin: 24rpx -32rpx 0; }
.body { padding: 20rpx 32rpx 0; }
.chips { white-space: nowrap; padding-bottom: 4rpx; }
.chip { display: inline-block; font-size: 26rpx; color: #07c160; background: rgba(255, 255, 255, 0.92); border-radius: 999rpx; padding: 10rpx 30rpx; margin-right: 16rpx; }
.chip.active { background: #fff; color: #06ad56; font-weight: 700; }
.card { background: #fff; border-radius: 20rpx; padding: 8rpx 32rpx 28rpx; margin-bottom: 24rpx; }
.hero { padding: 32rpx; }
.week { font-size: 40rpx; font-weight: 700; color: #07c160; }
.due { font-size: 26rpx; color: #4e5969; margin-top: 12rpx; }
.bmi { font-size: 24rpx; color: #999; margin-top: 10rpx; line-height: 1.6; }
.fr { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.fr:last-of-type { border-bottom: none; }
.lb { width: 190rpx; font-size: 28rpx; color: #1a1a1a; }
.pv { font-size: 28rpx; color: #4e5969; }
.ipt { flex: 1; font-size: 28rpx; text-align: right; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; margin-top: 24rpx; }
.btn.line { background: rgba(7,193,96,.1); color: #07c160; margin-top: 20rpx; font-size: 26rpx; }
.section-title { font-size: 26rpx; color: #999; margin: 8rpx 8rpx 16rpx; }
.ms { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f4f4f4; }
.ms:last-child { border-bottom: none; }
.ms-week { width: 170rpx; font-size: 24rpx; color: #999; }
.ms.current .ms-week { color: #07c160; font-weight: 600; }
.ms-body { flex: 1; }
.ms-name { font-size: 28rpx; color: #1a1a1a; }
.ms.current .ms-name { font-weight: 600; }
.ms-tip { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.ms.done { opacity: 0.5; }
.ms-status { font-size: 22rpx; color: #999; }
.ms.current .ms-status { color: #07c160; font-weight: 600; }
.loading { text-align: center; color: #999; font-size: 26rpx; padding: 32rpx 0; }
</style>
