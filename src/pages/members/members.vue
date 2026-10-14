<script setup lang="ts">
import { onShow } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { listFamilyMembers, createMember, updateMember, deleteMember } from '@/api'
import type { FamilyMemberVO } from '@/types/api'
import type { FamilyMemberUpsert } from '@/api'

const RELATIONS = [
  { value: 'self', label: '本人' },
  { value: 'spouse', label: '配偶' },
  { value: 'father', label: '父亲' },
  { value: 'mother', label: '母亲' },
  { value: 'child', label: '子女' },
  { value: 'other', label: '其他' },
]

const members = ref<FamilyMemberVO[]>([])
const showForm = ref(false)
const editing = ref<FamilyMemberVO | null>(null)
const form = ref<FamilyMemberUpsert & { birthDate: string }>({ name: '', relation: 'self', birthDate: '' })
const submitting = ref(false)

onShow(load)

async function load() {
  members.value = await listFamilyMembers().catch(() => [])
}

function relLabel(r: string) {
  return RELATIONS.find((x) => x.value === r)?.label ?? r
}

function openAdd() {
  editing.value = null
  form.value = { name: '', relation: 'self', birthDate: '' }
  showForm.value = true
}

function openEdit(m: FamilyMemberVO) {
  editing.value = m
  form.value = { name: m.name, relation: m.relation, birthDate: m.birthDate ?? '', phone: m.phone, remark: m.remark }
  showForm.value = true
}

function bindBirth(e: { detail: { value: string } }) { form.value.birthDate = e.detail.value }

function pickRelation(e: { detail: { value: number } }) {
  form.value.relation = RELATIONS[e.detail.value]?.value ?? 'other'
}

async function submit() {
  if (!form.value.name.trim()) { uni.showToast({ title: '请填姓名', icon: 'none' }); return }
  submitting.value = true
  try {
    const data: FamilyMemberUpsert = {
      name: form.value.name.trim(),
      relation: form.value.relation,
      birthDate: form.value.birthDate || undefined,
      phone: form.value.phone || undefined,
      remark: form.value.remark || undefined,
    }
    if (editing.value) await updateMember(editing.value.id, data)
    else await createMember(data)
    showForm.value = false
    uni.showToast({ title: editing.value ? '已保存' : '已添加', icon: 'success' })
    await load()
  } finally { submitting.value = false }
}

function remove(m: FamilyMemberVO) {
  uni.showModal({
    title: '删除成员',
    content: `删除「${m.name}」的档案？其名下报告将不可见。`,
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
    <view class="tip">复查计划、报告都挂在成员档案下，先把全家建好</view>

    <view v-for="m in members" :key="m.id" class="card">
      <view class="avatar">{{ (m.name || '?').slice(0, 1) }}</view>
      <view class="main">
        <view class="name">{{ m.name }}<text class="rel">{{ relLabel(m.relation) }}</text></view>
        <view class="sub">{{ m.birthDate || '未填生日' }}<text v-if="m.phone"> · {{ m.phone }}</text></view>
      </view>
      <view class="act" @click="openEdit(m)">编辑</view>
      <view class="act danger" @click="remove(m)">删除</view>
    </view>

    <view v-if="!members.length" class="empty">还没有成员，先把爸爸妈妈加进来</view>

    <view class="add-btn" @click="openAdd">＋ 添加家庭成员</view>

    <!-- 成员表单 -->
    <view v-if="showForm" class="mask" @click="showForm = false">
      <view class="sheet" @click.stop>
        <view class="sheet-title">{{ editing ? '编辑成员' : '添加成员' }}</view>
        <view class="fr">
          <view class="lb">姓名</view>
          <input v-model="form.name" class="ipt" placeholder="如：爸爸" />
        </view>
        <view class="fr">
          <view class="lb">关系</view>
          <picker mode="selector" :range="RELATIONS" range-key="label" @change="pickRelation">
            <view class="pv">{{ relLabel(form.relation) }} ›</view>
          </picker>
        </view>
        <view class="fr">
          <view class="lb">生日</view>
          <picker mode="date" :value="form.birthDate" @change="bindBirth">
            <view class="pv">{{ form.birthDate || '选填' }} ›</view>
          </picker>
        </view>
        <view class="fr">
          <view class="lb">手机号</view>
          <input v-model="form.phone" class="ipt" type="number" placeholder="选填" />
        </view>
        <view class="sheet-btns">
          <view class="cancel" @click="showForm = false">取消</view>
          <button class="ok" :loading="submitting" @click="submit">保存</button>
        </view>
      </view>
    </view>
  </view>
</template>

<style>
.page { min-height: 100vh; background: #f4f5f7; padding: 20rpx 32rpx 60rpx; }
.tip { font-size: 23rpx; color: #a2a8b0; padding: 4rpx 8rpx 18rpx; }
.card { display: flex; align-items: center; background: #fff; border: 1rpx solid #eef0f3; border-radius: 20rpx; padding: 26rpx 30rpx; margin-bottom: 18rpx; }
.avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #07c160; color: #fff; font-size: 36rpx; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.main { flex: 1; min-width: 0; margin-left: 24rpx; }
.name { font-size: 29rpx; font-weight: 600; color: #16233a; }
.rel { font-size: 21rpx; color: #07c160; background: rgba(7, 193, 96, 0.09); border-radius: 8rpx; padding: 4rpx 12rpx; margin-left: 14rpx; }
.sub { font-size: 23rpx; color: #8a9099; margin-top: 8rpx; }
.act { font-size: 23rpx; color: #07c160; border: 1rpx solid rgba(7, 193, 96, 0.55); border-radius: 999rpx; padding: 8rpx 24rpx; margin-left: 14rpx; flex-shrink: 0; }
.act.danger { color: #fa5151; border-color: rgba(250, 81, 81, 0.5); }
.empty { text-align: center; color: #a2a8b0; font-size: 26rpx; padding: 80rpx 0; }
.add-btn { text-align: center; font-size: 27rpx; font-weight: 600; color: #07c160; background: #fff; border: 2rpx dashed #07c160; border-radius: 20rpx; padding: 28rpx 0; }
.mask { position: fixed; inset: 0; background: rgba(0, 0, 0, 0.45); z-index: 99; display: flex; align-items: flex-end; }
.sheet { width: 100%; background: #fff; border-radius: 28rpx 28rpx 0 0; padding: 36rpx 36rpx calc(36rpx + env(safe-area-inset-bottom)); }
.sheet-title { font-size: 32rpx; font-weight: 700; color: #1a1a1a; margin-bottom: 8rpx; }
.fr { display: flex; align-items: center; justify-content: space-between; padding: 26rpx 0; border-bottom: 1rpx solid #f2f4f6; }
.lb { font-size: 28rpx; color: #1a1a1a; }
.pv { font-size: 28rpx; color: #4e5969; }
.ipt { flex: 1; font-size: 28rpx; text-align: right; }
.sheet-btns { display: flex; align-items: center; gap: 24rpx; margin-top: 30rpx; }
.cancel { flex: 1; text-align: center; font-size: 28rpx; color: #5c6470; background: #f2f3f5; border-radius: 12rpx; padding: 20rpx 0; }
.ok { flex: 1; background: #07c160; color: #fff; font-size: 28rpx; border-radius: 12rpx; }
</style>
