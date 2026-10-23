<script setup lang="ts">
import { ref } from 'vue'
import { login, wxLogin } from '@/api/auth'
import type { LoginVO } from '@/types/api'
import { setToken } from '@/utils/request'
import { openPrivacyPage, hasPrivacyConsent, setPrivacyConsent } from '@/utils/privacy'

const username = ref('')
const password = ref('')
const submitting = ref(false)

async function doWxLogin() {
  submitting.value = true
  try {
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (r) => resolve(r.code),
        fail: (e) => reject(new Error(e.errMsg || '微信登录失败')),
      })
    })
    afterLogin(await wxLogin(code))
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '微信登录失败', icon: 'none' })
  } finally { submitting.value = false }
}

async function pwdLogin() {
  if (!username.value.trim() || !password.value) {
    uni.showToast({ title: '请输入账号和密码', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    afterLogin(await login(username.value.trim(), password.value))
  } catch { /* toast 已弹 */ }
  finally { submitting.value = false }
}

function afterLogin(vo: LoginVO) {
  setToken(vo.token)
  uni.setStorageSync('star_site_d2_member', JSON.stringify(vo.member))
  // 登录即视为同意（指引可随时在"我的"查看）
  if (!hasPrivacyConsent()) setPrivacyConsent()
  uni.switchTab({ url: '/pages/index/index' })
}
</script>

<template>
  <view class="page">
    <view class="brand">
      <view class="brand-name">StarSite 家庭报告</view>
      <view class="brand-sub">把全家的体检报告装进微信，看懂每个异常指标</view>
    </view>

    <view class="card">
      <button class="btn wx" :loading="submitting" @click="doWxLogin">微信一键登录</button>
      <view class="divider">或 账号密码登录</view>
      <input v-model="username" class="ipt" placeholder="账号" />
      <input v-model="password" class="ipt" password placeholder="密码" />
      <button class="btn" :loading="submitting" @click="pwdLogin">登 录</button>
    </view>

    <view class="agreement">
      登录即同意
      <text class="link" @click="openPrivacyPage">《用户隐私保护指引》</text>
      （报告照片仅用于识别，可选不留存）
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f7f7f7; padding: 120rpx 48rpx 0; }
.brand { text-align: center; margin-bottom: 70rpx; }
.brand-name { font-size: 44rpx; font-weight: 700; color: #16233a; letter-spacing: 2rpx; }
.brand-sub { font-size: 25rpx; color: #8a9099; margin-top: 18rpx; }
.card { background: #fff; border-radius: 20rpx; padding: 40rpx 36rpx; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; margin-top: 8rpx; }
.btn.wx { margin-top: 0; }
.divider { text-align: center; font-size: 23rpx; color: #b4bac1; padding: 26rpx 0 6rpx; }
.ipt { border-bottom: 1rpx solid #eee; padding: 26rpx 4rpx; font-size: 29rpx; margin-top: 8rpx; }
.agreement { text-align: center; font-size: 22rpx; color: #a2a8b0; margin-top: 40rpx; line-height: 1.8; }
.link { color: #07c160; }
</style>
