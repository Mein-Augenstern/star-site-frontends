<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createUserRule } from '@/api'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const REPEATS = [
  { key: 'NONE', label: '不重复' },
  { key: 'WEEKLY', label: '每周' },
  { key: 'MONTHLY', label: '每月' },
  { key: 'ANNUAL', label: '每年' },
]

const members = ref<FamilyMemberVO[]>([])
const familyMemberId = ref<number | null>(null)
const title = ref('')
const firstRemindAt = ref(today())
const repeatType = ref('NONE')
const repeatUntil = ref('')
const submitting = ref(false)

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onLoad((options) => {
  // 报告详情"生成复查提醒"预填
  if (options?.familyMemberId) familyMemberId.value = Number(options.familyMemberId)
  if (options?.title) title.value = decodeURIComponent(options.title)
  if (options?.firstRemindAt) firstRemindAt.value = options.firstRemindAt
  if (options?.repeatType) repeatType.value = options.repeatType
})

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!members.value.length) {
    members.value = await listFamilyMembers().catch(() => [])
    const remembered = Number(uni.getStorageSync('metrics_last_member')) || null
    if (!familyMemberId.value && members.value.length) {
      familyMemberId.value = members.value.some((m) => m.id === remembered)
        ? remembered
        : members.value[0].id
    }
  }
})

function bindFirst(e: { detail: { value: string } }) {
  firstRemindAt.value = e.detail.value
}
function bindUntil(e: { detail: { value: string } }) {
  repeatUntil.value = e.detail.value
}

async function submit() {
  if (!familyMemberId.value) {
    uni.showToast({ title: '请选择成员', icon: 'none' })
    return
  }
  if (!title.value.trim()) {
    uni.showToast({ title: '请填写提醒内容', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createUserRule({
      familyMemberId: familyMemberId.value,
      title: title.value.trim(),
      firstRemindAt: firstRemindAt.value,
      repeatType: repeatType.value,
      repeatUntil: repeatUntil.value || undefined,
    })
    uni.showToast({ title: '已创建提醒', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="hero-wrap">
      <view class="hero-title">新建提醒</view>
      <view class="hero-sub">用药 / 复查 / 疫苗，到点自动进待办</view>
      <view class="hero-curve"></view>
    </view>

    <view class="body">
      <view class="card">
        <view class="fr">
          <view class="lb require">成员</view>
          <picker
            mode="selector"
            :range="members"
            range-key="name"
            @change="(e: any) => (familyMemberId = members[Number(e.detail.value)]?.id ?? null)"
          >
            <view class="pv">{{ members.find((m) => m.id === familyMemberId)?.name || '请选择' }} ›</view>
          </picker>
        </view>
        <view class="fr">
          <view class="lb require">提醒内容</view>
          <input v-model="title" class="ipt g" placeholder="如 林晓 补铁药 每晚" :maxlength="128" />
        </view>
        <view class="fr">
          <view class="lb require">首次提醒</view>
          <picker mode="date" :value="firstRemindAt" @change="bindFirst">
            <view class="pv">{{ firstRemindAt }} ›</view>
          </picker>
        </view>
        <view class="fr column">
          <view class="lb">重复</view>
          <view class="chips">
            <view
              v-for="r in REPEATS"
              :key="r.key"
              class="chip"
              :class="{ active: repeatType === r.key }"
              @click="repeatType = r.key"
            >{{ r.label }}</view>
          </view>
        </view>
        <view v-if="repeatType !== 'NONE'" class="fr">
          <view class="lb">重复到</view>
          <picker mode="date" :value="repeatUntil" @change="bindUntil">
            <view class="pv">{{ repeatUntil || '长期' }} ›</view>
          </picker>
        </view>
      </view>

      <view class="tip">到点后会出现在首页"最近要办的事"和提醒中心，可打卡完成。</view>

      <view class="btn-wrap">
        <button class="btn" :loading="submitting" @click="submit">创建提醒</button>
      </view>
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
.card { background: #fff; border-radius: 20rpx; padding: 8rpx 30rpx 16rpx; margin-bottom: 20rpx; }
.fr { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.fr:last-child { border-bottom: none; }
.fr.column { flex-direction: column; align-items: stretch; }
.lb { width: 160rpx; font-size: 28rpx; color: #1a1a1a; }
.lb.require::after { content: ' *'; color: #fa5151; }
.fr.column .lb { width: auto; margin-bottom: 14rpx; }
.pv { font-size: 28rpx; color: #4e5969; }
.ipt.g { flex: 1; font-size: 28rpx; text-align: right; }
.chips { display: flex; gap: 14rpx; flex-wrap: wrap; }
.chip { font-size: 25rpx; color: #4e5969; background: #f4f6f8; border-radius: 999rpx; padding: 10rpx 30rpx; }
.chip.active { background: rgba(7, 193, 96, 0.12); color: #07c160; font-weight: 600; }
.tip { font-size: 22rpx; color: #a2a8b0; line-height: 1.7; padding: 4rpx 12rpx; }
.btn-wrap { padding: 12rpx 0 0; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; }
</style>
