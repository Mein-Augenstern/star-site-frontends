<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getMyMember } from '@/api/auth'
import { clearToken, getToken } from '@/utils/request'
import type { MemberVO } from '@/types/api'

const member = ref<MemberVO | null>(null)

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  try {
    // 优先用本地缓存，后台静默刷新
    const cached = uni.getStorageSync('star_site_member')
    if (cached) member.value = JSON.parse(cached)
    member.value = await getMyMember()
    uni.setStorageSync('star_site_member', JSON.stringify(member.value))
  } catch {
    /* 静默失败保留缓存 */
  }
})

function logout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    confirmColor: '#07c160',
    success: (res) => {
      if (res.confirm) {
        clearToken()
        uni.reLaunch({ url: '/pages/login/login' })
      }
    },
  })
}

function goVisits() {
  uni.navigateTo({ url: '/pages/visits/visits' })
}

function goMetrics() {
  uni.navigateTo({ url: '/pages/metrics/metrics' })
}

function goPregnancy() {
  uni.navigateTo({ url: '/pages/pregnancy/pregnancy' })
}

function goSecurity() {
  uni.navigateTo({ url: '/pages/security/security' })
}

function goMembers() {
  uni.navigateTo({ url: '/pages/members/members' })
}

function goReminder() {
  uni.navigateTo({ url: '/pages/reminder/reminder' })
}
</script>

<template>
  <view class="page">
    <!-- 用户信息卡 -->
    <view class="profile">
      <view class="avatar">{{ (member?.nickname || member?.username || '?').slice(0, 1) }}</view>
      <view class="info">
        <view class="nickname">{{ member?.nickname || member?.username || '—' }}</view>
        <view class="username">账号：{{ member?.username ?? '—' }}</view>
      </view>
    </view>

    <view class="weui-cells__title">家庭成员</view>
    <view class="weui-cells">
      <view
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="goMembers()"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">成员管理</view>
          <view class="weui-cell__desc">添加 / 编辑成员，删除及数据说明</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
    </view>

    <view class="weui-cells__title">账号</view>
    <view class="weui-cells">
      <view
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="goSecurity()"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">账号与安全</view>
          <view class="weui-cell__desc">登录方式 / 绑定邮箱 / 资料完善</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
    </view>

    <view class="weui-cells__title">健康工具</view>
    <view class="weui-cells">
      <view
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="goMetrics()"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">健康记录</view>
          <view class="weui-cell__desc">血压 / 血糖 / 体重 / 心率，测完随手记</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
      <view
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="goPregnancy()"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">孕期助手</view>
          <view class="weui-cell__desc">孕周 / 预产期 / 产检计划 / 增重参考</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
      <view
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="goVisits()"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">就医记录</view>
          <view class="weui-cell__desc">就诊 / 诊断 / 用药摘要，全家共享</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
      <view
        class="weui-cell weui-cell_access"
        hover-class="weui-cell_active"
        @click="goReminder()"
      >
        <view class="weui-cell__bd">
          <view class="weui-cell__title">提醒中心</view>
          <view class="weui-cell__desc">复查 / 用药待办，可打卡与忽略</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
    </view>

    <view class="weui-cells__title">通用</view>
    <view class="weui-cells">
      <view class="weui-cell weui-cell_access" hover-class="weui-cell_active">
        <view class="weui-cell__bd">
          <view class="weui-cell__title">管理后台</view>
          <view class="weui-cell__desc">保单 / 证件资产管理：管理员专用 PC 后台</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
      <view class="weui-cell">
        <view class="weui-cell__bd">
          <view class="weui-cell__title">提醒邮件</view>
          <view class="weui-cell__desc">绑定邮箱后提醒将同步推送邮件</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
    </view>

    <view class="weui-cells__title">关于</view>
    <view class="weui-cells">
      <view class="weui-cell">
        <view class="weui-cell__bd">
          <view class="weui-cell__title">版本</view>
        </view>
        <view class="weui-cell__ft version">v1.0.0</view>
      </view>
      <view class="weui-cell weui-cell_access" hover-class="weui-cell_active" @click="logout">
        <view class="weui-cell__bd">
          <view class="weui-cell__title logout-text">退出登录</view>
        </view>
        <view class="weui-cell__ft weui-cell__ft_in-access"></view>
      </view>
    </view>

    <view class="weui-footer">StarSite 家庭管家 · 数据云端同步，全端一致</view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  background: #f7f7f7;
  padding-top: 16rpx;
}
.profile {
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: #fff;
  margin: 0 32rpx 24rpx;
  border-radius: 16rpx;
  padding: 36rpx 32rpx;
}
.avatar {
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  font-size: 48rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}
.nickname {
  font-size: 34rpx;
  font-weight: 600;
  color: #1a1a1a;
}
.username {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}
.weui-cells__title {
  margin: 8rpx 32rpx 16rpx;
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
.weui-cell__title {
  font-size: 30rpx;
  color: #1a1a1a;
}
.weui-cell__desc {
  font-size: 24rpx;
  color: #999;
  margin-top: 6rpx;
}
.weui-cell__ft.version {
  font-size: 26rpx;
  color: #999;
}
.logout-text {
  color: #fa5151;
}
.weui-footer {
  text-align: center;
  color: #b2b2b2;
  font-size: 22rpx;
  padding: 24rpx 0 48rpx;
}
</style>
