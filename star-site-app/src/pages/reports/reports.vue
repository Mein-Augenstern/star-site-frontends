<script setup lang="ts">
import { onLoad, onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listReports } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'
import type { HealthReport } from '@/types/api'

const list = ref<HealthReport[]>([])
const members = ref<FamilyMemberVO[]>([])
const activeMember = ref<number | null>(null)
const loading = ref(true)

onLoad((options) => {
  const id = Number(options?.familyMemberId)
  if (id) activeMember.value = id
})

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!members.value.length) {
    members.value = await listFamilyMembers().catch(() => [])
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
    const page = await listReports({
      familyMemberId: activeMember.value ?? undefined,
      page: 1,
      size: 20,
    })
    list.value = page.records
  } finally {
    loading.value = false
  }
}

function switchMember(id: number | null) {
  activeMember.value = id
  refresh()
}

function openDetail(r: HealthReport) {
  uni.navigateTo({ url: `/pages/report-detail/detail?id=${r.id}` })
}

function goForm() {
  uni.navigateTo({ url: '/pages/report-form/report-form' })
}
</script>

<template>
  <view class="page">
    <view class="hero-wrap">
      <view class="hero-title">体检报告</view>
      <view class="hero-sub">全家报告档案 · 点指标看趋势</view>
      <scroll-view scroll-x class="chips">
        <view
          class="chip"
          :class="{ active: activeMember === null }"
          @click="switchMember(null)"
        >全部</view>
        <view
          v-for="m in members"
          :key="m.id"
          class="chip"
          :class="{ active: activeMember === m.id }"
          @click="switchMember(m.id)"
        >{{ m.name }}</view>
      </scroll-view>
      <view class="hero-curve"></view>
    </view>
    <view class="body">
    <view class="add-bar">
      <button class="add-btn" @click="goForm()">＋ 录入报告</button>
    </view>
    <view class="weui-cells">
      <view v-if="!loading && list.length === 0" class="weui-empty">
        <view class="weui-empty__icon">📋</view>
        <view class="weui-empty__text">还没有体检报告，点上方「＋ 录入报告」开始</view>
      </view>
      <view
        v-for="r in list"
        :key="r.id"
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="openDetail(r)"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">{{ r.title }}</view>
          <view class="weui-cell__desc">
            {{ r.checkupDate || r.reportYear + ' 年' }}
            <text v-if="r.hospital"> · {{ r.hospital }}</text>
          </view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
    </view>
    <view v-if="loading" class="weui-loading">加载中…</view>
    <view class="weui-footer">共 {{ list.length }} 份报告</view>
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
  padding: 0 0 4rpx;
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
.add-bar {
  margin: 0 0 16rpx;
}
.add-btn {
  background: rgba(7, 193, 96, 0.1);
  color: #07c160;
  font-size: 28rpx;
  border-radius: 12rpx;
}
.weui-cells__title {
  margin: 0 32rpx 16rpx;
  font-size: 26rpx;
  color: #999;
}
.weui-cells {
  background: #fff;
  margin: 0 32rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
.weui-cell {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.weui-cell:last-child {
  border-bottom: none;
}
.weui-cell_active {
  background: #ececec;
}
.weui-cell__bd {
  flex: 1;
}
.weui-cell__title {
  font-size: 30rpx;
  color: #1a1a1a;
}
.weui-cell__desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}
.weui-empty {
  padding: 100rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.weui-empty__icon {
  font-size: 64rpx;
  margin-bottom: 20rpx;
}
.weui-empty__text {
  color: #999;
  font-size: 28rpx;
}
.weui-loading {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 24rpx 0;
}
.weui-footer {
  text-align: center;
  color: #b2b2b2;
  font-size: 22rpx;
  padding: 24rpx 0 48rpx;
}
</style>
