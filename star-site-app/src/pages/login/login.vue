<script setup lang="ts">
import { ref } from 'vue'
import { login } from '@/api/auth'
import { silentWxLogin } from '@/utils/auth'
import { setToken } from '@/utils/request'

const username = ref('')
const password = ref('')
const loading = ref(false)
const wxLoading = ref(false)

async function handleWxLogin() {
  wxLoading.value = true
  try {
    const ok = await silentWxLogin()
    if (ok) {
      uni.switchTab({ url: '/pages/index/index' })
    } else {
      uni.showToast({ title: '微信登录失败，可用账号密码登录', icon: 'none' })
    }
  } finally {
    wxLoading.value = false
  }
}

async function handleLogin() {
  if (!username.value.trim() || !password.value) {
    uni.showToast({ title: '请输入账号密码', icon: 'none' })
    return
  }
  loading.value = true
  try {
    const vo = await login(username.value.trim(), password.value)
    setToken(vo.token)
    uni.setStorageSync('star_site_member', JSON.stringify(vo.member))
    uni.switchTab({ url: '/pages/index/index' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <view class="login">
    <view class="brand">
      <text class="brand-name">StarSite</text>
      <text class="brand-sub">家庭管家</text>
    </view>
    <button class="wx-btn" :loading="wxLoading" @click="handleWxLogin">微信一键登录</button>
    <view class="wx-tip">未注册的微信将自动创建账号</view>
    <view class="divider"><text>或使用账号密码</text></view>
    <view class="form">
      <input v-model="username" class="ipt" placeholder="账号" />
      <input v-model="password" class="ipt" password placeholder="密码" />
      <button class="btn" :loading="loading" @click="handleLogin">登 录</button>
    </view>
  </view>
</template>

<style>
.login {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 120rpx;
  background: #f8f8f8;
}
.brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 80rpx;
}
.brand-name {
  font-size: 48rpx;
  font-weight: 700;
  color: #1d2129;
}
.brand-sub {
  font-size: 26rpx;
  color: #86909c;
  margin-top: 8rpx;
}
.form {
  width: 80%;
}
.wx-btn {
  width: 80%;
  background: #07c160;
  color: #fff;
  border-radius: 999rpx;
  font-size: 30rpx;
  font-weight: 600;
}
.wx-tip {
  font-size: 22rpx;
  color: #a2a8b0;
  margin-top: 12rpx;
}
.divider {
  display: flex;
  align-items: center;
  gap: 20rpx;
  width: 80%;
  margin: 48rpx 0 32rpx;
  color: #b4bac1;
  font-size: 22rpx;
}
.divider::before,
.divider::after {
  content: '';
  flex: 1;
  height: 1rpx;
  background: #e5e7eb;
}
.ipt {
  height: 88rpx;
  background: #fff;
  border-radius: 12rpx;
  padding: 0 24rpx;
  margin-bottom: 24rpx;
  font-size: 28rpx;
}
.btn {
  background: #4080ff;
  color: #fff;
  border-radius: 12rpx;
  font-size: 30rpx;
  margin-top: 16rpx;
}
</style>
