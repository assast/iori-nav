## Context

iori-nav 是基于 Cloudflare 全家桶的书签导航站：D1 存数据，KV 缓存整页 HTML，Pages Functions 做 SSR。

当前站点排序逻辑：
- SQL `ORDER BY sort_order ASC, create_time DESC`（`functions/index.js`）。
- 站点数据注入 `window.IORI_SITES`，前端切分类时按分类预设顺序重排（`public/js/main.js` 的 `getSitesForCategory`）。
- 卡片是普通 `<a target="_blank">`，此前无任何点击追踪。
- 首页 HTML 整页缓存在 KV，靠 dirty-flag 失效。

需求是新增“按点击量从高到低排序”的开关，并让点击量可在多端之间以真实总量累加共享。

## Goals / Non-Goals

**Goals:**
- 站点可按累计点击量降序排列，由一个全站开关控制。
- 点击计数不每次写库（省 D1 写入配额）；通过后台手动同步把本地未同步增量累加到数据库。
- 多端通过“数据库累计值 + 各设备本地未同步增量”达成最终一致的真实总点击量。
- 管理员可直接设置站点 clicks 绝对值，用于初始化、纠错或置顶。
- 旧版本地绝对点击量记录尽量迁移为未同步增量。

**Non-Goals:**
- **不做实时多端一致**：顺序允许“慢半拍”，以本地 delta 与最近 DB 值合并为准。
- **不做每次点击即时写库**：点击只写 localStorage。
- **不做点击后立即重排**：当次点击只累加，下次加载、刷新或重绘才参与排序。
- 不引入用户账户体系。

## Decisions

### 1. 数据模型：数据库累计值 + 本地未同步增量

数据库 `sites.clicks` 保存已同步的累计点击量。浏览器 localStorage 保存当前设备尚未同步的点击增量：

```
localStorage['iori_click_deltas'] = { siteId: delta }
有效点击量 = DB clicks + local delta
```

理由：多设备场景下，覆盖语义会丢失其他设备增量；增量语义可以让设备 A、设备 B 的点击分别同步后在 DB 中累加为真实总点击量。

### 2. 点击与同步流程

```
点击卡片  → local delta[siteId] += 1     （不碰 DB）
同步按钮  → POST delta map → DB clicks += delta → 标记缓存 dirty → 清理已提交 delta
```

同步成功后，前端只清理请求快照中提交的 delta；如果同步期间又发生点击，新点击仍保留到下一次同步。

### 3. 旧本地绝对值迁移

旧实现若存在 `iori_clicks`，其语义是绝对点击量。新模型需要 delta，因此迁移规则为：

```
delta = max(0, legacyAbsoluteClicks - dbClicks)
```

迁移后写入 `iori_click_deltas` 并删除旧 key，避免重复迁移。该迁移是 best-effort：如果 DB 已经大于或等于旧本地值，则认为没有可迁移的未同步增量。

### 4. 排序范围

- **“全部”视图**：按有效点击量全局降序。
- **具体分类视图**：保持分类树分组顺序，同一分类组内按有效点击量降序。
- 开关关闭时：维持现有 `sort_order` 行为。

### 5. 排序在何处生效

- 开关状态来自 `settings`，注入到 `IORI_LAYOUT_CONFIG`。
- SSR 首屏可用 DB clicks 预排以减少抖动。
- 前端加载后，在开启点击排序时使用 DB clicks + local delta 重绘当前首屏排序，确保本地未同步点击也参与首屏排序。
- 不立即重排：点击只更新 localStorage，列表顺序在下次加载/刷新/重绘时反映。

### 6. 刷新缓存与本地增量

刷新缓存代表“以数据库为准”。因此后台刷新缓存成功后清空本地未同步 delta。

为避免误丢本地增量，打开刷新缓存确认弹窗时检查 `iori_click_deltas`，若存在正数增量则显示警告，建议先同步点击量。

### 7. 管理员设置绝对值

后台编辑站点时可直接设置 clicks 为非负整数绝对值。该操作直接写 DB 并标记首页缓存 dirty，适用于初始化、纠错或置顶。

### 8. 导入导出兼容

- 导出站点时包含 clicks。
- 新格式导入显式包含 clicks 时，按导入值写入。
- 旧格式覆盖导入缺少 clicks 时，保留 DB 原 clicks，避免误清零。

## Risks / Trade-offs

- **首屏可能轻微重排**：SSR 只能按 DB clicks 排，前端加载后若本地 delta 改变顺序会重绘一次。为满足“首屏体现本地 clicks”，接受该取舍。
- **刷新缓存会丢弃未同步 delta**：已在弹窗提示风险。若需要更强保护，可后续改为强制先同步。
- **旧 key 迁移不完美**：只能推导 `旧绝对值 - DB clicks` 的正差值，无法还原所有历史状态。作为兼容旧数据的 best-effort 可接受。
- **同步提示数量依赖 D1 changes**：`updated` 取自 D1 batch 的 changes，主要影响文案，不影响 SQL 累加逻辑。
