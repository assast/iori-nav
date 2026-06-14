## 1. 数据层

- [x] 1.1 在 `functions/lib/schema-migration.js` 的 `runIncrementalMigrations` 中，检测 sites 表缺少 `clicks` 列时执行 `ALTER TABLE sites ADD COLUMN clicks INTEGER DEFAULT 0`
- [x] 1.2 在 `functions/lib/settings-parser.js` 的 `SETTINGS_SCHEMA` 中新增 `sort_by_clicks: { default: false, type: 'bool' }`
- [x] 1.3 评估是否需要 `clicks` 排序索引；当前排序在内存完成，不新增索引

## 2. 服务端渲染与排序

- [x] 2.1 在 `functions/index.js` 的站点查询 SELECT 中补上 `clicks` 字段
- [x] 2.2 将 `sort_by_clicks` 设置传入前端布局配置（IORI_LAYOUT_CONFIG）
- [x] 2.3 在 IORI_SITES 注入中带上每个站点的 `clicks` 值
- [x] 2.4 确认开关关闭时排序行为与现状（sort_order ASC, create_time DESC）一致
- [x] 2.5 开启点击排序时 SSR 使用 DB clicks 预排，前端首屏再用 DB clicks + local delta 重绘

## 3. 同步、拉取与设置 API

- [x] 3.1 新增 `functions/api/clicks/sync.js`：`onRequestPost`，管理员鉴权，接收本地 delta map，逐站 `UPDATE sites SET clicks = coalesce(clicks, 0) + ? WHERE id = ?`（增量语义）
- [x] 3.2 同步成功后标记首页缓存 dirty（复用 `markHomeCacheDirty` / 现有缓存失效机制）
- [x] 3.3 未授权请求返回 401，不修改数据
- [x] 3.4 扩展 `functions/api/cache/clear.js`：刷新缓存成功时读取 DB 当前 `{ siteId: clicks }` 映射并返回给前端，前端据此清空本地未同步增量
- [x] 3.5 在书签编辑接口中提供设置 clicks 绝对值能力

## 4. 前端点击计数与排序

- [x] 4.1 在 `public/js/main.js` 卡片点击处对 localStorage 中该站点 delta 累加 1，不触发网络写入
- [x] 4.2 设计 localStorage 存储结构 `{ siteId: delta }`，封装读/写/累加/同步清理工具函数
- [x] 4.3 页面加载时按“DB clicks + local delta”合并出每个站点的有效 clicks 值
- [x] 4.4 在 `getSitesForCategory` / 渲染排序逻辑中，当 `sort_by_clicks` 开启时改为 clicks 降序；全部视图全局排，分类视图保持分类分组并组内排序
- [x] 4.5 确认点击不立即重排，新顺序下次加载/刷新/重绘生效
- [x] 4.6 迁移旧 localStorage key `iori_clicks` 为新 key `iori_click_deltas`

## 5. 后台管理

- [x] 5.1 在后台设置页新增“按点击量排序”开关，读写 `sort_by_clicks`
- [x] 5.2 在后台新增“同步点击量到数据库”按钮，调用 sync 接口并提示结果（含失败保留本地数据）
- [x] 5.3 同步成功后仅清理已提交 delta，保留同步期间新增点击
- [x] 5.4 扩展现有“刷新缓存”按钮逻辑：存在未同步 delta 时提示风险；请求成功后清空本地 delta
- [x] 5.5 在后台站点编辑中提供设置 clicks 绝对值的入口

## 6. 导入导出

- [x] 6.1 导出站点时包含 clicks 字段
- [x] 6.2 新格式导入显式包含 clicks 时写入该值
- [x] 6.3 旧格式覆盖导入缺少 clicks 时保留 DB 原 clicks

## 7. 验证

- [x] 7.1 迁移验证：旧库升级后 clicks 列存在且默认 0
- [x] 7.2 开关验证：开/关切换后首页排序符合预期（分类内 vs 全局）
- [x] 7.3 同步验证：本地点击后同步 → DB 值按 delta 累加 → 本地 delta 清空
- [x] 7.4 刷新缓存拉取验证：DB 修改 clicks 后，在后台刷新缓存 → 当前设备本地 delta 清空，以 DB clicks 为准
- [x] 7.5 鉴权验证：未登录调用 sync 接口返回 401
- [x] 7.6 合并策略验证：新增站点本地无记录时显示 DB 值；有本地 delta 时显示 DB + delta
- [x] 7.7 静态验证：`git diff --check` 与关键 JS 文件 `node --check` 通过
