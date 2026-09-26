<script setup lang="ts">
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessage } from 'element-plus'
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { login, register } from '@/api/auth'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const activeTab = ref<'login' | 'register'>('login')
const loading = ref(false)
const formRef = ref<FormInstance>()

const formData = reactive({
  username: '',
  password: '',
  nickname: '',
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { pattern: /^[a-zA-Z0-9_]{3,32}$/, message: '3-32 位字母、数字或下划线', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 64, message: '密码长度 6-64 位', trigger: 'blur' },
  ],
}

async function handleSubmit() {
  const form = formRef.value
  if (!form) return
  await form.validate()
  loading.value = true
  try {
    if (activeTab.value === 'login') {
      const data = await login({ username: formData.username, password: formData.password })
      userStore.setLogin(data.token, data.member)
      ElMessage.success(`欢迎回来，${data.member.nickname}`)
    } else {
      await register({
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname || undefined,
      })
      const data = await login({ username: formData.username, password: formData.password })
      userStore.setLogin(data.token, data.member)
      ElMessage.success('注册成功，已自动登录')
    }
    router.push((route.query.redirect as string) || '/member')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <el-card class="login-card">
      <template #header>
        <h2 class="title">✦ star-site</h2>
      </template>
      <el-tabs v-model="activeTab" stretch>
        <el-tab-pane label="登录" name="login" />
        <el-tab-pane label="注册" name="register" />
      </el-tabs>
      <el-form ref="formRef" :model="formData" :rules="rules" label-position="top" @keyup.enter="handleSubmit">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="formData.username" placeholder="3-32 位字母、数字或下划线" maxlength="32" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="formData.password" type="password" placeholder="6-64 位" show-password />
        </el-form-item>
        <el-form-item v-if="activeTab === 'register'" label="昵称（可选）">
          <el-input v-model="formData.nickname" placeholder="不填默认用用户名" maxlength="32" />
        </el-form-item>
        <el-button type="primary" class="submit-btn" :loading="loading" @click="handleSubmit">
          {{ activeTab === 'login' ? '登 录' : '注册并登录' }}
        </el-button>
      </el-form>
    </el-card>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.login-card {
  width: 380px;
}

.title {
  margin: 0;
  text-align: center;
  font-size: 20px;
}

.submit-btn {
  width: 100%;
}
</style>
