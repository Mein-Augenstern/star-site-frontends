/**
 * 统一请求封装：uni.request 包装为 Promise
 * - 自动附带 Bearer token（storage 持久化）
 * - 业务码非 0 弹错；401 清 token 跳登录
 * - baseURL：H5 走代理 /api；小程序/App 用完整地址（manifest/环境配置）
 */
// H5 走开发代理 /api；小程序/App 直连局域网 IP（模拟器/真机与 Mac 同 Wi-Fi 可达）
// 上线替换为 HTTPS + 备案域名
export let BASE_URL = '/api'
// #ifndef H5
// 非微信生态正式包要求 HTTPS+备案域名：构建时注入 VITE_API_BASE（如 https://api.xxx.com/api）
// 未注入时回落到局域网开发地址（模拟器/真机调试需与 Mac 同 Wi-Fi）
BASE_URL = (import.meta.env?.VITE_API_BASE as string) || 'http://192.168.3.196:8080/api'// #endif

export interface R<T = unknown> {
  code: number
  message: string
  data: T
}

const TOKEN_KEY = 'star_site_token'

export function getToken(): string {
  return uni.getStorageSync(TOKEN_KEY) || ''
}

export function setToken(token: string) {
  uni.setStorageSync(TOKEN_KEY, token)
}

export function clearToken() {
  uni.removeStorageSync(TOKEN_KEY)
}

function toLogin() {
  clearToken()
  uni.reLaunch({ url: '/pages/login/login' })
}

export function request<T>(options: {
  url: string
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  data?: unknown
  /** GET 查询参数（拼到 URL 问号后；POST/PUT 走 body 时请用 data） */
  params?: Record<string, unknown>
}): Promise<T> {
  return new Promise((resolve, reject) => {
    let url = BASE_URL + options.url
    const isGet = !options.method || options.method === 'GET'
    let data = options.data as Record<string, unknown> | undefined
    if (isGet && options.params) {
      const qs = Object.entries(options.params)
        .filter(([, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
        .join('&')
      if (qs) url += (url.includes('?') ? '&' : '?') + qs
      data = undefined
    }
    uni.request({
      url,
      method: options.method ?? 'GET',
      data,
      header: { Authorization: getToken() ? `Bearer ${getToken()}` : '' },
      success: (res) => {
        const body = res.data as R<T>
        if (res.statusCode === 401) {
          uni.showToast({ title: '登录已过期', icon: 'none' })
          toLogin()
          reject(new Error('unauthorized'))
          return
        }
        if (!body || body.code !== 0) {
          const msg = body?.message ?? '请求失败'
          uni.showToast({ title: msg, icon: 'none' })
          reject(new Error(msg))
          return
        }
        resolve(body.data)
      },
      fail: (err) => {
        uni.showToast({ title: '网络异常', icon: 'none' })
        reject(new Error(err.errMsg))
      },
    })
  })
}
