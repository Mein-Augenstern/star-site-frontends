<script setup lang="ts">
import { onShow, onLoad } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createReport, addIndicators, ocrReport } from '@/api/health'
import type { OcrDraft } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken, BASE_URL } from '@/utils/request'
import { ensurePhotoConsent } from '@/utils/privacy'

interface Row {
  itemName: string
  itemGroup: string
  valueNum: string
  valueText: string
  unit: string
  refLow: string
  refHigh: string
}

const members = ref<FamilyMemberVO[]>([])
const familyMemberId = ref<number | null>(null)
const reportYear = ref(new Date().getFullYear())
const checkupDate = ref('')
const hospital = ref('')
const title = ref('')
const rows = ref<Row[]>([])
/** 阅后即焚（S1）：默认勾选——识别完成即不保留原件，只留结构化指标 */
const burnAfterRead = ref(true)
const uploadedFileId = ref<number | null>(null)
const uploadedName = ref('')
const ocrLoading = ref(false)
const ocrStage = ref('')
const submitting = ref(false)

onLoad((options) => {
  // 支持外部带 familyMemberId 预填（复查闭环「拍新报告」直达）
  const pre = Number(options?.familyMemberId)
  if (pre) familyMemberId.value = pre
})

onShow(() => {
  if (!getToken()) { uni.reLaunch({ url: '/pages/login/login' }); return }
  const lastMember = Number(uni.getStorageSync('d2_report_last_member')) || null
  const lastHospital = uni.getStorageSync('d2_report_last_hospital') || ''
  if (lastHospital && !hospital.value) hospital.value = lastHospital
  listFamilyMembers().then((ms) => {
    members.value = ms
    if (!familyMemberId.value && ms.length) {
      familyMemberId.value = ms.some((m) => m.id === lastMember) ? lastMember : ms[0].id
    }
  }).catch(() => {})
})

/** 拍照/选图：隐私单独同意（S2）→ 上传 → OCR 草稿预填 */
function shoot() {
  ensurePhotoConsent().then((ok) => {
    if (!ok) return
    uni.chooseImage({ count: 1, sizeType: ['compressed'], success: (res) => {
      const path = res.tempFilePaths[0]
      ocrLoading.value = true
      ocrStage.value = '上传照片…'
      uni.uploadFile({
        url: `${BASE_URL}/file/upload?bizType=report`,
        filePath: path,
        name: 'file',
        header: { Authorization: `Bearer ${getToken()}` },
        success: async (up) => {
          try {
            const upBody = JSON.parse(up.data)
            if (upBody.code !== 0) throw new Error(upBody.message)
            uploadedFileId.value = upBody.data.fileId
            uploadedName.value = upBody.data.name || ''
            ocrStage.value = 'AI 识别指标中，约 10 秒…'
            const draft: OcrDraft = await ocrReport(upBody.data.fileId)
            if (draft.hospital) hospital.value = draft.hospital
            if (draft.title) title.value = draft.title
            if (draft.checkupDate && draft.checkupDate !== 'null') checkupDate.value = draft.checkupDate
            if (draft.reportYear) reportYear.value = draft.reportYear
            rows.value = draft.indicators.map((i) => ({
              itemName: i.itemName, itemGroup: i.itemGroup ?? '',
              valueNum: i.valueNum != null ? String(i.valueNum) : '',
              valueText: i.valueText ?? '',
              unit: i.unit ?? '', refLow: i.refLow != null ? String(i.refLow) : '',
              refHigh: i.refHigh != null ? String(i.refHigh) : '',
            }))
            uni.showToast({ title: `识别到 ${rows.value.length} 项，请逐项核对`, icon: 'none' })
          } catch (e: any) {
            uni.showToast({ title: e?.message ?? '识别失败，可手动录入', icon: 'none' })
          } finally { ocrLoading.value = false; ocrStage.value = '' }
        },
        fail: () => { ocrLoading.value = false; ocrStage.value = ''; uni.showToast({ title: '上传失败', icon: 'none' }) },
      })
    } })
  })
}

