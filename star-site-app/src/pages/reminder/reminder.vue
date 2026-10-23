<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listUpcoming, doneOccurrence, dismissOccurrence, listUserRules, deleteUserRule } from '@/api'
import type { UserRuleVO } from '@/api'
import { getToken } from '@/utils/request'
import type { OccurrenceVO } from '@/types/api'

const list = ref<OccurrenceVO[]>([])
const rules = ref<UserRuleVO[]>([])
const loading = ref(true)

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  refresh()
})

onPullDownRefresh(async () => {
  await refresh()
  uni.stopPullDownRefresh()
})

async function refresh() {
  loading.value = true
  try {
    list.value = await listUpcoming(60)
    rules.value = await listUserRules().catch(() => [])
  } finally {
    loading.value = false
  }
}

function goRuleForm() {
  uni.navigateTo({ url: '/pages/rule-form/rule-form' })
}

function removeRule(r: UserRuleVO) {
  uni.showModal({
    title: '删除提醒规则',
    content: `删除「${r.title}」？未到期的提醒将一并清除。`,
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return
      await deleteUserRule(r.id)
      refresh()
    },
  })
}

async function markDone(o: OccurrenceVO) {
  await doneOccurrence(o.id)
  uni.showToast({ title: '已完成', icon: 'success' })
  refresh()
}

async function markDismiss(o: OccurrenceVO) {
  await dismissOccurrence(o.id)
  refresh()
}

function dueLabel(due: string) {
  const diff = Math.ceil((new Date(due).getTime() - new Date().setHours(0, 0, 0, 0)) / 86400000)
  if (diff === 0) return '今天'
  if (diff === 1) return '明天'
  return diff > 1 ? `${diff} 天后` : `逾期 ${-diff} 天`
}

function repeatLabel(t: string) {
  const M: Record<string, string> = { NONE: '不重复', WEEKLY: '每周', MONTHLY: '每月', ANNUAL: '每年' }
  return M[t] ?? t
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
    <view class="top-bar">
      <view class="top-title">提醒中心</view>
      <view class="new-btn" @click="goRuleForm">＋ 新建提醒</view>
    </view>
    <view class="weui-cells weui-cells_after-title">
      <view v-if="!loading && list.length === 0" class="weui-empty">
        <view class="weui-empty__icon">✓</view>
        <view class="weui-empty__text">近 60 天没有要办的事项</view>
      </view>
      <view
        v-for="o in list"
        :key="o.id"
        class="weui-cell"
        hover-class="weui-cell_active"
      >
        <view class="weui-cell__hd due-badge" :class="dueClass(o.dueDate)">{{ dueLabel(o.dueDate) }}</view>
        <view class="weui-cell__bd">
          <view class="weui-cell__title">{{ o.title }}</view>
          <view class="weui-cell__desc">{{ o.dueDate }} · {{ o.source }}</view>
        </view>
        <view class="ops">
          <view class="op-btn ignore" @click.stop="markDismiss(o)">忽略</view>
          <view class="op-btn done" @click.stop="markDone(o)">完成</view>
        </view>
      </view>
    </view>
    <view v-if="rules.length" class="rules-card">
      <view class="rules-title">我的提醒规则（{{ rules.length }}）</view>
      <view v-for="r in rules" :key="r.id" class="rule-row">
        <view class="rule-mid">
          <view class="rule-name">{{ r.title }}</view>
          <view class="rule-desc">首次 {{ r.firstRemindAt }} · {{ repeatLabel(r.repeatType) }} · 待办 {{ r.pendingCount }}</view>
        </view>
        <view class="rule-del" @click="removeRule(r)">删除</view>
      </view>
    </view>
    <view v-if="loading" class="weui-loading">加载中…</view>
    <view class="weui-footer">下拉可刷新 · 共 {{ list.length }} 条</view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  background: #f7f7f7;
  padding-top: 16rpx;
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
.ops {
  display: flex;
  gap: 12rpx;
  margin-left: 12rpx;
}
.op-btn {
  font-size: 24rpx;
  border-radius: 999rpx;
  padding: 8rpx 24rpx;
}
.op-btn.done {
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
}
.top-bar { display: flex; align-items: center; justify-content: space-between; padding: 8rpx 32rpx 20rpx; }
.top-title { font-size: 34rpx; font-weight: 700; color: #16233a; }
.new-btn { font-size: 25rpx; color: #07c160; background: rgba(7,193,96,.1); border-radius: 999rpx; padding: 12rpx 30rpx; font-weight: 600; }
.rules-card { background: #fff; border-radius: 16rpx; padding: 8rpx 30rpx; margin: 0 32rpx 24rpx; }
.rules-title { font-size: 22rpx; color: #98a0ab; padding: 18rpx 0 6rpx; }
.rule-row { display: flex; align-items: center; padding: 18rpx 0; border-bottom: 1rpx solid #f4f4f4; }
.rule-row:last-child { border-bottom: none; }
.rule-mid { flex: 1; }
.rule-name { font-size: 28rpx; color: #1a1a1a; }
.rule-desc { font-size: 22rpx; color: #999; margin-top: 4rpx; }
.rule-del { font-size: 24rpx; color: #fa5151; padding: 8rpx 0 8rpx 20rpx; }
.op-btn.ignore {
  color: #999;
  background: #f4f6f8;
}
.due-badge {
  min-width: 104rpx;
  text-align: center;
  font-size: 24rpx;
  font-weight: 600;
  color: #07c160;
  background: rgba(7, 193, 96, 0.1);
  border-radius: 10rpx;
  padding: 12rpx 0;
}
.due-badge.weui-cell__desc-danger {
  color: #fa5151;
  background: rgba(250, 81, 81, 0.08);
}
.due-badge.weui-cell__desc-warn {
  color: #ffa300;
  background: rgba(255, 163, 0, 0.1);
}
.weui-empty {
  padding: 120rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.weui-empty__icon {
  width: 96rpx;
  height: 96rpx;
  line-height: 96rpx;
  text-align: center;
  border-radius: 50%;
  background: rgba(7, 193, 96, 0.1);
  color: #07c160;
  font-size: 48rpx;
  margin-bottom: 24rpx;
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
