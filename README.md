# star-site-frontend

star-site 前端：Vue 3 + Vite + TypeScript + Element Plus，前后端分离。

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

`/api` 由 vite 代理转发到后端 `http://localhost:8081`（见 `vite.config.ts`），无跨域问题。

## 页面

- `/login`：登录 / 注册（el-tabs 切换，注册成功自动登录）
- `/member`：会员中心（资料展示 + 编辑，需登录）

## 构建

```bash
npm run build   # vue-tsc 类型检查 + vite 产物 → dist/
```
