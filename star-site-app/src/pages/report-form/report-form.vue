<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createReport, addIndicators, ocrReport } from '@/api/health'
import type { OcrDraft } from '@/api/health'
import { listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken, BASE_URL } from '@/utils/request'

/** 指标模板：预置名称+单位+参考区间，用户只填数值 */
const TEMPLATES: Record<string, Array<{ itemName: string; itemGroup: string; unit: string; refLow?: number; refHigh?: number }>> = {
  血脂: [
    { itemName: '总胆固醇', itemGroup: '血脂', unit: 'mmol/L', refLow: 3.1, refHigh: 5.7 },
    { itemName: '甘油三酯', itemGroup: '血脂', unit: 'mmol/L', refLow: 0.4, refHigh: 1.7 },
    { itemName: '高密度脂蛋白', itemGroup: '血脂', unit: 'mmol/L', refLow: 1.04, refHigh: 1.55 },
    { itemName: '低密度脂蛋白', itemGroup: '血脂', unit: 'mmol/L', refLow: 2.1, refHigh: 3.4 },
  ],
  血糖: [{ itemName: '空腹血糖', itemGroup: '血糖', unit: 'mmol/L', refLow: 3.9, refHigh: 6.1 }],
  血常规: [
    { itemName: '血红蛋白', itemGroup: '血常规', unit: 'g/L', refLow: 115, refHigh: 150 },
    { itemName: '白细胞计数', itemGroup: '血常规', unit: '10^9/L', refLow: 3.5, refHigh: 9.5 },
  ],
}

interface Row { itemName: string; itemGroup: string; valueNum: string; unit: string; refLow: string; refHigh: string }

const members = ref<FamilyMemberVO[]>([])
const familyMemberId = ref<number | null>(null)
const reportYear = ref(new Date().getFullYear())
const checkupDate = ref('')
const hospital = ref('')
const title = ref('')
const rows = ref<Row[]>([])
const uploadedFileId = ref<number | null>(null)
const uploadedName = ref('')
const submitting = ref(false)

onShow(() => {
  if (!getToken()) { uni.reLaunch({ url: '/pages/login/login' }); return }
  // 记忆上次选择的成员/医院，全家逐一录入时省重复选择
  const lastMember = Number(uni.getStorageSync('report_last_member')) || null
  const lastHospital = uni.getStorageSync('report_last_hospital') || ''
  if (lastHospital && !hospital.value) hospital.value = lastHospital
  listFamilyMembers().then((ms) => {
    members.value = ms
    if (!familyMemberId.value && ms.length) {
      familyMemberId.value = ms.some((m) => m.id === lastMember) ? lastMember : ms[0].id
    }
  }).catch(() => {})
})

function applyTemplate(name: string) {
  const tpl = TEMPLATES[name]
  for (const t of tpl) {
    if (rows.value.some((r) => r.itemName === t.itemName)) continue
    rows.value.push({ itemName: t.itemName, itemGroup: t.itemGroup, valueNum: '', unit: t.unit, refLow: String(t.refLow ?? ''), refHigh: String(t.refHigh ?? '') })
  }
}

function addRow() {
  rows.value.push({ itemName: '', itemGroup: '', valueNum: '', unit: '', refLow: '', refHigh: '' })
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

/** 拍照/选图 → 上传 → OCR 草稿预填（图片走识别，原件同时归档关联报告） */
function shoot() {
  uni.chooseImage({ count: 1, sizeType: ['compressed'], success: (res) => {
    const path = res.tempFilePaths[0]
    ocrLoading.value = true
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
          const draft: OcrDraft = await ocrReport(upBody.data.fileId)
          if (draft.hospital) hospital.value = draft.hospital
          if (draft.title) title.value = draft.title
          if (draft.checkupDate && draft.checkupDate !== 'null') checkupDate.value = draft.checkupDate
          if (draft.reportYear) reportYear.value = draft.reportYear
          rows.value = draft.indicators.map((i) => ({
            itemName: i.itemName, itemGroup: i.itemGroup ?? '',
            valueNum: i.valueNum != null ? String(i.valueNum) : '',
            unit: i.unit ?? '', refLow: i.refLow != null ? String(i.refLow) : '',
            refHigh: i.refHigh != null ? String(i.refHigh) : '',
          }))
          uni.showToast({ title: `识别到 ${rows.value.length} 项，请核对`, icon: 'none' })
        } catch (e: any) {
          uni.showToast({ title: e?.message ?? '识别失败', icon: 'none' })
        } finally { ocrLoading.value = false }
      },
      fail: () => { ocrLoading.value = false; uni.showToast({ title: '上传失败', icon: 'none' }) },
    })
  } })
}

/** 上传 PDF 报告原件（不识别只归档，保存后关联到报告） */
function pickPdf() {
  // @ts-ignore 微信端专属 API
  wx.chooseMessageFile({
    count: 1,
    type: 'file',
    extension: ['pdf'],
    success: (res: any) => {
      const f = res.tempFiles?.[0]
      if (!f) return
      if (f.name && !f.name.toLowerCase().endsWith('.pdf')) {
        uni.showToast({ title: '请选择 PDF 文件', icon: 'none' })
        return
      }
      ocrLoading.value = true
      uni.uploadFile({
        url: `${BASE_URL}/file/upload?bizType=report`,
        filePath: f.path,
        name: 'file',
        header: { Authorization: `Bearer ${getToken()}` },
        success: (up) => {
          try {
            const upBody = JSON.parse(up.data)
            if (upBody.code !== 0) throw new Error(upBody.message)
            uploadedFileId.value = upBody.data.fileId
            uploadedName.value = upBody.data.name || f.name || '报告.pdf'
            if (!title.value) {
              title.value = uploadedName.value.replace(/\.pdf$/i, '')
            }
            uni.showToast({ title: 'PDF 已就绪，保存后归档', icon: 'none' })
          } catch (e: any) {
            uni.showToast({ title: e?.message ?? '上传失败', icon: 'none' })
          } finally { ocrLoading.value = false }
        },
        fail: () => { ocrLoading.value = false; uni.showToast({ title: '上传失败', icon: 'none' }) },
      })
    },
  })
}

