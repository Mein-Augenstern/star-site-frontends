# star-site-frontends · 前端工程 monorepo

star-site 家庭健康与数字资产平台的**全部前端工程**集中于此（subtree 合并，各工程完整历史保留）。

## 工程一览

| 工程 | 形态 | 技术栈 | 职责 |
|---|---|---|---|
| [star-site-app/](star-site-app/) | 微信小程序（用户端） | uni-app 3 + Vue 3 + TS + Vite | 家庭成员日常使用：体检报告、指标趋势、就医/孕期记录、提醒中心 |
| [star-site-app-demo2/](star-site-app-demo2/) | 小程序实验仓 | 同上 | UI 与交互方案的试验田，成熟后回移 star-site-app |
| [star-site-frontend/](star-site-frontend/) | Web 管理端 | Vue 3 + Vite + TS + Element Plus + pinia | 家庭看板总览、保单保障地图、证件资产、家庭财务、提醒中心（11 路由） |

三端共用同一后端：API 经 platform-gateway（`/api/**` + Bearer JWT），AI 能力（报告解读/OCR）由
[ai-service](https://github.com/Mein-Augenstern/star-site-platform-ai-service) 提供。

## 为什么 monorepo

家庭场景三端（小程序 / 实验端 / Web）共享 API 契约与类型定义，同一迭代周期内常需前后端联动改接口——
单人项目集中管理同步成本最低，与 [invest](https://github.com/Mein-Augenstern/invest) 前后端同仓的选型逻辑一致。

## 快速开始

```bash
# Web 管理端
cd star-site-frontend && npm install && npm run dev      # http://localhost:5173（/api 代理到网关 8080）

# 小程序端（HBuilderX 或 CLI）
cd star-site-app && npm install && npm run dev:mp-weixin  # 产物导入微信开发者工具
```

> 后端与基础设施见 [star-site-backend](https://github.com/Mein-Augenstern/star-site-backend)
>（docker compose 一键全栈；`VITE_API_BASE` 等环境变量真实值不入库）。
