<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { refreshMemberCache, cachedMember } from '@/api'
import { clearToken } from '@/utils/request'
import { openPrivacyPage } from '@/utils/privacy'
import type { MemberVO } from '@/types/api'

const member = ref<MemberVO | null>(null)

onShow(() => {
  member.value = cachedMember()
  refreshMemberCache().then((m) => (member.value = m)).catch(() => {})
})

function go(url: string) { uni.navigateTo({ url }) }

function comingSoon() {
  uni.showToast({ title: '规划中，本批次未开放', icon: 'none' })
}

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '退出后需重新登录才能查看全家报告',
    success: (res) => {
      if (!res.confirm) return
      clearToken()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}
</script>

<template>
  <view class="page">
    <view class="profile">
      <view class="avatar">{{ (member?.nickname || member?.username || '家').slice(0, 1) }}</view>
      <view class="p-main">
        <view class="p-name">{{ member?.nickname || member?.username || '未登录' }}</view>
        <view class="p-sub">家庭报告管理员</view>
      </view>
    </view>

    <view class="group">
      <view class="cell" hover-class="cell_hover" @click="go('/pages/members/members')">
        <view class="cell-t">家庭成员</view>
        <view class="cell-arrow">›</view>
      </view>
      <view class="cell" hover-class="cell_hover" @click="openPrivacyPage">
        <view class="cell-t">用户隐私保护指引</view>
        <view class="cell-arrow">›</view>
      </view>
      <view class="cell" hover-class="cell_hover" @click="comingSoon">
        <view class="cell-t">数据导出与查看记录</view>
        <view class="cell-tag">规划中</view>
        <view class="cell-arrow">›</view>
      </view>
    </view>

    <view class="group">
      <view class="cell" hover-class="cell_hover" @click="logout">
        <view class="cell-t danger">退出登录</view>
        <view class="cell-arrow">›</view>
      </view>
    </view>

    <view class="footer">
      <view class="f-slogan">把全家的体检报告装进微信</view>
      <view class="f-ver">StarSite 家庭报告 · demo2</view>
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f4f5f7; padding: 24rpx 32rpx 60rpx; }
.profile { display: flex; align-items: center; background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 34rpx 30rpx; margin-bottom: 24rpx; }
.avatar { width: 108rpx; height: 108rpx; border-radius: 50%; background: #07c160; color: #fff; font-size: 44rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.p-main { margin-left: 26rpx; }
.p-name { font-size: 33rpx; font-weight: 700; color: #16233a; }
.p-sub { font-size: 23rpx; color: #8a9099; margin-top: 8rpx; }
.group { background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 0 30rpx; margin-bottom: 24rpx; }
.cell { display: flex; align-items: center; padding: 30rpx 0; border-bottom: 1rpx solid #f2f4f6; }
.cell:last-child { border-bottom: none; }
.cell_hover { background: #fafbfc; }
.cell-t { flex: 1; font-size: 28rpx; color: #16233a; }
.cell-t.danger { color: #fa5151; }
.cell-tag { font-size: 20rpx; color: #a2a8b0; border: 1rpx solid #d8dce1; border-radius: 6rpx; padding: 2rpx 12rpx; margin-right: 12rpx; }
.cell-arrow { color: #c8c9cc; font-size: 32rpx; }
.footer { text-align: center; padding-top: 24rpx; }
.f-slogan { font-size: 24rpx; color: #a2a8b0; }
.f-ver { font-size: 21rpx; color: #c3c8cf; margin-top: 10rpx; }
</style>
