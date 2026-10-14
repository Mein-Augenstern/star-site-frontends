<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listFamilyMembers } from '@/api'
import { listReports } from '@/api/health'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const members = ref<FamilyMemberVO[]>([])
const filterMemberId = ref<number | null>(null)
const reports = ref<{
  id: number
  title: string
  hospital: string
  checkupDate: string | null
  reportYear: number
  familyMemberId: number
  abnormal: number
  total: number
}[]>([])
const loading = ref(true)

onShow(async () => {
  if (!getToken()) { uni.reLaunch({ url: '/pages/login/login' }); return }
  if (!members.value.length) {
    members.value = await listFamilyMembers().catch(() => [])
  }
  await refresh()
})

async function refresh() {
  loading.value = true
  try {
    const page = await listReports({
      familyMemberId: filterMemberId.value ?? undefined,
      page: 1,
      size: 50,
    })
    // 列表带指标数/异常数：轻量在客户端补齐（详情才返回指标，这里逐份拉太贵，先展示年份/医院）
    reports.value = page.records.map((r) => ({
      id: r.id,
      title: r.title,
      hospital: r.hospital,
      checkupDate: r.checkupDate,
      reportYear: r.reportYear,
      familyMemberId: r.familyMemberId,
      abnormal: -1,
      total: -1,
    }))
  } finally {
    loading.value = false
  }
}

function pickMember(id: number | null) {
  filterMemberId.value = filterMemberId.value === id ? null : id
  refresh()
}

function memberName(id: number) {
  return members.value.find((m) => m.id === id)?.name ?? ''
}

function goDetail(id: number) {
  uni.navigateTo({ url: `/pages/report-detail/detail?id=${id}` })
}

function goForm() {
  const q = filterMemberId.value ? `?familyMemberId=${filterMemberId.value}` : ''
  uni.navigateTo({ url: `/pages/report-form/report-form${q}` })
}
</script>

<template>
  <view class="page">
    <!-- 成员筛选 -->
    <scroll-view scroll-x class="chip-scroll">
      <view
        class="chip"
        :class="{ on: filterMemberId === null }"
        @click="pickMember(null)"
      >全家</view>
      <view
        v-for="m in members"
        :key="m.id"
        class="chip"
        :class="{ on: filterMemberId === m.id }"
        @click="pickMember(m.id)"
      >{{ m.name }}</view>
    </scroll-view>

    <view v-if="!loading && !reports.length" class="empty">
      <view class="empty-t">还没有体检报告</view>
      <view class="empty-s">把纸质报告拍进来，AI 自动提取指标并标红异常</view>
      <view class="empty-btn" @click="goForm">去拍第一份报告</view>
    </view>

    <view
      v-for="r in reports"
      :key="r.id"
      class="card"
      hover-class="card_hover"
      @click="goDetail(r.id)"
    >
      <view class="card-top">
        <view class="r-title">{{ r.title }}</view>
        <view class="r-member">{{ memberName(r.familyMemberId) }}</view>
      </view>
      <view class="r-meta">
        {{ r.checkupDate || r.reportYear + ' 年' }}<text v-if="r.hospital"> · {{ r.hospital }}</text>
      </view>
    </view>

    <!-- 悬浮拍报告 -->
    <view class="fab" @click="goForm">拍报告</view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f4f5f7; padding: 20rpx 0 140rpx; }
.chip-scroll { white-space: nowrap; padding: 4rpx 32rpx 16rpx; }
.chip { display: inline-block; font-size: 25rpx; color: #5c6470; background: #fff; border: 1rpx solid #e7eaee; border-radius: 999rpx; padding: 12rpx 34rpx; margin-right: 14rpx; }
.chip.on { color: #07c160; border-color: #07c160; background: rgba(7, 193, 96, 0.06); font-weight: 600; }
.card { background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 26rpx 30rpx; margin: 0 32rpx 20rpx; }
.card_hover { background: #fafbfc; }
.card-top { display: flex; align-items: center; justify-content: space-between; gap: 16rpx; }
.r-title { flex: 1; font-size: 29rpx; font-weight: 600; color: #16233a; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.r-member { font-size: 22rpx; color: #07c160; background: rgba(7, 193, 96, 0.09); border-radius: 8rpx; padding: 6rpx 14rpx; flex-shrink: 0; }
.r-meta { font-size: 23rpx; color: #8a9099; margin-top: 10rpx; }
.empty { text-align: center; padding: 140rpx 60rpx 0; }
.empty-t { font-size: 30rpx; color: #16233a; font-weight: 600; }
.empty-s { font-size: 24rpx; color: #a2a8b0; margin-top: 14rpx; line-height: 1.7; }
.empty-btn { display: inline-block; margin-top: 40rpx; font-size: 27rpx; font-weight: 600; color: #fff; background: #07c160; border-radius: 999rpx; padding: 20rpx 60rpx; }
.fab { position: fixed; right: 40rpx; bottom: 68rpx; background: #07c160; color: #fff; font-size: 27rpx; font-weight: 600; border-radius: 999rpx; padding: 24rpx 44rpx; box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.35); }
</style>
