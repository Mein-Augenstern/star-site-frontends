<script setup lang="ts">
import { ref } from 'vue'
import { hasPrivacyConsent, setPrivacyConsent } from '@/utils/privacy'

const consented = ref(hasPrivacyConsent())

function agree() {
  setPrivacyConsent()
  consented.value = true
  uni.showToast({ title: '已记录同意', icon: 'success' })
  setTimeout(() => uni.navigateBack(), 600)
}
</script>

<template>
  <view class="page">
    <view class="upd">更新日期：2026-10-14</view>

    <view class="card">
      <view class="h">一、我们收集什么</view>
      <view class="p">为提供家庭体检报告管理服务，我们在你主动操作时收集：</view>
      <view class="li">1. 报告照片/PDF：仅用于 AI 识别提取指标。默认「阅后即焚」，识别完成即不保留原件，你也可以选择保留原件便于回看；</view>
      <view class="li">2. 结构化健康指标：如血压、血脂等数值与参考区间，用于趋势展示、异常标记与复查提醒；</view>
      <view class="li">3. 家庭成员档案：姓名、关系、生日（选填），用于区分报告归属；</view>
      <view class="li">4. 账号标识：微信登录换取的账号 id，用于登录鉴权。</view>
    </view>

    <view class="card">
      <view class="h">二、数据存在哪里</view>
      <view class="p">数据保存在家庭自有的服务器中，仅家庭成员在应用内可见，不向任何第三方提供、出售或用于广告。报告照片按上述策略保留或焚毁；健康数据传输全程加密（HTTPS）。</view>
    </view>

    <view class="card">
      <view class="h">三、你的权利</view>
      <view class="li">1. 随时在应用内查看、更正家庭成员的指标与报告；</view>
      <view class="li">2. 删除任意报告或成员档案（删除不可恢复）；</view>
      <view class="li">3. 保留原件的报告可随时删除原件、仅保留指标；</view>
      <view class="li">4. 注销使用即停止收集；如需彻底清除数据，请联系家庭管理员。</view>
    </view>

    <view class="card">
      <view class="p fine">健康数据属于敏感个人信息。本指引是产品对你的承诺；在微信正式版中，平台还会展示微信官方的《用户隐私保护指引》授权弹窗。本产品提供的健康解读仅为数据整理与提示，不构成医疗诊断，就医请遵医嘱。</view>
    </view>

    <view class="btn-wrap">
      <button v-if="!consented" class="btn" @click="agree">我已阅读并同意</button>
      <view v-else class="agreed">已同意（{{ new Date().toLocaleDateString() }}）</view>
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f7f7f7; padding: 16rpx 32rpx 60rpx; }
.upd { font-size: 22rpx; color: #b0b3b8; padding: 8rpx 8rpx 16rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx 30rpx; margin-bottom: 20rpx; }
.h { font-size: 30rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 14rpx; }
.p { font-size: 26rpx; color: #4e5969; line-height: 1.8; }
.li { font-size: 26rpx; color: #4e5969; line-height: 1.8; margin-top: 10rpx; }
.fine { font-size: 23rpx; color: #8a9099; }
.btn-wrap { padding: 16rpx 0 0; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; }
.agreed { text-align: center; font-size: 26rpx; color: #07c160; font-weight: 600; padding: 16rpx 0; }
</style>