function addRow() {
  rows.value.push({ itemName: '', itemGroup: '', valueNum: '', valueText: '', unit: '', refLow: '', refHigh: '' })
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

function bindDate(e: { detail: { value: string } }) { checkupDate.value = e.detail.value }

/** 缺参考区间的行：异常判定依赖区间，提醒用户补齐（低置信人工核对） */
function needRef(r: Row) {
  return !r.refLow && !r.refHigh
}

async function submit() {
  if (!familyMemberId.value) { uni.showToast({ title: '请选择成员', icon: 'none' }); return }
  if (!rows.value.length || rows.value.some((r) => !r.itemName.trim())) {
    uni.showToast({ title: '至少一条有效指标', icon: 'none' }); return
  }
  submitting.value = true
  try {
    // 阅后即焚：不把原件 fileId 关联到报告（文件仅参与本次识别）
    const r = await createReport({
      familyMemberId: familyMemberId.value, reportYear: reportYear.value,
      checkupDate: checkupDate.value || undefined, hospital: hospital.value,
      title: title.value || undefined,
      fileId: burnAfterRead.value ? undefined : (uploadedFileId.value ?? undefined),
    })
    await addIndicators(r.id, rows.value.map((x) => ({
      itemName: x.itemName.trim(), itemGroup: x.itemGroup || undefined,
      valueNum: x.valueNum ? Number(x.valueNum) : undefined,
      valueText: x.valueText || undefined,
      unit: x.unit || undefined,
      refLow: x.refLow ? Number(x.refLow) : undefined, refHigh: x.refHigh ? Number(x.refHigh) : undefined,
    })))
    uni.setStorageSync('d2_report_last_member', familyMemberId.value)
    if (hospital.value.trim()) uni.setStorageSync('d2_report_last_hospital', hospital.value.trim())
    uni.showToast({ title: burnAfterRead.value ? '已录入（原件未保留）' : '已录入', icon: 'success' })
    setTimeout(() => uni.redirectTo({ url: `/pages/report-detail/detail?id=${r.id}` }), 600)
  } finally { submitting.value = false }
}
</script>

<template>
  <view class="page">
    <view class="card">
      <button class="btn ocr" :loading="ocrLoading" @click="shoot">拍照识别报告</button>
      <view class="ocr-tip">照片仅用于识别，可选不留存</view>
      <view v-if="ocrLoading" class="ocr-stage">{{ ocrStage }}</view>
      <view class="burn-row" v-if="rows.length">
        <view class="burn-check" :class="{ on: burnAfterRead }" @click="burnAfterRead = !burnAfterRead">
          <view class="tick">{{ burnAfterRead ? '✓' : '' }}</view>
        </view>
        <view class="burn-text">
          <view class="burn-t">阅后即焚（推荐）</view>
          <view class="burn-s">识别完成后不保留报告原件，只保留指标数据</view>
        </view>
      </view>
    </view>

    <view class="card">
      <view class="fr"><view class="lb">成员</view>
        <picker mode="selector" :range="members" range-key="name" @change="(e: any) => (familyMemberId = members[Number(e.detail.value)]?.id ?? null)">
          <view class="pv">{{ members.find((m) => m.id === familyMemberId)?.name || '请选择' }} ›</view>
        </picker></view>
      <view class="fr"><view class="lb">年份</view><input v-model.number="reportYear" type="number" class="ipt" /></view>
      <view class="fr"><view class="lb">体检日期</view>
        <picker mode="date" :value="checkupDate" @change="bindDate"><view class="pv">{{ checkupDate || '选填' }} ›</view></picker></view>
      <view class="fr"><view class="lb">医院</view><input v-model="hospital" class="ipt" placeholder="选填" /></view>
      <view class="fr"><view class="lb">标题</view><input v-model="title" class="ipt" placeholder="选填，如 2026 年度体检" /></view>
    </view>

    <view class="card">
      <view class="fr head-fr">
        <view class="lb">指标（{{ rows.length }}）</view>
        <view class="add-row" @click="addRow">＋ 手动加一行</view>
      </view>
      <view v-for="(r, idx) in rows" :key="idx" class="ind">
        <view class="ind-head">
          <input v-model="r.itemName" class="ipt name" placeholder="指标名" />
          <view v-if="needRef(r)" class="warn-tag">请核对</view>
          <view class="del" @click="removeRow(idx)">删除</view>
        </view>
        <view class="ind-row">
          <input v-model="r.valueNum" type="digit" class="ipt v" placeholder="数值" />
          <input v-model="r.valueText" class="ipt u" placeholder="文本" />
          <input v-model="r.unit" class="ipt u" placeholder="单位" />
        </view>
        <view class="ind-row">
          <input v-model="r.refLow" type="digit" class="ipt v" placeholder="参考下限" />
          <input v-model="r.refHigh" type="digit" class="ipt v" placeholder="参考上限" />
        </view>
      </view>
    </view>

    <view class="btn-wrap"><button class="btn submit" :loading="submitting" @click="submit">保存报告</button></view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f7f7f7; padding: 16rpx 32rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 8rpx 32rpx; margin-bottom: 24rpx; }
.fr { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.fr:last-child { border-bottom: none; }
.head-fr { justify-content: space-between; }
.lb { width: 150rpx; font-size: 28rpx; color: #1a1a1a; }
.pv { font-size: 28rpx; color: #4e5969; }
.ipt { flex: 1; font-size: 28rpx; text-align: right; }
.add-row { font-size: 24rpx; color: #07c160; font-weight: 600; }
.btn.ocr { margin-top: 20rpx; background: #fff; color: #07c160; border: 2rpx solid #07c160; }
.btn.submit { width: 100%; background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; }
.ocr-tip { text-align: center; font-size: 22rpx; color: #999; padding: 12rpx 0 8rpx; }
.ocr-stage { text-align: center; font-size: 24rpx; color: #07c160; padding: 6rpx 0 14rpx; }
.burn-row { display: flex; align-items: flex-start; gap: 18rpx; padding: 20rpx 0 26rpx; border-top: 1rpx solid #f4f4f4; margin-top: 10rpx; }
.burn-check { width: 40rpx; height: 40rpx; border: 2rpx solid #c8c9cc; border-radius: 8rpx; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 4rpx; }
.burn-check.on { background: #07c160; border-color: #07c160; }
.tick { color: #fff; font-size: 26rpx; line-height: 1; }
.burn-t { font-size: 27rpx; color: #1a1a1a; font-weight: 600; }
.burn-s { font-size: 22rpx; color: #999; margin-top: 6rpx; }
.ind { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.ind-head { display: flex; align-items: center; }
.ipt.name { text-align: left; font-weight: 600; }
.warn-tag { font-size: 20rpx; color: #ff976a; border: 1rpx solid #ff976a; border-radius: 6rpx; padding: 2rpx 10rpx; margin-left: 12rpx; flex-shrink: 0; }
.del { font-size: 24rpx; color: #fa5151; padding: 4rpx 0 4rpx 20rpx; flex-shrink: 0; }
.ind-row { display: flex; gap: 12rpx; margin-top: 12rpx; }
.ipt.v { flex: 1; text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; }
.ipt.u { width: 130rpx; text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; }
.btn-wrap { padding: 8rpx 0 48rpx; }
</style>
