import { createRouter, createWebHistory } from 'vue-router'
import { getToken } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      redirect: '/reports',
    },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
    },
    {
      path: '/member',
      name: 'member',
      component: () => import('@/views/member/MemberCenterView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/family',
      name: 'family',
      component: () => import('@/views/family/FamilyView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reports',
      name: 'reports',
      component: () => import('@/views/report/ReportsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/reports/:id',
      name: 'report-detail',
      component: () => import('@/views/report/ReportDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/trends',
      name: 'trends',
      component: () => import('@/views/report/TrendsView.vue'),
      meta: { requiresAuth: true },
    },
  ],
})

// 路由守卫：无 token 一律去登录页
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !getToken()) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
})

export default router
