<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listIdentities, unbindIdentity, sendEmailCode, bindEmail, completeProfile } from '@/api/auth'
import type { IdentityVO } from '@/api/auth'
import { getToken } from '@/utils/request'

const TYPE_LABEL: Record<string, string> = {
  PASSWORD: '账号密码',
  WECHAT_MP: '微信',
  ALIPAY_MP: '支付宝',
  PHONE: '手机号',
  EMAIL: '邮箱',
}
const TYPE_ICON: Record<string, string> = {
  PASSWORD: '🔑', WECHAT_MP: '💬', ALIPAY_MP: '🅰', PHONE: '📱', EMAIL: '✉',
}

const identities = ref<IdentityVO[]>([])
const email = ref('')
const code = ref('')
const codeSent = ref(false)
const nickname = ref('')
const busy = ref(false)

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await load()
})

async function load() {
  identities.value = await listIdentities().catch(() => [])
}

async function remove(i: IdentityVO) {
  const res = await new Promise<boolean>((resolve) => {
    uni.showModal({
      title: `解绑${TYPE_LABEL[i.identityType] ?? i.identityType}`,
      content: `解绑后仍可用其他方式登录（至少保留一种）`,
      confirmColor: '#fa5151',
      success: (r) => resolve(!!r.confirm),
    })
  })
  if (!res) return
  try {
    await unbindIdentity(i.id)
    uni.showToast({ title: '已解绑', icon: 'success' })
    load()
  } catch { /* toast 已由 request 层弹出 */ }
}

async function sendCode() {
  if (!email.value.trim()) {
    uni.showToast({ title: '请输入邮箱', icon: 'none' })
    return
  }
  await sendEmailCode(email.value.trim())
  codeSent.value = true
  uni.showToast({ title: '验证码已发送（开发态见服务日志）', icon: 'none' })
}

async function doBind() {
  if (!code.value) {
    uni.showToast({ title: '请输入验证码', icon: 'none' })
    return
  }
  busy.value = true
  try {
    await bindEmail(email.value.trim(), code.value)
    uni.showToast({ title: '绑定成功', icon: 'success' })
    email.value = ''
    code.value = ''
    codeSent.value = false
    load()
  } finally {
    busy.value = false
  }
}

async function saveNickname() {
  if (!nickname.value.trim()) return
  await completeProfile({ nickname: nickname.value.trim() })
  uni.showToast({ title: '已保存', icon: 'success' })
  nickname.value = ''
}
</script>

<template>
  <view class="page">
    <view class="hero-wrap">
      <view class="hero-title">账号与安全</view>
      <view class="hero-sub">登录方式管理 · 绑定邮箱/手机号 · 资料完善</view>
      <view class="hero-curve"></view>
    </view>

    <view class="body">
      <view class="card">
        <view class="sec-head">我的登录方式</view>
        <view v-for="i in identities" :key="i.id" class="row">
          <view class="ico">{{ TYPE_ICON[i.identityType] ?? '🔗' }}</view>
          <view class="mid">
            <view class="name">{{ TYPE_LABEL[i.identityType] ?? i.identityType }}</view>
            <view class="desc">{{ i.identifier }}</view>
          </view>
          <view
            v-if="identities.length > 1"
            class="unlink"
            @click="remove(i)"
          >解绑</view>
        </view>
      </view>

      <view class="card">
        <view class="sec-head">绑定邮箱（选填 · 用于提醒推送与跨端找回）</view>
        <view class="fr">
          <input v-model="email" class="ipt g" placeholder="邮箱地址" />
          <view class="code-btn" @click="sendCode">发验证码</view>
        </view>
        <view v-if="codeSent" class="fr">
          <input v-model="code" class="ipt g" placeholder="6 位验证码" type="number" />
          <view class="code-btn primary" @click="doBind">绑定</view>
        </view>
      </view>

      <view class="card">
        <view class="sec-head">修改昵称</view>
        <view class="fr">
          <input v-model="nickname" class="ipt g" placeholder="新的昵称" />
          <view class="code-btn primary" @click="saveNickname">保存</view>
        </view>
      </view>

      <view class="tip">手机号绑定需短信通道（规划中）；微信登录后自动创建账号，可随时补充其他登录方式。</view>
    </view>
  </view>
</template>

<style>
@import '../../styles/icons.css';
.page { min-height: 100vh; background: #f4f5f7; padding: 0 0 48rpx; }
.hero-wrap { background: linear-gradient(180deg, #7ddba4 0%, #52cf8e 88%); padding: 28rpx 32rpx 0; }
.hero-title { font-size: 38rpx; font-weight: 700; color: #fff; }
.hero-sub { font-size: 23rpx; color: rgba(255, 255, 255, 0.8); margin-top: 6rpx; }
.hero-curve { height: 36rpx; background: #f4f5f7; border-radius: 36rpx 36rpx 0 0; margin: 24rpx -32rpx 0; }
.body { padding: 20rpx 32rpx 0; }
.card { background: #fff; border-radius: 20rpx; padding: 8rpx 30rpx 20rpx; margin-bottom: 24rpx; }
.sec-head { font-size: 22rpx; color: #98a0ab; padding: 18rpx 4rpx 8rpx; }
.row { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #f2f4f6; }
.row:last-child { border-bottom: none; }
.ico { font-size: 36rpx; margin-right: 20rpx; }
.mid { flex: 1; }
.name { font-size: 29rpx; color: #16233a; font-weight: 600; }
.desc { font-size: 23rpx; color: #a2a8b0; margin-top: 4rpx; }
.unlink { font-size: 24rpx; color: #fa5151; padding: 8rpx 0 8rpx 24rpx; }
.fr { display: flex; align-items: center; gap: 16rpx; padding: 16rpx 0; }
.ipt.g { flex: 1; height: 76rpx; background: #f4f6f8; border-radius: 12rpx; padding: 0 24rpx; font-size: 27rpx; }
.code-btn { font-size: 25rpx; color: #07c160; background: rgba(7, 193, 96, 0.1); border-radius: 999rpx; padding: 12rpx 26rpx; flex-shrink: 0; }
.code-btn.primary { background: #07c160; color: #fff; font-weight: 600; }
.tip { font-size: 22rpx; color: #a2a8b0; line-height: 1.7; padding: 8rpx 12rpx; }
</style>
