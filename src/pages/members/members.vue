<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { createMember, updateMember, deleteMember, listFamilyMembers } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import { getToken } from '@/utils/request'

const RELATIONS = [
  { key: 'self', label: '本人' },
  { key: 'spouse', label: '配偶' },
  { key: 'father', label: '父亲' },
  { key: 'mother', label: '母亲' },
  { key: 'child', label: '子女' },
  { key: 'other', label: '其他' },
]
const relLabel = (r: string) => RELATIONS.find((x) => x.key === r)?.label ?? r

const members = ref<FamilyMemberVO[]>([])
const loading = ref(true)
const editing = ref<FamilyMemberVO | null>(null) // null=列表态
const formMode = ref<'add' | 'edit'>('add')
const form = ref({ name: '', relation: 'other', gender: 0, birthDate: '', phone: '', remark: '' })
const submitting = ref(false)

function ageOf(m: FamilyMemberVO): string {
  if (!m.birthDate) return ''
  const a = Math.floor((Date.now() - new Date(m.birthDate).getTime()) / 31557600000)
  return a > 0 && a < 120 ? `${a}岁` : ''
}

onShow(async () => {
  if (!getToken()) {
    uni.reLaunch({ url: '/pages/login/login' })
    return
  }
  await load()
})

async function load() {
  loading.value = true
  try {
    members.value = await listFamilyMembers().catch(() => [])
  } finally {
    loading.value = false
  }
}

function openAdd() {
  formMode.value = 'add'
  form.value = { name: '', relation: 'other', gender: 0, birthDate: '', phone: '', remark: '' }
  editing.value = {} as FamilyMemberVO
}

function openEdit(m: FamilyMemberVO) {
  formMode.value = 'edit'
  form.value = {
    name: m.name, relation: m.relation, gender: m.gender ?? 0,
    birthDate: m.birthDate ?? '', phone: '', remark: m.remark ?? '',
  }
  editing.value = m
}

function backToList() {
  editing.value = null
}

function bindBirth(e: { detail: { value: string } }) {
  form.value.birthDate = e.detail.value
}

function pickRelation(idx: number) {
  // self 仅允许编辑资料，不允许把别人改成 self 造成多本人
  const target = RELATIONS[idx]
  if (target.key === 'self' && formMode.value === 'add') {
    uni.showToast({ title: '本人信息随账号自动创建', icon: 'none' })
    return
  }
  if (target.key === 'self' && formMode.value === 'edit' && editing.value?.relation !== 'self') {
    uni.showToast({ title: '不能将成员改为本人', icon: 'none' })
    return
  }
  form.value.relation = target.key
}

async function submit() {
  if (!form.value.name.trim()) {
    uni.showToast({ title: '请填写姓名', icon: 'none' })
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: form.value.name.trim(),
      relation: form.value.relation,
      gender: form.value.gender,
      birthDate: form.value.birthDate || undefined,
      phone: form.value.phone || undefined,
      remark: form.value.remark || undefined,
    }
    if (formMode.value === 'edit' && editing.value?.id) {
      await updateMember(editing.value.id, payload)
    } else {
      await createMember(payload)
    }
    uni.showToast({ title: '已保存', icon: 'success' })
    editing.value = null
    load()
  } finally {
    submitting.value = false
  }
}

function removeMember(m: FamilyMemberVO) {
  if (m.relation === 'self') {
    uni.showToast({ title: '本人信息不可删除', icon: 'none' })
    return
  }
  uni.showModal({
    title: `删除成员「${m.name}」`,
    content: '删除后该成员的报告、就医记录等将不再展示，确定删除？',
    confirmColor: '#fa5151',
    success: async (res) => {
      if (!res.confirm) return
      await deleteMember(m.id)
      uni.showToast({ title: '已删除', icon: 'success' })
      load()
    },
  })
}
</script>

