# 技术方案：star-async 异步命令组件（源自 asyncmd 的项目内重实现）

- 来源研究：https://github.com/bojiw/asyncmd（异步命令组件，jar 库形态）
- 日期：2026-10-11
- **落地状态（M1 已完成）**：组件在 star-site-common/common.async（无 @Configuration、
  消费服务显式 @Import + STAR_ASYNC_ENABLED 开关）；DDL 18-async-command.sql（含
  claim_token 认领令牌列）；首个用例 = health 服务 AI 解读异步化（AiInterpretExecutor +
  POST /reports/{id}/interpret-async，空 key 预检拒绝）。E2E 已验证：执行器注册、
  认领执行、失败指数退避重试（retry_count/next_run_at/last_error 落库）、崩溃残留回收、
  预检拒绝。单测 10 个全绿（含退避/封顶/死信/幂等提交）。

## 1. asyncmd 原理解读

把"同步请求转异步处理"抽象为**命令落库 + 后台执行 + 重试至最终一致**：

1. 业务事务内把命令写进自己库的 asyn_cmd 表（与业务变更**同事务原子提交**——可靠性根基）
2. 请求立即返回；后台调度（elasticjob+ZK 分片）捞表执行注册的"命令执行器"
3. 失败按次数/间隔重试，超限进历史表（死信），保证最终一致
4. 衍生能力：领域事件可靠通知、延迟队列（next_run_at）、MQ 消费削峰、按组分序

## 2. 形态决策：工具组件（库），不做微服务

| 维度 | 组件（选它） | 微服务 |
|---|---|---|
| 原子性 | submit 与业务同库同事务，天然原子 | 落命令要走网络，事务一致性需补偿，恰好破坏 asyncmd 的立身之本 |
| 故障隔离 | 命令表在应用自己的库，积压不影响他人 | 集中队列成为单点与瓶颈 |
| 部署成本 | 引依赖+建表+一个开关 | 多一个服务全链路运维 |
| asyncmd 官方立场 | README 明确"并非集中式部署…变相分摊压力" | — |

结论与 asyncmd 作者一致：**库形态**。落在 `star-site-common` 的 `common.async` 包，
全部服务共享（"供其他服务使用"），按服务粒度开关启用。

## 3. 对 asyncmd 的项目化改造（不是照抄）

| asyncmd | star-async | 理由 |
|---|---|---|
| elasticjob + Zookeeper 调度 | @Scheduled 轮询 + 乐观认领（UPDATE 抢占）+ RUNNING 超时回收 | 本项目无 ZK；当前每服务单实例，DB 轮询足够，省一套运维 |
| 独立 jar + spring-boot-starter 自动装配 | common 包 + @ConditionalOnProperty 开关 | 项目已有 common 共享模式（MQ/LLM 同款），不再多建模块 |
| 分表 + SubTableUtil | 单表 + 索引 | 当前量级远不需要；表结构留 partition 余地 |
| 表驱动回调/组序 | M1 不做组序，按 id 顺序消费 | 需要时在认领 SQL 加 biz_key 排序即可 |

保留的内核语义：**同事务落命令 / 类型路由执行器 / 指数退避重试 / 超限 DEAD / 延迟执行 / RUNNING 超时回收**。

## 4. 设计

表 `async_command`（docker/mysql-init/18-async-command.sql）：

```
id, cmd_type, biz_key, payload(TEXT JSON), status(PENDING/RUNNING/SUCCESS/DEAD),
max_retry(5), retry_count, next_run_at, last_error, owner(提交服务名), created_at, updated_at
KEY idx_status_next(status, next_run_at)
```

API（com.xp.starsite.common.async）：

```java
asyncCommandService.submit("AI_INTERPRET", "report:607", json);          // 当前事务内
asyncCommandService.submitAt("CMD", key, json, LocalDateTime.plusMinutes(30)); // 延迟

@Component public class AiInterpretExecutor implements AsyncCommandExecutor {
    public String type() { return "AI_INTERPRET"; }
    public void execute(AsyncCommand cmd) { ...抛异常=触发重试... }
}
```

- 调度：@Scheduled 每 5s，批量认领（UPDATE 抢占 PENDING 且到期行→RUNNING）→ 按 cmd_type 路由执行器
- 退避：next_run_at = now + min(60·2^retry, 3600)s；超过 max_retry → DEAD（死信，人工/接口处置）
- 回收：RUNNING 超 10 分钟（执行器崩溃残留）→ 回 PENDING 重试
- 开关：`STAR_ASYNC_ENABLED=true` 按服务启用（网关不启用）

## 5. 落地用例（真实价值，非 demo）

**AI 解读异步化**：`POST /api/health/reports/{id}/interpretation?async=true`
→ 事务内落命令立即返回（LLM 调用 30s+ 的超时风险消除）→ 调度器后台执行复用既有
interpret 逻辑（落库缓存）→ 前端轮询详情取结果。LLM 未配 key 时同步路径维持现有 400 降级，
async 路径提交前同样预检，不产生必死命令。

## 6. 验证

- 单测：退避计算 / 认领 SQL 语义 / DEAD 判定（mock mapper）
- 契约：async=true 提交 → 命令表 PENDING → 调度执行 → 报告落解读（有 key 场景留待 key）
- 兼容：不开启开关的服务零感知；网关无调度线程
