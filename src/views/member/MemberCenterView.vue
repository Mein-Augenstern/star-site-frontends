<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getMe, updateMe } from '@/api/member'
import { useUserStore } from '@/stores/user'

const router = useRouter()
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

function handleLogout() {
  userStore.logout()
  ElMessage.success('已退出登录')
  router.push('/login')
}
</script>

<template>
  <div class="member-page" v-loading="loading">
    <el-container>
      <el-header class="header">
        <span class="brand">✦ star-site</span>
        <div class="header-right">
          <span class="welcome">{{ userStore.member?.nickname || userStore.member?.username }}</span>
          <el-button link type="danger" @click="handleLogout">退出登录</el-button>
        </div>
      </el-header>
      <el-main>
        <el-card class="profile-card">
          <template #header>
            <span>会员中心</span>
          </template>
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
      </el-main>
    </el-container>
  </div>
</template>

<style scoped>
.member-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
}

.brand {
  font-size: 18px;
  font-weight: 600;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.welcome {
  color: #606266;
}

.profile-card {
  max-width: 720px;
  margin: 24px auto;
}
</style>