function bindDate(e: { detail: { value: string } }) { checkupDate.value = e.detail.value }

async function submit() {
  if (!familyMemberId.value) { uni.showToast({ title: '请选择成员', icon: 'none' }); return }
  if (!rows.value.length || rows.value.some((r) => !r.itemName.trim())) {
    uni.showToast({ title: '至少一条有效指标', icon: 'none' }); return
  }
  submitting.value = true
  try {
    const r = await createReport({
      familyMemberId: familyMemberId.value, reportYear: reportYear.value,
      checkupDate: checkupDate.value || undefined, hospital: hospital.value,
      title: title.value || undefined, fileId: uploadedFileId.value ?? undefined,
    })
    await addIndicators(r.id, rows.value.map((x) => ({
      itemName: x.itemName.trim(), itemGroup: x.itemGroup || undefined,
      valueNum: x.valueNum ? Number(x.valueNum) : undefined, unit: x.unit || undefined,
      refLow: x.refLow ? Number(x.refLow) : undefined, refHigh: x.refHigh ? Number(x.refHigh) : undefined,
    })))
    uni.setStorageSync('report_last_member', familyMemberId.value)
    if (hospital.value.trim()) uni.setStorageSync('report_last_hospital', hospital.value.trim())
    uni.showToast({ title: '已录入', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 600)
  } finally { submitting.value = false }
}
</script>

<template>
  <view class="page">
    <view class="card">
      <button class="btn ocr" :loading="ocrLoading" @click="shoot">拍照识别报告（推荐）</button>
      <view class="ocr-tip">拍化验单/报告页，AI 自动填指标，核对后保存</view>
      <button class="btn pdf" :loading="ocrLoading" @click="pickPdf">上传 PDF 报告文件</button>
      <view class="ocr-tip" v-if="uploadedFileId">已附原件：{{ uploadedName }}，保存后可在详情查看</view>
      <view class="ocr-tip">PDF 直接归档不参与识别；需要识别请截图后拍照</view>
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
    </view>

    <view class="card">
      <view class="fr" style="border-bottom: none"><view class="lb">快捷模板</view>
        <view class="tpls">
          <view v-for="(t, name) in TEMPLATES" :key="name" class="tpl" @click="applyTemplate(String(name))">+{{ name }}</view>
          <view class="tpl" @click="addRow">+自定义</view>
        </view></view>
      <view v-for="(r, idx) in rows" :key="idx" class="ind">
        <view class="ind-head">
          <input v-model="r.itemName" class="ipt name" placeholder="指标名" />
          <view class="del" @click="removeRow(idx)">删除</view>
        </view>
        <view class="ind-row">
          <input v-model="r.valueNum" type="digit" class="ipt v" placeholder="数值" />
          <input v-model="r.unit" class="ipt u" placeholder="单位" />
          <input v-model="r.refLow" type="digit" class="ipt v" placeholder="参考下限" />
          <input v-model="r.refHigh" type="digit" class="ipt v" placeholder="参考上限" />
        </view>
      </view>
    </view>

    <view class="btn-wrap"><button class="btn" :loading="submitting" @click="submit">保存报告</button></view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f7f7f7; padding: 16rpx 32rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 8rpx 32rpx; margin-bottom: 24rpx; }
.fr { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.fr:last-child { border-bottom: none; }
.lb { width: 150rpx; font-size: 28rpx; color: #1a1a1a; }
.pv { font-size: 28rpx; color: #4e5969; }
.ipt { flex: 1; font-size: 28rpx; text-align: right; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; margin-top: 24rpx; }
.btn.ocr { margin-top: 20rpx; background: #fff; color: #07c160; border: 2rpx solid #07c160; }
.btn.pdf { margin-top: 20rpx; background: rgba(16, 174, 255, 0.08); color: #10aeff; border: 2rpx solid #10aeff; font-size: 27rpx; }
.ocr-tip { text-align: center; font-size: 22rpx; color: #999; padding: 12rpx 0 8rpx; }
.tpls { flex: 1; display: flex; gap: 14rpx; flex-wrap: wrap; justify-content: flex-end; }
.tpl { font-size: 24rpx; color: #07c160; background: rgba(7,193,96,.1); border-radius: 999rpx; padding: 8rpx 24rpx; }
.ind { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.ind-head { display: flex; align-items: center; }
.ipt.name { text-align: left; font-weight: 600; }
.del { font-size: 24rpx; color: #fa5151; padding: 4rpx 0 4rpx 20rpx; }
.ind-row { display: flex; gap: 12rpx; margin-top: 12rpx; }
.ipt.v { text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; }
.ipt.u { width: 110rpx; text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; }
.btn-wrap { padding: 8rpx 0 48rpx; }
</style>
