<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getReport, interpretReport, deleteReport } from '@/api/health'
import { ABNORMAL_FLAG } from '@/api/health'
import type { HealthIndicator } from '@/api/health'
import { createRecheckPlan } from '@/api/recheck'
import { listFamilyMembers } from '@/api'
import { getToken, BASE_URL } from '@/utils/request'
import type { HealthReport } from '@/api/health'

const report = ref<HealthReport | null>(null)
const aiText = ref('')
const aiTime = ref('')
const aiLoading = ref(false)
const aiError = ref('')
const memberName = ref('')

/** 复查套件弹层（A3）：一个异常指标 → 一条复查计划 */
const recheckTarget = ref<HealthIndicator | null>(null)
const recheckDate = ref('')
const dailyMonitoring = ref(false)
const recheckSubmitting = ref(false)

/** 指标名 → 日常监测类型映射（可挂每日监测打卡的才展示开关） */
const METRIC_TYPE: Record<string, string> = {
  收缩压: 'bp_sys', 舒张压: 'bp_dia', 高压: 'bp_sys', 低压: 'bp_dia',
  空腹血糖: 'glucose', 血糖: 'glucose', 体重: 'weight', 心率: 'heart_rate',
}

function defaultRecheckDate(): string {
  const d = new Date(Date.now() + 90 * 86400000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

function abnormalText(flag: number) {
  if (flag === ABNORMAL_FLAG.HIGH) return '↑ 偏高'
  if (flag === ABNORMAL_FLAG.LOW) return '↓ 偏低'
  return ''
}

function indicatorValue(i: HealthIndicator) {
  const v = i.valueNum != null ? i.valueNum : (i.valueText ?? '—')
  return `${v}${i.unit ?? ''}`
}

function refRange(i: HealthIndicator) {
  if (i.refLow == null && i.refHigh == null) return '—'
  return `${i.refLow ?? '-'} ~ ${i.refHigh ?? '-'}`
}

/** 异常指标 → 生成复查计划（复查套件：复查日提醒 + 可选每日监测） */
function openRecheck(i: HealthIndicator) {
  recheckTarget.value = i
  recheckDate.value = defaultRecheckDate()
  dailyMonitoring.value = !!METRIC_TYPE[i.itemName]
}

function closeRecheck() { recheckTarget.value = null }

function bindRecheckDate(e: { detail: { value: string } }) { recheckDate.value = e.detail.value }

async function submitRecheck() {
  const target = recheckTarget.value
  const r = report.value
  if (!target || !r) return
  recheckSubmitting.value = true
  try {
    await createRecheckPlan({
      familyMemberId: r.familyMemberId,
      reportId: r.id,
      indicatorId: target.id,
      targetDate: recheckDate.value,
      metricType: dailyMonitoring.value ? METRIC_TYPE[target.itemName] : undefined,
    })
    uni.showToast({ title: '已安排复查', icon: 'success' })
    recheckTarget.value = null
    setTimeout(() => uni.navigateTo({ url: '/pages/recheck/recheck' }), 600)
  } catch { /* toast 已弹 */ }
  finally { recheckSubmitting.value = false }
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
</script>

<template>
  <view class="page">
    <view v-if="report" class="content">
      <!-- 基本信息 -->
      <view class="card">
        <view class="card-title">{{ report.title }}</view>
        <view class="meta">
          <text>{{ memberName || '成员' }}</text>
          <text> · {{ report.checkupDate || report.reportYear + ' 年' }}</text>
          <text v-if="report.hospital"> · {{ report.hospital }}</text>
        </view>
        <view v-if="report.summary" class="summary">{{ report.summary }}</view>
        <view v-if="report.fileId" class="original-link" @click="viewOriginal">查看报告原件 ›</view>
      </view>

      <!-- 指标：异常置顶 + 红色箭头 + 点指标看趋势 + 一键安排复查 -->
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
          <view v-if="i.abnormalFlag > 0" class="recheck-act" @click.stop="openRecheck(i)">复查</view>
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
        <view class="del-link" @click="removeReport">删除报告</view>
      </view>
    </view>

    <!-- 复查套件弹层 -->
    <view v-if="recheckTarget" class="mask" @click="closeRecheck">
      <view class="sheet" @click.stop>
        <view class="sheet-title">安排复查 · {{ recheckTarget.itemName }}</view>
        <view class="sheet-sub">基线 {{ indicatorValue(recheckTarget) }}（参考 {{ refRange(recheckTarget) }}）</view>
        <view class="fr">
          <view class="lb">复查日期</view>
          <picker mode="date" :value="recheckDate" @change="bindRecheckDate">
            <view class="pv">{{ recheckDate }} ›</view>
          </picker>
        </view>
        <view v-if="METRIC_TYPE[recheckTarget.itemName]" class="fr">
          <view class="lb">每日监测</view>
          <view class="monitor" :class="{ on: dailyMonitoring }" @click="dailyMonitoring = !dailyMonitoring">
            <view class="monitor-dot"></view>
          </view>
        </view>
        <view v-if="METRIC_TYPE[recheckTarget.itemName]" class="sheet-tip">开启后每天提醒打卡记录{{ recheckTarget.itemName }}，至复查日截止</view>
        <view class="sheet-btns">
          <view class="sheet-cancel" @click="closeRecheck">取消</view>
          <button class="sheet-ok" :loading="recheckSubmitting" @click="submitRecheck">创建复查计划</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f7f7f7; padding: 16rpx 32rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 28rpx 30rpx; margin-bottom: 24rpx; }
.card-title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; }
.meta { font-size: 24rpx; color: #999; margin-top: 10rpx; }
.summary { font-size: 26rpx; color: #4e5969; margin-top: 16rpx; line-height: 1.6; }
.original-link { margin-top: 18rpx; font-size: 26rpx; color: #07c160; font-weight: 600; }
.section-title { font-size: 26rpx; color: #999; margin: 8rpx 0 16rpx; }
.ind-row { display: flex; align-items: center; padding: 20rpx 0; border-bottom: 1rpx solid #f4f4f4; }
.ind-row_active { background: #fafafa; }
.ind-row:last-child { border-bottom: none; }
.ind-row.abnormal .ind-value { color: #fa5151; font-weight: 600; }
.ind-name { flex: 1.3; font-size: 28rpx; color: #1a1a1a; }
.ind-value { flex: 1; text-align: right; font-size: 28rpx; color: #1a1a1a; }
.ind-ref { width: 140rpx; text-align: right; font-size: 22rpx; color: #b0b3b8; }
.abnormal-tag { margin-left: 8rpx; font-size: 20rpx; color: #fa5151; border: 1rpx solid #fa5151; border-radius: 6rpx; padding: 2rpx 8rpx; }
.recheck-act { font-size: 22rpx; color: #ff976a; border: 1rpx solid #ff976a; border-radius: 999rpx; padding: 6rpx 20rpx; margin-left: 16rpx; flex-shrink: 0; }
.ai-card { text-align: center; }
.ai-btn { background: #07c160; color: #fff; font-size: 28rpx; border-radius: 12rpx; margin: 0 auto; }
.ai-error { color: #ff976a; font-size: 26rpx; margin-top: 16rpx; }
.ai-loading { color: #999; font-size: 26rpx; padding: 16rpx 0; }
.ai-text { white-space: pre-wrap; text-align: left; font-size: 28rpx; color: #1a1a1a; line-height: 1.8; margin-top: 16rpx; }
.ai-time { color: #b0b3b8; font-size: 22rpx; margin-top: 16rpx; }
.footer { text-align: center; padding: 16rpx 0 48rpx; }
.del-link { display: inline-block; font-size: 25rpx; color: #fa5151; }
/* 复查套件弹层 */
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 99; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 36rpx 36rpx calc(36rpx + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; }
.sheet-sub { font-size: 24rpx; color: #8a9099; margin-top: 10rpx; }
.fr { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0 8rpx; }
.lb { font-size: 28rpx; color: #1a1a1a; }
.pv { font-size: 28rpx; color: #4e5969; }
.monitor { width: 92rpx; height: 52rpx; border-radius: 999rpx; background: #e5e7eb; padding: 6rpx; display: flex; }
.monitor.on { background: #07c160; justify-content: flex-end; }
.monitor-dot { width: 40rpx; height: 40rpx; border-radius: 50%; background: #fff; }
.sheet-tip { font-size: 22rpx; color: #a2a8b0; padding-bottom: 8rpx; }
.sheet-btns { display: flex; align-items: center; gap: 24rpx; margin-top: 24rpx; }
.sheet-cancel { flex: 1; text-align: center; font-size: 28rpx; color: #5c6470; background: #f2f3f5; border-radius: 12rpx; padding: 20rpx 0; }
.sheet-ok { flex: 1; background: #07c160; color: #fff; font-size: 28rpx; border-radius: 12rpx; }
</style>
