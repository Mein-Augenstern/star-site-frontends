<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getBalanceSheet } from '@/api'
import { getToken } from '@/utils/request'
import type { BalanceSheet } from '@/types/api'

const sheet = ref<BalanceSheet | null>(null)

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  sheet.value = await getBalanceSheet()
})
</script>

<template>
  <view class="page">
    <!-- 微信绿渐变大卡 -->
    <view class="hero">
      <view class="hero-label">家庭净资产</view>
      <view class="hero-value">¥{{ sheet?.netWorth ?? '————' }}</view>
      <view class="hero-split"></view>
      <view class="hero-rows">
        <view class="hero-row">
          <text>总资产</text>
          <text>¥{{ sheet?.totalAsset ?? 0 }}</text>
        </view>
        <view class="hero-row">
          <text>总负债</text>
          <text>¥{{ sheet?.totalLiability ?? 0 }}</text>
        </view>
      </view>
    </view>

    <view class="section-title">资产构成</view>
    <view class="card">
      <view class="row">
        <view class="row-left">
          <view class="row-icon">💰</view>
          <view>
            <view class="row-title">账户资产</view>
            <view class="row-sub">现金 / 银行卡 / 微信 / 支付宝</view>
          </view>
        </view>
        <text class="row-value">¥{{ sheet?.accountAsset ?? 0 }}</text>
      </view>
      <view class="row">
        <view class="row-left">
          <view class="row-icon">🏠</view>
          <view>
            <view class="row-title">档案资产估值</view>
            <view class="row-sub">房产 / 车辆台账</view>
          </view>
        </view>
        <text v-if="sheet?.archiveAvailable" class="row-value">¥{{ sheet?.archiveAsset ?? 0 }}</text>
        <text v-else class="row-value dim">不可用</text>
      </view>
    </view>

    <view class="footer">数据云端同步 · 全端一致</view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  background: #f4f5f7;
  padding: 24rpx;
}
.hero {
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: 24rpx;
  color: #fff;
  padding: 44rpx 36rpx;
  margin-bottom: 24rpx;
}
.hero-label {
  font-size: 24rpx;
  opacity: 0.9;
}
.hero-value {
  font-size: 68rpx;
  font-weight: 700;
  margin: 16rpx 0 28rpx;
}
.hero-split {
  height: 1rpx;
  background: rgba(255, 255, 255, 0.25);
  margin-bottom: 22rpx;
}
.hero-rows {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}
.hero-row {
  display: flex;
  justify-content: space-between;
  font-size: 26rpx;
  opacity: 0.95;
}
.section-title {
  font-size: 26rpx;
  color: #86909c;
  margin: 8rpx 0 16rpx;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  overflow: hidden;
}
.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 30rpx;
  border-bottom: 1rpx solid #f4f4f4;
}
.row:last-child {
  border-bottom: none;
}
.row-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}
.row-icon {
  font-size: 36rpx;
}
.row-title {
  font-size: 29rpx;
  color: #1a1a1a;
}
.row-sub {
  font-size: 22rpx;
  color: #b0b3b8;
  margin-top: 4rpx;
}
.row-value {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.dim {
  color: #bbb;
  font-size: 26rpx;
}
.footer {
  text-align: center;
  color: #b2b2b2;
  font-size: 22rpx;
  padding: 32rpx 0 48rpx;
}
</style>
