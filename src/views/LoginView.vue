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
      ElMessage.success('登录成功')
    } else {
      await register({
        username: formData.username,
        password: formData.password,
        nickname: formData.nickname || undefined,
      })
      const data = await login({ username: formData.username, password: formData.password })
      userStore.setLogin(data.token, data.member)
      ElMessage.success('注册成功')
    }
    router.push((route.query.redirect as string) || '/member')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <!-- 左侧品牌区 -->
    <div class="brand-pane">
      <div class="brand-logo">StarSite</div>
      <div class="brand-hero">
        <h2 class="brand-headline">家庭健康档案平台</h2>
        <p class="brand-desc">集中管理全家人的体检报告与健康指标，异常早发现，趋势一目了然。</p>
        <ul class="brand-features">
          <li><span class="feature-dot"></span>体检报告统一归档，原件随时查看</li>
          <li><span class="feature-dot"></span>指标偏高偏低自动标记，无需逐项比对</li>
          <li><span class="feature-dot"></span>历年数据纵向对比，掌握健康趋势</li>
        </ul>
      </div>
      <div class="brand-footer">© 2026 StarSite · 仅供家庭成员内部使用</div>
    </div>

    <!-- 右侧表单区 -->
    <div class="form-pane">
      <div class="form-box">
        <h1 class="form-title">{{ activeTab === 'login' ? '账号登录' : '注册账号' }}</h1>
        <p class="form-sub">登录后管理你的家庭健康档案</p>
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
            {{ activeTab === 'login' ? '登录' : '注册并登录' }}
          </el-button>
        </el-form>
      </div>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

/* ---------- 左侧品牌区 ---------- */
.brand-pane {
  flex: 1;
  min-width: 0;
  background: linear-gradient(165deg, #0c3a8c 0%, #1668dc 100%);
  color: #fff;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 44px 56px;
  position: relative;
  overflow: hidden;
}

.brand-pane::before,
.brand-pane::after {
  content: '';
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.12);
  pointer-events: none;
}

.brand-pane::before {
  width: 520px;
  height: 520px;
  right: -180px;
  top: -180px;
}

.brand-pane::after {
  width: 420px;
  height: 420px;
  right: -40px;
  bottom: -240px;
  border-color: rgba(255, 255, 255, 0.08);
}

.brand-logo {
  font-size: 20px;
  font-weight: 600;
  letter-spacing: 0.5px;
  position: relative;
}

.brand-hero {
  max-width: 440px;
  position: relative;
}

.brand-headline {
  margin: 0;
  font-size: 30px;
  font-weight: 600;
  line-height: 1.4;
}

.brand-desc {
  margin: 14px 0 36px;
  font-size: 15px;
  line-height: 1.8;
  color: rgba(255, 255, 255, 0.75);
}

.brand-features {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 16px;
}

.brand-features li {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.92);
}

.feature-dot {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.16);
  flex-shrink: 0;
  position: relative;
}

.feature-dot::after {
  content: '';
  position: absolute;
  left: 6px;
  top: 4px;
  width: 5px;
  height: 9px;
  border: solid #fff;
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}

.brand-footer {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  position: relative;
}

/* ---------- 右侧表单区 ---------- */
.form-pane {
  width: 500px;
  flex-shrink: 0;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 48px 56px;
}

.form-box {
  width: 100%;
  max-width: 340px;
}

.form-title {
  margin: 0;
  font-size: 22px;
  font-weight: 600;
  color: #1d2129;
}

.form-sub {
  margin: 8px 0 24px;
  font-size: 13px;
  color: #86909c;
}

.submit-btn {
  width: 100%;
  margin-top: 4px;
}

/* 窄屏：隐藏品牌区，表单铺满 */
@media (max-width: 992px) {
  .brand-pane {
    display: none;
  }

  .form-pane {
    width: 100%;
  }
}
</style>
