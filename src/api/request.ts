import axios from 'axios'
import { ElMessage } from 'element-plus'
import type { R } from '@/types/api'
import { getToken, removeToken } from '@/utils/auth'
import router from '@/router'

const request = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

// 请求拦截：塞 Bearer token
request.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截：统一处理业务码 / 401
request.interceptors.response.use(
  (response) => {
    const res = response.data as R
    if (res.code !== 0) {
      ElMessage.error(res.message || '请求失败')
      return Promise.reject(new Error(res.message))
    }
    return res.data as never
  },
  (error) => {
    if (error.response?.status === 401) {
      removeToken()
      ElMessage.warning('登录已过期，请重新登录')
      router.push('/login')
    } else {
      ElMessage.error(error.response?.data?.message || '网络异常，请稍后再试')
    }
    return Promise.reject(error)
  },
)

export default request
