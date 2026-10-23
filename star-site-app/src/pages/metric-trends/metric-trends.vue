<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref, getCurrentInstance } from 'vue'
import { metricTrends } from '@/api/health'
import type { MetricTrendPoint } from '@/api/health'
import { getToken } from '@/utils/request'

const TYPE_LABEL: Record<string, string> = {
  weight: '体重', bp_sys: '血压·高压', bp_dia: '血压·低压', glucose: '血糖', heart_rate: '心率',
}
const TYPE_UNIT: Record<string, string> = { weight: 'kg', bp_sys: 'mmHg', bp_dia: 'mmHg', glucose: 'mmol/L', heart_rate: '次/分' }

const typeKey = ref('weight')
const memberName = ref('')
const points = ref<MetricTrendPoint[]>([])
const loading = ref(true)
// setup 顶层同步捕获：await 之后再取 getCurrentInstance() 会拿到 null（Vue3 实例上下文已回收）
const ins = getCurrentInstance()
let retried = false

onLoad(async (options) => {
  if (!getToken()) { uni.reLaunch({ url: '/pages/login/login' }); return }
  typeKey.value = options?.metricType || 'weight'
  memberName.value = decodeURIComponent(options?.memberName ?? '')
  uni.setNavigationBarTitle({ title: `${memberName.value || ''}${TYPE_LABEL[typeKey.value] || ''}曲线` })
  const familyMemberId = Number(options?.familyMemberId)
  if (!familyMemberId) return
  try {
    points.value = await metricTrends({ familyMemberId, metricType: typeKey.value })
    draw()
  } finally { loading.value = false }
})

function draw() {
  const query = uni.createSelectorQuery().in(ins)
  query.select('#m-chart').fields({ node: true, size: true }).exec((res) => {
    const item = res?.[0]
    if (!item?.node) {
      // onLoad 阶段 canvas 节点可能尚未挂载，退避重试一次
      if (!retried) { retried = true; setTimeout(draw, 400) }
      return
    }
    const canvas = item.node
    const dpr = uni.getSystemInfoSync().pixelRatio || 2
    canvas.width = item.width * dpr
    canvas.height = item.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = item.width, H = item.height, padL = 44, padR = 16, padT = 20, padB = 26
    const pts = points.value
    const values = pts.map((p) => p.valueNum)
    let min = Math.min(...values), max = Math.max(...values)
    if (min === max) { min -= 1; max += 1 }
    const span = max - min
    min -= span * 0.12; max += span * 0.12
    const xAt = (i: number) => (pts.length === 1 ? (padL + W - padR) / 2 : padL + ((W - padL - padR) * i) / (pts.length - 1))
    const yAt = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min))
    ctx.clearRect(0, 0, W, H)
    ctx.strokeStyle = '#f0f0f0'; ctx.fillStyle = '#b0b3b8'; ctx.font = '10px sans-serif'; ctx.lineWidth = 1
    for (let g = 0; g <= 4; g++) {
      const v = min + ((max - min) * g) / 4, y = yAt(v)
      ctx.beginPath(); ctx.moveTo(padL, y); ctx.lineTo(W - padR, y); ctx.stroke()
      ctx.fillText(v >= 100 ? v.toFixed(0) : v.toFixed(1), 4, y + 3)
    }
    ctx.textAlign = 'center'
    pts.forEach((p, i) => {
      if (pts.length <= 6 || i % Math.ceil(pts.length / 6) === 0) ctx.fillText(p.metricDate.slice(5), xAt(i), H - 8)
    })
    ctx.textAlign = 'left'
    ctx.strokeStyle = '#07c160'; ctx.lineWidth = 2
    ctx.beginPath()
    pts.forEach((p, i) => { i === 0 ? ctx.moveTo(xAt(i), yAt(p.valueNum)) : ctx.lineTo(xAt(i), yAt(p.valueNum)) })
    if (pts.length > 1) ctx.stroke()
    pts.forEach((p, i) => {
      ctx.beginPath(); ctx.arc(xAt(i), yAt(p.valueNum), 4, 0, Math.PI * 2)
      ctx.fillStyle = '#07c160'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.stroke()
    })
  })
}
</script>

<template>
  <view class="page">
    <view class="head">
      <view class="title">{{ memberName }} · {{ TYPE_LABEL[typeKey] }}（{{ TYPE_UNIT[typeKey] }}）</view>
      <view class="sub" v-if="points.length">共 {{ points.length }} 次记录 · 首次 {{ points[0].metricDate }}</view>
    </view>
    <view class="card chart-card">
      <canvas id="m-chart" type="2d" class="chart"></canvas>
      <view v-if="!loading && points.length === 0" class="empty">还没有{{ TYPE_LABEL[typeKey] }}记录，去健康记录页记一笔</view>
    </view>
    <view class="section-title">历次数值</view>
    <view class="card">
      <view v-for="p in [...points].reverse()" :key="p.metricDate" class="row">
        <view class="d">{{ p.metricDate }}</view>
        <view class="v">{{ p.valueNum }} {{ TYPE_UNIT[typeKey] }}</view>
      </view>
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f7f7f7; padding: 16rpx 32rpx; }
.head { padding: 8rpx 8rpx 20rpx; }
.title { font-size: 34rpx; font-weight: 700; color: #1a1a1a; }
.sub { font-size: 24rpx; color: #999; margin-top: 8rpx; }
.card { background: #fff; border-radius: 16rpx; padding: 24rpx; margin-bottom: 24rpx; }
.chart-card { padding: 16rpx 8rpx; }
.chart { width: 100%; height: 420rpx; }
.empty { text-align: center; color: #999; font-size: 26rpx; padding: 60rpx 24rpx; }
.section-title { font-size: 26rpx; color: #999; margin: 8rpx 8rpx 16rpx; }
.row { display: flex; justify-content: space-between; padding: 20rpx 8rpx; border-bottom: 1rpx solid #f4f4f4; }
.row:last-child { border-bottom: none; }
.d { font-size: 28rpx; color: #4e5969; }
.v { font-size: 28rpx; color: #07c160; font-weight: 600; }
</style>
