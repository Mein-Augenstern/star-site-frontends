<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { getUnreadCount, listNotifications, markRead } from '@/api/reminder'
import type { NotificationVO } from '@/types/api'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const isLoginPage = computed(() => route.name === 'login')

const unread = ref(0)
const notifications = ref<NotificationVO[]>([])

onMounted(async () => {
  if (!isLoginPage.value) {
    await loadBell()
  }
})

async function loadBell() {
  try {
    unread.value = await getUnreadCount()
    notifications.value = await listNotifications({ page: 1, size: 5 })
  } catch {
    // 铃铛加载失败不阻塞页面
  }
}

async function handleRead(n: NotificationVO) {
  if (n.readFlag === 0) {
    await markRead(n.id)
    n.readFlag = 1
    unread.value = Math.max(0, unread.value - 1)
  }
}

function handleCommand(command: string) {
  if (command === 'profile') {
    router.push('/member')
  } else if (command === 'logout') {
    userStore.logout()
    router.push('/login')
  }
}
</script>

<template>
  <div class="app-shell">
    <header v-if="!isLoginPage" class="app-header">
      <div class="brand" @click="router.push('/home')">
        <span class="brand-name">StarSite</span>
        <span class="brand-divider"></span>
        <span class="brand-sub">家庭管家</span>
      </div>
      <nav class="nav">
        <router-link to="/home">首页</router-link>
        <router-link to="/reports">体检报告</router-link>
        <router-link to="/insurance">保单管理</router-link>
        <router-link to="/archive">证件资产</router-link>
        <router-link to="/finance">家庭财务</router-link>
        <router-link to="/reminders">提醒中心</router-link>
        <router-link to="/family">家庭成员</router-link>
        <router-link to="/admin/async">异步任务</router-link>
        <router-link to="/member">账号</router-link>
      </nav>

      <el-popover placement="bottom-end" width="320" trigger="click" @show="loadBell">
        <template #reference>
          <span class="bell">
            <el-badge :value="unread" :hidden="unread === 0" :max="99">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.7 21a2 2 0 0 1-3.4 0" />
              </svg>
            </el-badge>
          </span>
        </template>
        <div class="bell-panel">
          <div class="bell-head">通知</div>
          <div v-if="notifications.length === 0" class="bell-empty">暂无通知</div>
          <div
            v-for="n in notifications"
            :key="n.id"
            class="bell-item"
            :class="{ unread: n.readFlag === 0 }"
            @click="handleRead(n)"
          >
            {{ n.title }}
            <span class="bell-time">{{ n.createdAt?.slice(5, 16) }}</span>
          </div>
          <div class="bell-foot" @click="router.push('/reminders')">查看提醒中心 →</div>
        </div>
      </el-popover>

      <el-dropdown trigger="click" @command="handleCommand">
        <span class="user-entry">
          <el-avatar :size="26" shape="square">
            {{ (userStore.member?.nickname || userStore.member?.username || '?').slice(0, 1) }}
          </el-avatar>
          <span class="user-name">{{ userStore.member?.nickname || userStore.member?.username }}</span>
          <i class="user-caret"></i>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="profile">账号设置</el-dropdown-item>
            <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </header>
    <main class="app-main" :class="{ 'is-plain': isLoginPage }">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
.app-shell {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.app-header {
  display: flex;
  align-items: center;
  height: 56px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--panel-border);
  position: sticky;
  top: 0;
  z-index: 10;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  white-space: nowrap;
}

.brand-name {
  font-size: 16px;
  font-weight: 600;
  color: #1d2129;
}

.brand-divider {
  width: 1px;
  height: 14px;
  background: #dcdfe6;
}

.brand-sub {
  font-size: 13px;
  color: #86909c;
}

.nav {
  display: flex;
  gap: 28px;
  flex: 1;
  margin-left: 40px;
}

.nav a {
  color: #4e5969;
  text-decoration: none;
  font-size: 14px;
  line-height: 56px;
  display: inline-block;
}

.nav a:hover {
  color: var(--el-color-primary);
}

.nav a.router-link-active {
  color: var(--el-color-primary);
  font-weight: 600;
  border-bottom: 2px solid var(--el-color-primary);
}

.bell {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: #4e5969;
  margin-right: 20px;
  outline: none;
}

.bell:hover {
  color: var(--el-color-primary);
}

.bell-panel {
  margin: -8px;
}

.bell-head {
  font-size: 13px;
  font-weight: 600;
  color: #1d2129;
  padding: 10px 12px;
  border-bottom: 1px solid var(--panel-border);
}

.bell-empty {
  padding: 20px 12px;
  text-align: center;
  color: #86909c;
  font-size: 13px;
}

.bell-item {
  padding: 10px 12px;
  font-size: 13px;
  color: #4e5969;
  border-bottom: 1px solid var(--panel-border);
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  gap: 8px;
}

.bell-item.unread {
  color: #1d2129;
  font-weight: 600;
}

.bell-time {
  color: #86909c;
  font-weight: 400;
  font-size: 12px;
  white-space: nowrap;
}

.bell-foot {
  padding: 10px 12px;
  text-align: center;
  font-size: 13px;
  color: var(--el-color-primary);
  cursor: pointer;
}

.user-entry {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  outline: none;
}

.user-entry :deep(.el-avatar) {
  background: var(--el-color-primary-light-8);
  color: var(--el-color-primary);
  font-size: 13px;
  border-radius: 4px;
}

.user-name {
  color: #1d2129;
  font-size: 14px;
}

.user-caret {
  width: 0;
  height: 0;
  border-left: 4px solid transparent;
  border-right: 4px solid transparent;
  border-top: 5px solid #86909c;
}

.app-main {
  flex: 1;
  background: var(--page-bg);
  padding: 20px 24px 32px;
}

.app-main.is-plain {
  padding: 0;
  background: #fff;
}
</style>
