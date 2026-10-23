import { getToken, setToken } from '@/utils/request'
import { wxLogin } from '@/api/auth'

/** 静默微信登录：wx.login 取 code → 后端换 token；已登录直接 true */
export async function silentWxLogin(): Promise<boolean> {
  if (getToken()) return true
  try {
    const code = await new Promise<string>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: (r) => resolve(r.code),
        fail: (e) => reject(new Error(e.errMsg || 'wx.login 失败')),
      })
    })
    const vo = await wxLogin(code)
    setToken(vo.token)
    uni.setStorageSync('star_site_d2_member', JSON.stringify(vo.member))
    return true
  } catch {
    return false
  }
}
