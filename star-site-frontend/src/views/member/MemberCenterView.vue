<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import PageHeader from '@/components/PageHeader.vue'
import { getMe, updateMe } from '@/api/member'
import { useUserStore } from '@/stores/user'

const userStore = useUserStore()

const loading = ref(false)
const saving = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  nickname: '',
  avatar: '',
  email: '',
  phone: '',
  gender: 0,
  bio: '',
})

const rules: FormRules = {
  nickname: [{ max: 32, message: '昵称最长 32 位', trigger: 'blur' }],
  email: [{ type: 'email', message: '邮箱格式不正确', trigger: 'blur' }],
  phone: [{ pattern: /^$|^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
}

onMounted(async () => {
  loading.value = true
  try {
    const member = await getMe()
    userStore.setMember(member)
    Object.assign(form, {
      nickname: member.nickname ?? '',
      avatar: member.avatar ?? '',
      email: member.email ?? '',
      phone: member.phone ?? '',
      gender: member.gender ?? 0,
      bio: member.bio ?? '',
    })
  } finally {
    loading.value = false
  }
})

async function handleSave() {
  const formEl = formRef.value
  if (!formEl) return
  await formEl.validate()
  saving.value = true
  try {
    const member = await updateMe({ ...form })
    userStore.setMember(member)
    ElMessage.success('保存成功')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div v-loading="loading">
    <PageHeader title="账号设置" description="维护个人资料与联系方式" />

    <el-card class="profile-card" shadow="never">
      <template #header>账号资料</template>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="80px" style="max-width: 560px">
        <el-form-item label="用户名">
          <el-input :model-value="userStore.member?.username" disabled />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" maxlength="32" />
        </el-form-item>
        <el-form-item label="头像 URL">
          <el-input v-model="form.avatar" placeholder="https://..." maxlength="255" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" maxlength="128" />
        </el-form-item>
        <el-form-item label="手机号" prop="phone">
          <el-input v-model="form.phone" maxlength="11" />
        </el-form-item>
        <el-form-item label="性别">
          <el-radio-group v-model="form.gender">
            <el-radio :value="0">保密</el-radio>
            <el-radio :value="1">男</el-radio>
            <el-radio :value="2">女</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="简介">
          <el-input v-model="form.bio" type="textarea" :rows="3" maxlength="255" show-word-limit />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="handleSave">保存资料</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.profile-card {
  max-width: 720px;
}
</style>
