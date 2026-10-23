<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listVisits, deleteVisit } from '@/api/health'
import type { VisitRecord } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const list = ref<VisitRecord[]>([])
const members = ref<FamilyMemberVO[]>([])
const activeMember = ref<number | null>(null)
const loading = ref(true)

const memberName = (id: number) => members.value.find((m) => m.id === id)?.name ?? ''

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
    const page = await listVisits({
      familyMemberId: activeMember.value ?? undefined,
      page: 1,
      size: 50,
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

function openForm() {
  uni.navigateTo({ url: '/pages/visit-form/visit-form' })
}

function removeVisit(v: VisitRecord) {
  uni.showModal({
    title: '删除就医记录',
    content: `删除「${v.visitDate} ${v.hospital}」的记录？`,
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return
      await deleteVisit(v.id)
      refresh()
    },
  })
}
</script>

<template>
  <view class="page">
    <view class="hero-wrap">
      <view class="hero-title">就医记录</view>
      <view class="hero-sub">就诊 / 诊断 / 用药，全家共享档案</view>
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

    <view class="weui-cells">
      <view v-if="!loading && list.length === 0" class="weui-empty">
        <view class="weui-empty__icon">✚</view>
        <view class="weui-empty__text">还没有就医记录</view>
      </view>
      <view
        v-for="v in list"
        :key="v.id"
        class="weui-cell"
        hover-class="weui-cell_active"
        @longpress="removeVisit(v)"
      >
        <view class="weui-cell__hd date-badge">{{ v.visitDate.slice(5) }}</view>
        <view class="weui-cell__bd">
          <view class="weui-cell__title">
            {{ memberName(v.familyMemberId) }} · {{ v.hospital }}
          </view>
          <view class="weui-cell__desc">
            <text v-if="v.department">{{ v.department }}</text>
            <text v-if="v.diagnosis"> · {{ v.diagnosis }}</text>
            <text v-if="!v.department && !v.diagnosis">未填科室/诊断</text>
          </view>
          <view v-if="v.medication" class="weui-cell__desc med">用药：{{ v.medication }}</view>
        </view>
        <view v-if="v.cost != null" class="cost">¥{{ v.cost }}</view>
      </view>
    </view>

    <view class="btn-wrap">
      <button class="btn" @click="openForm">记一笔就诊</button>
    </view>
    <view class="weui-footer">长按记录可删除 · 共 {{ list.length }} 条</view>
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
.weui-cells {
  background: #fff;
  margin: 0 32rpx 24rpx;
  border-radius: 16rpx;
  overflow: hidden;
}
.weui-cell {
  display: flex;
  align-items: flex-start;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.weui-cell:last-child {
  border-bottom: none;
}
.weui-cell_active {
  background: #ececec;
}
.weui-cell__hd.date-badge {
  min-width: 96rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: #4e5969;
  background: #f4f6f8;
  border-radius: 10rpx;
  padding: 12rpx 0;
}
.weui-cell__bd {
  flex: 1;
  margin-left: 20rpx;
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
.weui-cell__desc.med {
  color: #6b7785;
}
.cost {
  font-size: 26rpx;
  color: #4e5969;
}
.btn-wrap {
  padding: 8rpx 32rpx;
}
.btn {
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
}
.weui-footer {
  text-align: center;
  color: #b2b2b2;
  font-size: 22rpx;
  padding: 16rpx 0 48rpx;
}
.weui-empty {
  text-align: center;
  padding: 80rpx 0;
}
.weui-empty__icon {
  color: #c8c9cc;
  font-size: 56rpx;
}
.weui-empty__text {
  color: #999;
  font-size: 26rpx;
  margin-top: 12rpx;
}
</style>
