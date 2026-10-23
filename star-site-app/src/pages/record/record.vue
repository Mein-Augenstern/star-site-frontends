<script setup lang="ts">
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { createTransaction, listAccounts, listTransactions } from '@/api'
import { getToken } from '@/utils/request'
import type { FinanceAccount, FinanceTransaction } from '@/types/api'

const accounts = ref<FinanceAccount[]>([])
const txs = ref<FinanceTransaction[]>([])
const showSheet = ref(false)
const direction = ref(2)
const amount = ref('')
const accountId = ref(0)

const totalIn = computed(() =>
  txs.value.filter((t) => t.direction === 1).reduce((s, t) => s + Number(t.amount), 0))
const totalOut = computed(() =>
  txs.value.filter((t) => t.direction === 2).reduce((s, t) => s + Number(t.amount), 0))

async function load() {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  accounts.value = await listAccounts()
  const now = new Date()
  const page = await listTransactions({ year: now.getFullYear(), month: now.getMonth() + 1, size: 20 })
  txs.value = page.records
}

onShow(load)

onPullDownRefresh(async () => {
  await load()
  uni.stopPullDownRefresh()
})

function openSheet(directionToOpen: number) {
  if (accounts.value.length === 0) {
    uni.showToast({ title: '请先创建资金账户（暂未开放录入）', icon: 'none' })
    return
  }
  direction.value = directionToOpen
  accountId.value = accounts.value[0].id
  amount.value = ''
  showSheet.value = true
}

async function save() {
  const val = Number(amount.value)
  if (!val || val <= 0) {
    uni.showToast({ title: '请输入金额', icon: 'none' })
    return
  }
  await createTransaction({
    direction: direction.value,
    accountId: accountId.value,
    amount: val,
    category: direction.value === 1 ? 'OTHER_INCOME' : 'OTHER_EXPENSE',
    transTime: new Date().toISOString().slice(0, 19),
  })
  uni.showToast({ title: '已记账', icon: 'success' })
  showSheet.value = false
  await load()
}

function fmt(t: FinanceTransaction) {
  const abs = Math.abs(Number(t.amount)).toFixed(2)
  if (t.direction === 1) return `+${abs}`
  if (t.direction === 2) return `-${abs}`
  return Number(t.amount) < 0 ? `-${abs}` : `+${abs}`
}
</script>

<template>
  <view class="page">
    <!-- 本月概览卡 -->
    <view class="overview">
      <view class="ov-item">
        <view class="ov-label">本月收入</view>
        <view class="ov-value in">¥{{ totalIn.toFixed(2) }}</view>
      </view>
      <view class="ov-divider"></view>
      <view class="ov-item">
        <view class="ov-label">本月支出</view>
        <view class="ov-value out">¥{{ totalOut.toFixed(2) }}</view>
      </view>
      <view class="ov-divider"></view>
      <view class="ov-item">
        <view class="ov-label">笔数</view>
        <view class="ov-value">{{ txs.length }}</view>
      </view>
    </view>

    <!-- 流水 -->
    <view class="weui-cells__title">本月流水</view>
    <view class="weui-cells">
      <view v-if="txs.length === 0" class="weui-empty">本月暂无流水，点上方按钮记一笔</view>
      <view v-for="t in txs" :key="t.id" class="weui-cell media">
        <view class="weui-cell__bd">
          <view class="weui-cell__title">{{ t.categoryName || t.accountName }}</view>
          <view class="weui-cell__desc">{{ t.transTime?.slice(5, 16) }} · {{ t.accountName }}</view>
        </view>
        <view class="weui-cell__ft amount" :class="{ in: t.direction === 1, out: t.direction === 2 }">
          {{ fmt(t) }}
        </view>
      </view>
    </view>
    <view class="weui-footer">下拉可刷新 · 共 {{ txs.length }} 条</view>

    <!-- 悬浮记账按钮 -->
    <view class="fab" @click="openSheet(2)">＋</view>

    <!-- 半屏记账弹层 -->
    <view v-if="showSheet" class="mask" @click="showSheet = false">
      <view class="sheet" @click.stop>
        <view class="sheet-bar"></view>
        <view class="sheet-title">{{ direction === 1 ? '记一笔收入' : '记一笔支出' }}</view>
        <view class="amount-input">
          <text class="yen">¥</text>
          <input v-model="amount" class="amount-num" type="digit" placeholder="0.00" focus />
        </view>
        <view class="chips">
          <view
            v-for="a in accounts"
            :key="a.id"
            class="chip"
            :class="{ active: accountId === a.id }"
            @click="accountId = a.id"
          >
            {{ a.name }}
          </view>
        </view>
        <button class="save-btn" @click="save">保 存</button>
        <button class="cancel-btn" @click="showSheet = false">取 消</button>
      </view>
    </view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  background: #f7f7f7;
  padding-top: 16rpx;
}
.quick-panel {
  display: flex;
  background: #fff;
  margin: 0 32rpx 24rpx;
  border-radius: 16rpx;
  padding: 28rpx 0;
}
.quick-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}
.quick-icon {
  width: 88rpx;
  height: 88rpx;
  line-height: 88rpx;
  text-align: center;
  border-radius: 50%;
  font-size: 40rpx;
  background: rgba(7, 193, 96, 0.1);
  color: #07c160;
}
.quick-icon.out {
  background: rgba(250, 81, 81, 0.08);
  color: #fa5151;
}
.quick-label {
  font-size: 24rpx;
  color: #4e5969;
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
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.weui-cell:last-child {
  border-bottom: none;
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
.amount {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.amount.in {
  color: #07c160;
}
.amount.out {
  color: #fa5151;
}
.weui-empty {
  padding: 80rpx 0;
  text-align: center;
  color: #999;
  font-size: 28rpx;
}
.weui-footer {
  text-align: center;
  color: #b2b2b2;
  font-size: 22rpx;
  padding: 24rpx 0 48rpx;
}
.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(60rpx + env(safe-area-inset-bottom));
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  font-size: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 12rpx 32rpx rgba(7, 193, 96, 0.4);
  z-index: 90;
}
.mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 99;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 24rpx 40rpx calc(48rpx + env(safe-area-inset-bottom));
}
.sheet-bar {
  width: 72rpx;
  height: 8rpx;
  border-radius: 4rpx;
  background: #e5e5e5;
  margin: 0 auto 24rpx;
}
.sheet-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 32rpx;
  text-align: center;
}
.amount-input {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8rpx;
  padding: 32rpx 0;
  border-bottom: 2rpx solid #07c160;
  margin-bottom: 32rpx;
}
.yen {
  font-size: 40rpx;
  color: #1a1a1a;
}
.amount-num {
  font-size: 64rpx;
  font-weight: 600;
  width: 100%;
  text-align: center;
}
.chips {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
  padding: 16rpx 0 24rpx;
}
.chip {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background: #f4f5f7;
  color: #4e5969;
  font-size: 26rpx;
}
.chip.active {
  background: rgba(7, 193, 96, 0.12);
  color: #07c160;
  font-weight: 600;
}
.save-btn {
  font-size: 30rpx;
  border-radius: 12rpx;
  background: #07c160;
  color: #fff;
  margin-bottom: 20rpx;
}
.cancel-btn {
  font-size: 30rpx;
  border-radius: 12rpx;
  background: #f2f2f2;
  color: #1a1a1a;
}
</style>
