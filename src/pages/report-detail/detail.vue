<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getReport, interpretReport, deleteReport } from '@/api/health'
import { listFamilyMembers } from '@/api'
import { getToken, BASE_URL } from '@/utils/request'
import type { HealthReport } from '@/types/api'

const report = ref<HealthReport | null>(null)
const aiText = ref('')
const aiTime = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const memberName = ref('')

function viewOriginal() {
  const fid = report.value?.fileId
  if (!fid) return
  uni.showLoading({ title: '加载原件…' })
  uni.downloadFile({
    url: `${BASE_URL}/file/${fid}/view`,
    header: { Authorization: `Bearer ${getToken()}` },
    success: (res) => {
      if (res.statusCode !== 200) {
        uni.showToast({ title: '原件加载失败', icon: 'none' })
        return
      }
      const path = res.tempFilePath
      const isPdf = path.toLowerCase().includes('.pdf') ||
        (res.header as Record<string, string>)?.['Content-Type']?.includes('pdf')
      if (isPdf) {
        uni.openDocument({ filePath: path, fileType: 'pdf', showMenu: true, fail: () => uni.showToast({ title: '无法打开 PDF', icon: 'none' }) })
      } else {
        uni.previewImage({ urls: [path] })
      }
    },
    fail: () => uni.showToast({ title: '下载失败', icon: 'none' }),
    complete: () => uni.hideLoading(),
  })
}

onLoad(async (options) => {
  const id = Number(options?.id)
  if (!id) return
  try {
    report.value = await getReport(id)
  } catch (e: any) {
    uni.showToast({ title: e?.message ?? '加载失败', icon: 'none' })
  }
})

onShow(async () => {
  // 成员名仅用于趋势页标题展示，静默降级
  if (!memberName.value && report.value) {
    const members = await listFamilyMembers().catch(() => [])
    memberName.value = members.find((m) => m.id === report.value?.familyMemberId)?.name ?? ''
  }
})

function openTrend(itemName: string) {
  if (!report.value) return
  uni.navigateTo({
    url: `/pages/trends/trends?familyMemberId=${report.value.familyMemberId}` +
      `&itemName=${encodeURIComponent(itemName)}` +
      `&memberName=${encodeURIComponent(memberName.value)}`,
  })
}

function hasAbnormal() {
  return !!report.value?.indicators?.some((i) => i.abnormalFlag > 0)
}

function goReviewReminder() {
  const r = report.value
  if (!r) return
  const first = new Date(Date.now() + 7 * 86400000)
  const d = `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, '0')}-${String(first.getDate()).padStart(2, '0')}`
  uni.navigateTo({
    url: `/pages/rule-form/rule-form?familyMemberId=${r.familyMemberId}` +
      `&title=${encodeURIComponent(`${memberName.value || '成员'} 复查提醒（${r.title}）`)}` +
      `&firstRemindAt=${d}&repeatType=NONE`,
  })
}

function editIndicators() {
  if (!report.value) return
  uni.navigateTo({ url: `/pages/indicator-form/indicator-form?reportId=${report.value.id}` })
}

function removeReport() {
  if (!report.value) return
  uni.showModal({
    title: '删除报告',
    content: `删除「${report.value.title}」及其指标？该操作不可恢复。`,
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return
      await deleteReport(report.value!.id)
      uni.showToast({ title: '已删除', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 600)
    },
  })
}

async function runAi(force = false) {
  if (!report.value) return
  aiLoading.value = true
  aiError.value = ''
  try {
    const r = await interpretReport(report.value.id, force)
    aiText.value = r.text
    aiTime.value = r.interpretedAt ?? ''
  } catch (e: any) {
    aiError.value = e?.message ?? 'AI 解读失败'
  } finally {
    aiLoading.value = false
  }
}

function abnormalText(flag: number) {
  if (flag === 1) return '偏高'
  if (flag === 2) return '偏低'
  return ''
}

function indicatorValue(i: { valueNum: number | null; valueText: string | null; unit: string }) {
  const v = i.valueNum != null ? i.valueNum : (i.valueText ?? '—')
  return `${v}${i.unit ?? ''}`
}

function refRange(i: { refLow: number | null; refHigh: number | null }) {
  if (i.refLow == null && i.refHigh == null) return '—'
  return `${i.refLow ?? '-'} ~ ${i.refHigh ?? '-'}`
}
</script>

