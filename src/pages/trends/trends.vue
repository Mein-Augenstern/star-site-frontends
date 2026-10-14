<script setup lang="ts">
import { onLoad } from '@dcloudio/uni-app'
import { ref, getCurrentInstance } from 'vue'
import { getTrends, ABNORMAL_FLAG } from '@/api/health'
import type { TrendPoint } from '@/api/health'
import { getToken } from '@/utils/request'

const itemName = ref('')
const memberName = ref('')
const points = ref<TrendPoint[]>([])
const loading = ref(true)
// setup 顶层同步捕获：await 之后再取 getCurrentInstance() 会拿到 null
const ins = getCurrentInstance()
let retried = false

onLoad(async (options) => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  itemName.value = decodeURIComponent(options?.itemName ?? '')
  memberName.value = decodeURIComponent(options?.memberName ?? '')
  uni.setNavigationBarTitle({ title: `${itemName.value}趋势` })
  const familyMemberId = Number(options?.familyMemberId)
  if (!familyMemberId || !itemName.value) return
  try {
    points.value = (await getTrends({ familyMemberId, itemName: itemName.value }))
      .filter((p) => p.valueNum != null)
    draw()
  } finally {
    loading.value = false
  }
})

/** canvas 2d 折线：参考区间绿带 + 数据线 + 异常红点 */
function draw() {
  const query = uni.createSelectorQuery().in(ins)
  query.select('#trend-chart').fields({ node: true, size: true }).exec((res) => {
    const item = res?.[0]
    if (!item?.node) {
      if (!retried) { retried = true; setTimeout(draw, 400) }
      return
    }
    if (points.value.length === 0) return
    const canvas = item.node
    const dpr = uni.getSystemInfoSync().pixelRatio || 2
    canvas.width = item.width * dpr
    canvas.height = item.height * dpr
    const ctx = canvas.getContext('2d')
    ctx.scale(dpr, dpr)
    const W = item.width
    const H = item.height
    const padL = 44
    const padR = 16
    const padT = 20
    const padB = 28

    const pts = points.value
    // 参考区间（同指标历年通常一致，取最宽口径）
    const refLows = pts.map((p) => p.refLow).filter((v): v is number => v != null)
    const refHighs = pts.map((p) => p.refHigh).filter((v): v is number => v != null)
    const refLow = refLows.length ? Math.min(...refLows) : null
    const refHigh = refHighs.length ? Math.max(...refHighs) : null
    const refAny = refLow != null && refHigh != null

    const values = pts.map((p) => p.valueNum as number)
    let min = Math.min(...values, ...(refAny ? [refLow as number] : []))
    let max = Math.max(...values, ...(refAny ? [refHigh as number] : []))
    if (min === max) { min -= 1; max += 1 }
    const span = max - min
    min -= span * 0.12
    max += span * 0.12

    const xAt = (i: number) =>
      pts.length === 1 ? (padL + W - padR) / 2 : padL + ((W - padL - padR) * i) / (pts.length - 1)
    const yAt = (v: number) => padT + (H - padT - padB) * (1 - (v - min) / (max - min))

    ctx.clearRect(0, 0, W, H)

    if (refAny) {
      ctx.fillStyle = 'rgba(7, 193, 96, 0.08)'
      ctx.fillRect(padL, yAt(refHigh as number), W - padL - padR, yAt(refLow as number) - yAt(refHigh as number))
      ctx.strokeStyle = 'rgba(7, 193, 96, 0.35)'
      ctx.setLineDash([4, 4])
      ctx.lineWidth = 1
      for (const v of [refLow, refHigh]) {
        ctx.beginPath()
        ctx.moveTo(padL, yAt(v as number))
        ctx.lineTo(W - padR, yAt(v as number))
        ctx.stroke()
      }
      ctx.setLineDash([])
    }

    ctx.strokeStyle = '#f0f0f0'
    ctx.fillStyle = '#b0b3b8'
    ctx.font = '10px sans-serif'
    ctx.lineWidth = 1
    for (let g = 0; g <= 4; g++) {
      const v = min + ((max - min) * g) / 4
      const y = yAt(v)
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(W - padR, y)
      ctx.stroke()
      ctx.fillText(fmtNum(v), 4, y + 3)
    }

    ctx.textAlign = 'center'
    pts.forEach((p, i) => {
      if (pts.length <= 6 || i % Math.ceil(pts.length / 6) === 0) {
        ctx.fillText(String(p.reportYear), xAt(i), H - 8)
      }
    })
    ctx.textAlign = 'left'

    ctx.strokeStyle = '#07c160'
    ctx.lineWidth = 2
    ctx.beginPath()
    pts.forEach((p, i) => {
      const x = xAt(i)
      const y = yAt(p.valueNum as number)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    if (pts.length > 1) ctx.stroke()

    pts.forEach((p, i) => {
      const x = xAt(i)
      const y = yAt(p.valueNum as number)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = p.abnormalFlag > ABNORMAL_FLAG.NORMAL ? '#fa5151' : '#07c160'
      ctx.fill()
      ctx.strokeStyle = '#fff'
      ctx.lineWidth = 1.5
      ctx.stroke()
    })
  })
}

function fmtNum(v: number) {
  return v >= 100 ? v.toFixed(0) : v >= 10 ? v.toFixed(1) : v.toFixed(2)
}

function openReport(p: TrendPoint) {
  uni.navigateTo({ url: `/pages/report-detail/detail?id=${p.reportId}` })
}
</script>

<template>
  <view class="page">
    <view class="head">
      <view class="title">{{ memberName || '成员' }} · {{ itemName }}</view>
      <view class="sub" v-if="points.length">共 {{ points.length }} 年数据 · 点数据点可看当年报告</view>
    </view>

    <view class="card chart-card">
      <canvas id="trend-chart" type="2d" class="chart"></canvas>
      <view v-if="!loading && points.length === 0" class="empty">该指标暂无多年数据，多录几年报告后自动生成趋势</view>
    </view>

    <view class="section-title">历年数值</view>
    <view class="card">
      <view
        v-for="p in [...points].reverse()"
        :key="p.reportId + '-' + p.reportYear"
        class="row"
        hover-class="row_active"
        @click="openReport(p)"
      >
        <view class="year">{{ p.reportYear }}</view>
        <view class="value" :class="{ abnormal: p.abnormalFlag > 0 }">
          {{ p.valueNum }}{{ p.unit }}
          <text v-if="p.abnormalFlag === ABNORMAL_FLAG.HIGH" class="tag">偏高</text>
          <text v-if="p.abnormalFlag === ABNORMAL_FLAG.LOW" class="tag">偏低</text>
        </view>
        <view class="arrow">›</view>
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
.row { display: flex; align-items: center; padding: 22rpx 8rpx; border-bottom: 1rpx solid #f4f4f4; }
.row:last-child { border-bottom: none; }
.row_active { background: #fafafa; }
.year { width: 120rpx; font-size: 28rpx; color: #1a1a1a; font-weight: 600; }
.value { flex: 1; font-size: 28rpx; color: #1a1a1a; }
.value.abnormal { color: #fa5151; font-weight: 600; }
.tag { margin-left: 10rpx; font-size: 20rpx; border: 1rpx solid #fa5151; color: #fa5151; border-radius: 6rpx; padding: 2rpx 8rpx; }
.arrow { color: #c8c9cc; font-size: 32rpx; }
</style>
