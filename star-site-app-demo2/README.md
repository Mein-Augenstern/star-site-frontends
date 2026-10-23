# star-site-app-demo2（产品 demo2 · 家庭报告）

按 2026-10 头脑风暴主线（`star-site-docs/项目管理/头脑风暴/`）重做的产品前端，与 demo1（`star-site-app`）**代码完全隔离**：demo1 冻结保留，demo2 独立迭代。

**一句话定位**：把全家的体检报告装进微信，看懂每个异常指标。

## 与 demo1 的差异（按主线收敛）

- 矛场景置顶：首页主入口是「拍报告」，健康工具/孕期/记账全部不进 demo2（顺带满足域不砍后端、只不进前端叙事）
- 复查闭环：报告详情异常指标一键「安排复查」（recheck 垂直服务编排：复查日提醒 + 可选每日监测，经 reminder 横向服务）；复查计划页支持「关联新报告闭环」，自动生成对比结论
- 阅后即焚（S1）：拍照识别默认不留存原件
- 隐私合规（S2 前端部分）：首次拍照前单独同意弹窗、manifest `__usePrivacyCheck__`、一页纸隐私指引页
- 存储 key 带 `star_site_d2_` 前缀，与 demo1 同机调试不串数据
- UI 沿用 demo1 的手写 WeUI 分寸 CSS（wot-design-uni 在 demo1 有运行时兼容问题已弃用，demo2 不引入）

## 后端依赖

同一套后端（`star-site-backend`）：平台服务（gateway/member/family/file/reminder）+ 横向健康服务（health，`/api/health/**` 原样复用）+ 新垂直服务 recheck（`/api/recheck/**`，端口 8089）。依赖方向与分层见 `star-site-docs/技术/12-垂直服务与横向服务分层.md`。

## 运行

```bash
pnpm install --dangerously-allow-all-builds   # pnpm 12 不再读 package.json 的 pnpm 字段，需旗标放行 esbuild 等构建脚本
pnpm dev:mp-weixin     # 开发构建（微信开发者工具导入 dist/dev/mp-weixin）
pnpm build:mp-weixin   # 生产构建（dist/build/mp-weixin）
./scripts/dev-weixin.sh  # 构建并自动拉起开发者工具（auto-port 9421）
```

`.env` 的 `VITE_API_BASE` 指向后端网关（默认 frp 隧道地址，与 demo1 相同）。

## 待办（GUI 侧 / 后续批次）

- **AppID**：manifest 暂用 demo1 的 `wx8bb4b89c676c6df8` 跑开发版；demo2 对外前需注册独立 AppID 并替换 `src/manifest.json` 的 `mp-weixin.appid`
- 微信后台《用户隐私保护指引》申报（S2-2，正式版硬门槛）与订阅消息模板（N-2）
- 报告详情「删除原件（保留指标）」需后端解关联接口（S1-2，后续批次）
- AI 解读流式（SSE）、OcrDraft 置信度黄标（E-1/E-3，后续横向能力增强）