<template>
  <view class="page">
    <view v-if="report" class="content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">{{ report.title }}</view>
        <view class="meta">
          <text>{{ report.checkupDate || report.reportYear + ' 年' }}</text>
          <text v-if="report.hospital"> · {{ report.hospital }}</text>
        </view>
        <view v-if="report.summary" class="summary">{{ report.summary }}</view>
        <view v-if="report.fileId" class="original-link" @click="viewOriginal">查看报告原件（拍照件/PDF） ›</view>
      </view>

      <!-- 指标 -->
      <view class="section-title">体检指标（{{ report.indicators?.length ?? 0 }} 项）· 点指标看趋势</view>
      <view class="card">
        <view
          v-for="(i, idx) in report.indicators ?? []"
          :key="idx"
          class="ind-row"
          :class="{ abnormal: i.abnormalFlag > 0 }"
          hover-class="ind-row_active"
          @click="openTrend(i.itemName)"
        >
          <view class="ind-name">
            {{ i.itemName }}
            <text v-if="i.abnormalFlag > 0" class="abnormal-tag">{{ abnormalText(i.abnormalFlag) }}</text>
          </view>
          <view class="ind-value">{{ indicatorValue(i) }}</view>
          <view class="ind-ref">{{ refRange(i) }}</view>
        </view>
      </view>

      <!-- AI 解读 -->
      <view class="section-title">AI 解读</view>
      <view class="card ai-card">
        <button class="ai-btn" :loading="aiLoading" @click="runAi(false)">
          {{ aiText ? '重新解读' : 'AI 解读报告' }}
        </button>
        <view v-if="aiError" class="ai-error">{{ aiError }}</view>
        <view v-if="aiLoading" class="ai-loading">AI 正在阅读报告…</view>
        <view v-if="aiText" class="ai-text">{{ aiText }}</view>
        <view v-if="aiTime" class="ai-time">解读时间 {{ aiTime.replace('T', ' ').slice(0, 16) }} · 仅供参考，不构成医疗诊断</view>
      </view>

      <view class="footer">
        <view class="edit-link" @click="editIndicators">＋ 录入 / 编辑指标</view>
        <view class="del-link" @click="removeReport">删除报告</view>
        <view v-if="hasAbnormal()" class="review-link" @click="goReviewReminder">
          检出异常指标 → 生成复查提醒
        </view>
      </view>
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
  padding: 28rpx 30rpx;
  margin-bottom: 24rpx;
}
.card-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a1a1a;
}
.meta {
  font-size: 24rpx;
  color: #999;
  margin-top: 10rpx;
}
.summary {
  font-size: 26rpx;
  color: #4e5969;
  margin-top: 16rpx;
  line-height: 1.6;
}
.original-link {
  margin-top: 18rpx;
  font-size: 26rpx;
  color: #07c160;
  font-weight: 600;
}
.section-title {
  font-size: 26rpx;
  color: #999;
  margin: 8rpx 0 16rpx;
}
.ind-row {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f4f4f4;
}
.ind-row_active {
  background: #fafafa;
}
.ind-row:last-child {
  border-bottom: none;
}
.ind-row.abnormal .ind-value {
  color: #fa5151;
  font-weight: 600;
}
.ind-name {
  flex: 1.4;
  font-size: 28rpx;
  color: #1a1a1a;
}
.ind-value {
  flex: 1;
  text-align: right;
  font-size: 28rpx;
  color: #1a1a1a;
}
.ind-ref {
  width: 160rpx;
  text-align: right;
  font-size: 22rpx;
  color: #b0b3b8;
}
.abnormal-tag {
  margin-left: 8rpx;
  font-size: 20rpx;
  color: #fa5151;
  border: 1rpx solid #fa5151;
  border-radius: 6rpx;
  padding: 2rpx 8rpx;
}
.ai-card {
  text-align: center;
}
.ai-btn {
  background: #07c160;
  color: #fff;
  font-size: 28rpx;
  border-radius: 12rpx;
  margin: 0 auto;
}
.ai-error {
  color: #ff976a;
  font-size: 26rpx;
  margin-top: 16rpx;
}
.ai-loading {
  color: #999;
  font-size: 26rpx;
  padding: 16rpx 0;
}
.ai-text {
  white-space: pre-wrap;
  text-align: left;
  font-size: 28rpx;
  color: #1a1a1a;
  line-height: 1.8;
  margin-top: 16rpx;
}
.ai-time {
  color: #b0b3b8;
  font-size: 22rpx;
  margin-top: 16rpx;
}
.footer {
  text-align: center;
  padding: 16rpx 0 48rpx;
}
.review-link {
  margin-top: 20rpx;
  font-size: 26rpx;
  color: #ff976a;
  font-weight: 600;
}
.del-link {
  display: inline-block;
  margin-left: 28rpx;
  font-size: 25rpx;
  color: #fa5151;
}
.edit-link {
  display: inline-block;
  font-size: 27rpx;
  color: #07c160;
  font-weight: 600;
  background: rgba(7, 193, 96, 0.1);
  border-radius: 999rpx;
  padding: 16rpx 44rpx;
}
</style>
