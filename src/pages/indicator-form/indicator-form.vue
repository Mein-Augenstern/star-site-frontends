<script setup lang="ts">
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getReport, addIndicators } from '@/api/health'
import { getToken } from '@/utils/request'

/** 指标模板：预置名称+单位+参考区间（与录入报告页同款口径） */
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
  肝功能: [
    { itemName: '谷丙转氨酶 ALT', itemGroup: '肝功能', unit: 'U/L', refLow: 9, refHigh: 50 },
    { itemName: '谷草转氨酶 AST', itemGroup: '肝功能', unit: 'U/L', refLow: 15, refHigh: 40 },
  ],
}

interface Row { itemName: string; itemGroup: string; valueNum: string; valueText: string; unit: string; refLow: string; refHigh: string }

const reportId = ref(0)
const reportTitle = ref('')
const existed = ref(false)
const rows = ref<Row[]>([])
const submitting = ref(false)

onLoad((options) => {
  reportId.value = Number(options?.reportId) || 0
})

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  if (!reportId.value) return
  const r = await getReport(reportId.value).catch(() => null)
  if (!r) return
  reportTitle.value = r.title
  if (r.indicators?.length) {
    existed.value = true
    rows.value = r.indicators.map((i) => ({
      itemName: i.itemName, itemGroup: i.itemGroup ?? '',
      valueNum: i.valueNum != null ? String(i.valueNum) : '',
      valueText: i.valueText ?? '', unit: i.unit ?? '',
      refLow: i.refLow != null ? String(i.refLow) : '',
      refHigh: i.refHigh != null ? String(i.refHigh) : '',
    }))
  }
})

function applyTemplate(name: string) {
  const tpl = TEMPLATES[name]
  for (const t of tpl) {
    if (rows.value.some((r) => r.itemName === t.itemName)) continue
    rows.value.push({ itemName: t.itemName, itemGroup: t.itemGroup, valueNum: '', valueText: '', unit: t.unit, refLow: String(t.refLow ?? ''), refHigh: String(t.refHigh ?? '') })
  }
}

function addRow() {
  rows.value.push({ itemName: '', itemGroup: '', valueNum: '', valueText: '', unit: '', refLow: '', refHigh: '' })
}

function removeRow(idx: number) {
  rows.value.splice(idx, 1)
}

async function submit() {
  const valid = rows.value.filter((r) => r.itemName.trim() && (r.valueNum || r.valueText))
  if (!valid.length) {
    uni.showToast({ title: '至少一条完整指标（名称+数值）', icon: 'none' })
    return
  }
  const doSave = async () => {
    submitting.value = true
    try {
      await addIndicators(reportId.value, valid.map((x) => ({
        itemName: x.itemName.trim(), itemGroup: x.itemGroup || undefined,
        valueNum: x.valueNum ? Number(x.valueNum) : undefined,
        valueText: x.valueText || undefined,
        unit: x.unit || undefined,
        refLow: x.refLow ? Number(x.refLow) : undefined,
        refHigh: x.refHigh ? Number(x.refHigh) : undefined,
      })))
      uni.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => uni.navigateBack(), 600)
    } finally {
      submitting.value = false
    }
  }
  if (existed.value) {
    uni.showModal({
      title: '覆盖确认',
      content: '该报告已有指标，保存将整体覆盖为本次内容（重录语义）。',
      confirmColor: '#fa5151',
      success: (r) => { if (r.confirm) doSave() },
    })
  } else {
    doSave()
  }
}
</script>

<template>
  <view class="page">
    <view class="hero-wrap">
      <view class="hero-title">录入指标</view>
      <view class="hero-sub">{{ reportTitle || '体检报告' }} · 保存将整体覆盖该报告指标</view>
      <view class="hero-curve"></view>
    </view>

    <view class="body">
      <view class="card">
        <view class="sec-head">快捷模板（已存在的自动跳过）</view>
        <view class="tpls">
          <view v-for="(t, name) in TEMPLATES" :key="name" class="tpl" @click="applyTemplate(String(name))">+{{ name }}</view>
        </view>
      </view>

      <view class="card">
        <view v-if="!rows.length" class="empty">还没有指标行，点上方模板或"+自定义"添加</view>
        <view v-for="(r, idx) in rows" :key="idx" class="ind">
          <view class="ind-head">
            <input v-model="r.itemName" class="ipt name" placeholder="指标名" />
            <view class="del" @click="removeRow(idx)">删除</view>
          </view>
          <view class="ind-row">
            <input v-model="r.valueNum" type="digit" class="ipt v" placeholder="数值" />
            <input v-model="r.valueText" class="ipt t" placeholder="文本(阴/阳)" />
            <input v-model="r.unit" class="ipt u" placeholder="单位" />
          </view>
          <view class="ind-row">
            <input v-model="r.refLow" type="digit" class="ipt v" placeholder="参考下限" />
            <input v-model="r.refHigh" type="digit" class="ipt v" placeholder="参考上限" />
          </view>
        </view>
      </view>

      <view class="btn-wrap">
        <button class="btn ghost" @click="addRow">＋ 加一行</button>
        <button class="btn" :loading="submitting" @click="submit">保存指标（{{ rows.length }} 项）</button>
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
.card { background: #fff; border-radius: 20rpx; padding: 8rpx 30rpx 20rpx; margin-bottom: 24rpx; }
.sec-head { font-size: 22rpx; color: #98a0ab; padding: 18rpx 4rpx 10rpx; }
.tpls { display: flex; gap: 14rpx; flex-wrap: wrap; padding-bottom: 14rpx; }
.tpl { font-size: 24rpx; color: #07c160; background: rgba(7, 193, 96, 0.1); border-radius: 999rpx; padding: 10rpx 26rpx; }
.empty { text-align: center; color: #a2a8b0; font-size: 25rpx; padding: 36rpx 0; }
.ind { padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.ind:last-child { border-bottom: none; }
.ind-head { display: flex; align-items: center; }
.ipt.name { text-align: left; font-weight: 600; font-size: 29rpx; }
.del { font-size: 24rpx; color: #fa5151; padding: 4rpx 0 4rpx 20rpx; }
.ind-row { display: flex; gap: 12rpx; margin-top: 12rpx; }
.ipt.v { flex: 1; text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; font-size: 27rpx; }
.ipt.t { width: 170rpx; text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; font-size: 27rpx; }
.ipt.u { width: 110rpx; text-align: center; border-bottom: 2rpx solid #eee; padding: 4rpx 0; font-size: 27rpx; }
.btn-wrap { padding: 8rpx 0; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; margin-top: 20rpx; }
.btn.ghost { background: rgba(7, 193, 96, 0.1); color: #07c160; }
</style>
