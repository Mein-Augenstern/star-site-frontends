# star-site-frontend

star-site 家庭健康与数字资产平台的 **Web 管理端**：Vue 3 + Vite + TypeScript + Element Plus，前后端分离。
家庭看板一屏总览（年缴保费 / 资产估值 / 本月收支 / 待办），覆盖体检报告、保单保障地图、证件资产、家庭财务、提醒中心等家庭运营场景。

> 配套：后端 [star-site-backend](https://github.com/Mein-Augenstern/star-site-backend)（Spring Cloud Alibaba 微服务）·
> 移动端 [star-site-app](https://github.com/Mein-Augenstern/star-site-app)（uni-app 小程序）

## 技术栈

| 组件 | 说明 |
|---|---|
| Vue 3 + Vite + TS | 组合式 API、`<script setup>` |
| Element Plus | 按需自动导入（unplugin-auto-import / unplugin-vue-components） |
| pinia | token + 用户信息 |
| vue-router | 路由守卫（无 token 跳登录） |
| axios | 统一拦截：请求塞 Bearer token，响应处理业务码 / 401 |

## 开发

```bash
npm install
npm run dev   # http://localhost:5173
```

`/api` 由 vite 代理统一转发到后端**网关** `http://localhost:8080`（见 `vite.config.ts`），无跨域问题。

## 页面（11 路由）

| 路径 | 页面 | 说明 |
|---|---|---|
| `/home` | 家庭看板 | 欢迎面板 + 最近 30 天要办的事 + 数字概览（年缴保费/资产总估值/成员数/本月收支）+ 快捷入口；`/` 重定向至此 |
| `/login` | 登录/注册 | el-tabs 切换，注册成功自动登录 |
| `/reports` | 体检报告列表 | 分页、按成员/年份筛选 |
| `/reports/:id` | 报告详情 | 指标录入（覆盖式）、异常标识 |
| `/trends` | 历年趋势 | 按成员 + 指标名查趋势 |
| `/insurance` | 保单管理 | 保单列表 + 保障地图（成员×险种矩阵）+ 录入抽屉（含电子保单上传） |
| `/archive` | 证件资产 | 证件夹（到期标红）+ 家庭资产（总览卡片、估值历史 SVG 趋势线） |
| `/finance` | 家庭财务 | 记账（收入/支出/转账）+ 三张表 + 净资产曲线 + 预算/目标 + 微信支付宝账单导入 |
| `/reminders` | 提醒中心 | 要办的事（完成/忽略）+ 通知记录 |
| `/family` | 家庭成员 | 家庭与成员档案 CRUD |
| `/member` | 账号设置 | 资料、改密 |

顶栏含**铃铛**（未读通知角标 + 最近通知下拉）与用户下拉菜单；导航：首页/体检报告/保单管理/证件资产/提醒中心/家庭成员/账号。

## API 模块（src/api/）

`request.ts`（axios 封装：业务码/401 统一处理）+ 按域拆分：`auth` / `member` / `family` / `file` / `health` / `insurance` / `reminder` / `archive`；类型定义集中在 `types/api.d.ts`。

## 构建

```bash
npm run build   # vue-tsc 类型检查 + vite 产物 → dist/
```