<template>
  <view class="page">
    <!-- 列表态 -->
    <template v-if="!editing">
      <view class="hero-wrap">
        <view class="hero-title">家庭成员</view>
        <view class="hero-sub">报告 / 就医 / 打卡都挂在成员上，先建人再记事</view>
        <view class="hero-curve"></view>
      </view>

      <view class="body">
        <view class="card">
          <view
            v-for="m in members"
            :key="m.id"
            class="row"
            hover-class="row_active"
            @click="openEdit(m)"
          >
            <view class="avatar">{{ (m.name || '?').slice(0, 1) }}</view>
            <view class="mid">
              <view class="name">{{ m.name }}<text class="self-tag" v-if="m.relation === 'self'">本人</text></view>
              <view class="desc">{{ relLabel(m.relation) }}<text v-if="ageOf(m)"> · {{ ageOf(m) }}</text></view>
            </view>
            <view class="del" v-if="m.relation !== 'self'" @click.stop="removeMember(m)">删除</view>
            <view class="arrow">›</view>
          </view>
          <view v-if="!loading && members.length === 0" class="empty">还没有成员</view>
        </view>

        <button class="btn" @click="openAdd">＋ 添加成员</button>
        <view class="tip">子女/父母等成员由家庭管理员统一维护；删除成员不影响其他人的数据。</view>
      </view>
    </template>

    <!-- 表单态（新增/编辑） -->
    <template v-else>
      <view class="hero-wrap">
        <view class="hero-title">{{ formMode === 'add' ? '添加成员' : '编辑成员' }}</view>
        <view class="hero-curve"></view>
      </view>

      <view class="body">
        <view class="card">
          <view class="fr">
            <view class="lb require">姓名</view>
            <input v-model="form.name" class="ipt g" placeholder="成员姓名" :maxlength="32" />
          </view>
          <view class="fr column">
            <view class="lb">关系</view>
            <view class="rel-list">
              <view
                v-for="(r, i) in RELATIONS"
                :key="r.key"
                class="rel"
                :class="{ active: form.relation === r.key }"
                @click="pickRelation(i)"
              >{{ r.label }}</view>
            </view>
          </view>
          <view class="fr">
            <view class="lb">性别</view>
            <view class="rel-list">
              <view class="rel" :class="{ active: form.gender === 1 }" @click="form.gender = 1">男</view>
              <view class="rel" :class="{ active: form.gender === 2 }" @click="form.gender = 2">女</view>
              <view class="rel" :class="{ active: form.gender === 0 }" @click="form.gender = 0">保密</view>
            </view>
          </view>
          <view class="fr">
            <view class="lb">出生日期</view>
            <picker mode="date" :value="form.birthDate" @change="bindBirth">
              <view class="pv">{{ form.birthDate || '选填（算年龄）' }} ›</view>
            </picker>
          </view>
          <view class="fr">
            <view class="lb">手机号</view>
            <input v-model="form.phone" class="ipt g" type="number" placeholder="选填" :maxlength="11" />
          </view>
        </view>

        <view class="btn-wrap">
          <button class="btn ghost" @click="backToList">返回</button>
          <button class="btn" :loading="submitting" @click="submit">保存</button>
        </view>
      </view>
    </template>
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
.card { background: #fff; border-radius: 20rpx; padding: 8rpx 30rpx 16rpx; margin-bottom: 24rpx; }
.row { display: flex; align-items: center; padding: 22rpx 0; border-bottom: 1rpx solid #f2f4f6; }
.row:last-child { border-bottom: none; }
.row_active { background: #fafbfc; }
.avatar { width: 84rpx; height: 84rpx; border-radius: 50%; background: #07c160; color: #fff; font-size: 34rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; }
.mid { flex: 1; margin-left: 22rpx; }
.name { font-size: 30rpx; color: #16233a; font-weight: 600; }
.self-tag { margin-left: 12rpx; font-size: 20rpx; color: #07c160; border: 1rpx solid #07c160; border-radius: 6rpx; padding: 2rpx 10rpx; font-weight: 400; }
.desc { font-size: 23rpx; color: #a2a8b0; margin-top: 4rpx; }
.del { font-size: 24rpx; color: #fa5151; padding: 8rpx 0 8rpx 20rpx; }
.arrow { color: #c8c9cc; font-size: 32rpx; margin-left: 12rpx; }
.empty { text-align: center; color: #a2a8b0; font-size: 25rpx; padding: 36rpx 0; }
.btn { background: #07c160; color: #fff; font-size: 30rpx; border-radius: 12rpx; }
.btn.ghost { background: rgba(7, 193, 96, 0.1); color: #07c160; }
.tip { font-size: 22rpx; color: #a2a8b0; line-height: 1.7; padding: 8rpx 12rpx; }
.fr { display: flex; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.fr:last-child { border-bottom: none; }
.fr.column { flex-direction: column; align-items: stretch; }
.lb { width: 170rpx; font-size: 28rpx; color: #1a1a1a; }
.lb.require::after { content: ' *'; color: #fa5151; }
.fr.column .lb { width: auto; margin-bottom: 14rpx; }
.ipt.g { flex: 1; font-size: 28rpx; text-align: right; }
.rel-list { flex: 1; display: flex; gap: 14rpx; flex-wrap: wrap; }
.rel { font-size: 25rpx; color: #4e5969; background: #f4f6f8; border-radius: 999rpx; padding: 10rpx 28rpx; }
.rel.active { background: rgba(7, 193, 96, 0.12); color: #07c160; font-weight: 600; }
.pv { font-size: 28rpx; color: #4e5969; }
.btn-wrap { padding: 8rpx 0; }
.btn-wrap .btn { margin-top: 20rpx; }
</style>
