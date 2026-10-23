# star-site-app · 家庭健康小程序端

star-site 家庭健康平台的**微信小程序用户端**（uni-app）：家庭成员在手机上完成
体检报告浏览、指标录入与趋势、就医/孕期记录、提醒事项处理。

## 技术栈

| 组件 | 说明 |
|---|---|
| uni-app 3 + Vue 3 + TypeScript | 跨端（微信小程序 / H5 / App），组合式 API |
| Vite | 构建 |
| pinia | 登录态（token + 用户信息） |
| 原生 canvas | 指标趋势图 |

## 页面地图（pages.json 驱动）

```
index        首页（家庭成员/待办概览）
reports      体检报告列表 ──▶ report-detail 报告详情（含指标）
metrics      指标列表 ──▶ indicator-form 录入 ──▶ metric-trends 趋势
visits       就医记录 ──▶ visit-form 记录表单
pregnancy    孕期跟踪
reminder     提醒中心（铃铛/待办）
members      成员管理
login / mine 登录 / 我的
```

## 后端与网关

- API 经 star-site-platform-gateway（`/api/**`，Bearer JWT）
- 报告解读 / OCR 走 ai-service（LangChain 智能体）
- 开发期经 frp 隧道连本地全栈：`.env` 的 `VITE_API_BASE`（真实地址不入库，见 `.env` 注释）

## 相关仓库

[star-site-backend](https://github.com/Mein-Augenstern/star-site-backend)（微服务后端）·
[star-site-platform-ai-service](https://github.com/Mein-Augenstern/star-site-platform-ai-service)（AI 智能体服务）·
同仓工程：[../star-site-frontend/](../star-site-frontend/)（Web 管理端）
