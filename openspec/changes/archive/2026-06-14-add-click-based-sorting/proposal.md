## Why

站点卡片目前只能按后台手动维护的 `sort_order` 排序，无法反映“哪些站点最常被访问”。需要增加一个**按点击量排序**的开关：开启后站点按点击次数从高到低排列，让高频使用的站点自动靠前。

由于首页整页缓存在 KV，且 D1 写入有配额，点击量不适合每次点击都写库。因此采用**本地未同步增量 + 后台手动同步累加**的模型：点击只累加在浏览器 localStorage，站长在后台点“同步”按钮时一次性把本地增量累加到数据库，从而让多端共享真实总点击量。

## What Changes

- `sites` 表新增 `clicks` 字段，记录数据库侧累计点击量。
- 新增全站设置开关 `sort_by_clicks`：
  - **开启** → 站点按有效点击量排序，覆盖手动 `sort_order`。
  - **关闭** → 维持现有 `sort_order` 排序（默认）。
- 排序范围：
  - **“全部”视图**按有效点击量全局降序。
  - **具体分类视图**保持分类树分组顺序，并在每个分类组内按有效点击量降序。
- 前端点击站点卡片时在 localStorage 累加该站点的**未同步增量**，不立即重排。
- 页面加载时点击量取值策略：**数据库 clicks + 本地未同步 delta**。
- 首页 SSR 可按 DB clicks 预排；前端加载后在开启点击排序时用 DB clicks + 本地 delta 重绘首屏排序。
- 新增后台 API：把本地点击增量累加到数据库，并标记首页缓存 dirty。
- 现有“刷新缓存”动作扩展为：检测本地未同步增量并提示风险；刷新成功后清空本地未同步增量，使本设备以 DB clicks 为准。
- 后台设置页新增“按点击量排序”开关与“同步点击量到数据库”按钮。
- 后台书签编辑支持设置 clicks 绝对值。
- 配置导入导出包含 clicks；旧格式覆盖导入缺少 clicks 时保留 DB 原值。
- 旧版 localStorage key `iori_clicks` 若存在，会按 `max(0, 旧本地值 - DB clicks)` 迁移为新 key `iori_click_deltas` 的未同步增量。

## Capabilities

### New Capabilities
- `click-tracking`: 站点点击量的本地增量计数、后台增量同步、刷新缓存清空本地增量、管理员设置绝对值、导入导出 clicks，以及基于点击量的排序开关。

### Modified Capabilities
<!-- 无现有 spec 的需求变更（openspec/specs 中无 click-tracking 主规格），故留空 -->

## Impact

- **数据库**: `sites` 表新增 `clicks INTEGER DEFAULT 0`，经 `functions/lib/schema-migration.js` 增量迁移；`schema.sql` 同步更新。
- **设置**: `functions/lib/settings-parser.js` 新增 `sort_by_clicks`（bool）。
- **服务端渲染**: `functions/index.js` 的 sites 查询 SELECT 带上 `clicks`、注入 `IORI_SITES`，并根据开关做 DB clicks 预排。
- **新增 API**: `functions/api/clicks/sync.js`（增量累加，后台鉴权 + 标记缓存 dirty）。
- **刷新缓存扩展**: 现有刷新缓存动作（`/api/cache/clear` + `public/js/admin-cache.js`）返回 DB clicks 信息并在前端清空未同步增量。
- **前端**: `public/js/clicks-storage.js` 管理本地 delta 与旧 key 迁移；`public/js/main.js` 点击累加 delta、合并取值、首屏重绘、按开关排序。
- **后台**: admin 设置页与书签管理页新增开关、点击量列、同步按钮、编辑 clicks 字段。
