<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createVisit } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const members = ref<FamilyMemberVO[]>([])
const familyMemberId = ref<number | null>(null)
const visitDate = ref(today())
const hospital = ref('')
const department = ref('')
const diagnosis = ref('')
const medication = ref('')
const cost = ref('')
const submitting = ref(false)

function today() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

onShow(() => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  // 慢病复诊常去同一家医院：自动带上次的医院/科室，省重复输入
  if (!hospital.value) hospital.value = uni.getStorageSync('visit_last_hospital') || ''
  if (!department.value) department.value = uni.getStorageSync('visit_last_department') || ''
})

async function loadMembers() {
  if (members.value.length) return
  members.value = await listFamilyMembers().catch(() => [])
  if (!familyMemberId.value && members.value.length) {
    familyMemberId.value = members.value[0].id
  }
}
loadMembers()

function bindDateChange(e: { detail: { value: string } }) {
  visitDate.value = e.detail.value
}

async function submit() {
  if (!familyMemberId.value) {
    uni.showToast({ title: '请选择家庭成员', icon: 'none' })
    return
  }
  if (!hospital.value.trim()) {
    uni.showToast({ title: '请填写医院', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    await createVisit({
      familyMemberId: familyMemberId.value,
      visitDate: visitDate.value,
      hospital: hospital.value.trim(),
      department: department.value.trim(),
      diagnosis: diagnosis.value.trim(),
      medication: medication.value.trim(),
      cost: cost.value ? Number(cost.value) : undefined,
    })
    uni.setStorageSync('visit_last_hospital', hospital.value.trim())
    uni.setStorageSync('visit_last_department', department.value.trim())
    uni.showToast({ title: '已记录', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="card">
      <view class="form-row">
        <view class="label">家庭成员</view>
        <picker
          mode="selector"
          :range="members"
          range-key="name"
          @change="(e: any) => (familyMemberId = members[Number(e.detail.value)]?.id ?? null)"
        >
          <view class="picker-value">
            {{ members.find((m) => m.id === familyMemberId)?.name || '请选择' }}
            <text class="arrow">›</text>
          </view>
        </picker>
      </view>
      <view class="form-row">
        <view class="label">就诊日期</view>
        <picker mode="date" :value="visitDate" @change="bindDateChange">
          <view class="picker-value">{{ visitDate }} <text class="arrow">›</text></view>
        </picker>
      </view>
      <view class="form-row">
        <view class="label require">医院</view>
        <input v-model="hospital" class="ipt" placeholder="如 市第一人民医院" />
      </view>
      <view class="form-row">
        <view class="label">科室</view>
        <input v-model="department" class="ipt" placeholder="如 心内科" />
      </view>
    </view>

    <view class="card">
      <view class="form-row column">
        <view class="label">诊断</view>
        <textarea v-model="diagnosis" class="area" placeholder="医生给出的诊断（选填）" :maxlength="255" />
      </view>
      <view class="form-row column">
        <view class="label">用药/处方摘要</view>
        <textarea v-model="medication" class="area" placeholder="药名、剂量、频次（选填）" :maxlength="500" />
      </view>
      <view class="form-row">
        <view class="label">费用（元）</view>
        <input v-model="cost" class="ipt" type="digit" placeholder="选填" />
      </view>
    </view>

    <view class="btn-wrap">
      <button class="btn" :loading="submitting" @click="submit">保存</button>
    </view>
  </view>
</template>

<style>
.page {
  min-height: 100vh;
  background: #f7f7f7;
  padding: 16rpx 32rpx;
}
.card {
  background: #fff;
  border-radius: 16rpx;
  padding: 8rpx 32rpx;
  margin-bottom: 24rpx;
}
.form-row {
  display: flex;
  align-items: center;
  padding: 26rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.form-row.column {
  flex-direction: column;
  align-items: stretch;
}
.form-row:last-child {
  border-bottom: none;
}
.label {
  width: 180rpx;
  font-size: 28rpx;
  color: #1a1a1a;
}
.label.require::after {
  content: ' *';
  color: #fa5151;
}
.form-row.column .label {
  width: auto;
  margin-bottom: 16rpx;
}
.picker-value {
  flex: 1;
  font-size: 28rpx;
  color: #4e5969;
  text-align: right;
}
.picker-value .arrow {
  color: #c8c9cc;
  margin-left: 8rpx;
}
.ipt {
  flex: 1;
  font-size: 28rpx;
  text-align: right;
}
.area {
  width: 100%;
  min-height: 120rpx;
  font-size: 28rpx;
}
.btn-wrap {
  padding: 8rpx 0 48rpx;
}
.btn {
  background: #07c160;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
}
</style>
