/**
 * 隐私合规（S2 前端）：健康信息属 PIPL 敏感个人信息，收集前须单独同意。
 * - 首次拍照/上传报告前弹单独同意弹窗，同意标记本地留存
 * - 《用户隐私保护指引》全文在 pages/privacy/privacy，微信端可拉起平台协议
 */
const CONSENT_KEY = 'star_site_d2_privacy_consent'

export function hasPrivacyConsent(): boolean {
  return !!uni.getStorageSync(CONSENT_KEY)
}

export function setPrivacyConsent() {
  uni.setStorageSync(CONSENT_KEY, Date.now())
}

/** 打开隐私指引页（自行维护的一页纸） */
export function openPrivacyPage() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

/**
 * 拍照/上传前单独同意：未同意时弹窗征求；同意返回 true，拒绝返回 false。
 * 微信正式版还受平台《用户隐私保护指引》申报约束（后台操作，与前端弹窗互补）。
 */
export function ensurePhotoConsent(): Promise<boolean> {
  if (hasPrivacyConsent()) return Promise.resolve(true)
  return new Promise((resolve) => {
    uni.showModal({
      title: '隐私保护提醒',
      content: '报告照片仅用于 AI 识别提取指标，可选择「阅后即焚」不留存原件。健康信息属于敏感个人信息，首次使用前请阅读并同意《用户隐私保护指引》。',
      confirmText: '同意并继续',
      cancelText: '查看指引',
      success: (res) => {
        if (res.confirm) {
          setPrivacyConsent()
          resolve(true)
          return
        }
        // 引导读指引，读完回来再拍照（不在这里循环要同意）
        openPrivacyPage()
        resolve(false)
      },
      fail: () => resolve(false),
    })
  })
}
