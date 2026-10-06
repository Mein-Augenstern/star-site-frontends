<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const userStore = useUserStore()

function handleLogout() {
  userStore.logout()
  router.push('/login')
}
</script>

<template>
  <el-container class="app-shell">
    <el-header class="app-header">
      <div class="brand" @click="router.push('/reports')">✦ star-site</div>
      <nav class="nav">
        <router-link to="/reports">体检报告</router-link>
        <router-link to="/trends">历年趋势</router-link>
        <router-link to="/family">家庭成员</router-link>
        <router-link to="/member">账号</router-link>
      </nav>
      <div class="header-right">
        <span class="welcome">{{ userStore.member?.nickname || userStore.member?.username }}</span>
        <el-button link type="danger" @click="handleLogout">退出</el-button>
      </div>
    </el-header>
    <el-main class="app-main">
      <router-view />
    </el-main>
  </el-container>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
}

.app-header {
  display: flex;
  align-items: center;
  gap: 32px;
  background: #fff;
  border-bottom: 1px solid #e4e7ed;
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  font-size: 18px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.nav {
  display: flex;
  gap: 20px;
  flex: 1;
}

.nav a {
  color: #606266;
  text-decoration: none;
  padding: 4px 2px;
}

.nav a.router-link-active {
  color: #409eff;
  font-weight: 600;
  border-bottom: 2px solid #409eff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.welcome {
  color: #606266;
  font-size: 14px;
}
</style>
