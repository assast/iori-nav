# 更新日志

## [最新版本] - 2026-01-02

### 新增功能

#### 1. GitHub 搜索引擎
- ✅ 添加 GitHub 搜索引擎选项，支持搜索 GitHub 仓库
- ✅ 在设置页面添加 GitHub 搜索引擎开关
- ✅ 搜索结果在新标签页打开

#### 2. 搜索功能优化
- ✅ 所有搜索引擎（Google、Baidu、Bing、GitHub）支持实时过滤
- ✅ 删除搜索输入时自动还原显示所有书签
- ✅ 搜索引擎选择保存在 localStorage，记住用户偏好
- ✅ 实时搜索支持书签名称、URL、分类和描述

#### 3. 分类记忆功能
- ✅ 使用 Cookie 保存最后访问的分类
- ✅ 服务端直接读取 Cookie 渲染对应分类，无需客户端跳转
- ✅ 优先级：URL 参数 > Cookie > 数据库默认设置
- ✅ AJAX 导航更新 URL 使用 `history.pushState()`
- ✅ 在设置页面添加"记住上次分类"开关

#### 4. 备用链接功能（完整实现）

##### 数据库层面
- ✅ 自动在 `sites` 表添加 `backup_url` 字段
- ✅ 自动在 `pending_sites` 表添加 `backup_url` 字段
- ✅ 多处 API 端点添加字段检查，确保数据库字段存在

##### 后台管理
- ✅ 添加书签表单支持输入备用链接
- ✅ 编辑书签表单支持修改备用链接
- ✅ 编辑时正确加载备用链接值
- ✅ 书签管理卡片显示备用链接（橙色文本）

##### API 支持
- ✅ GET `/api/config` - 查询时包含 backup_url
- ✅ POST `/api/config` - 创建时支持 backup_url
- ✅ PUT `/api/config/[id]` - 更新时支持 backup_url
- ✅ POST `/api/config/export` - 导出包含 backup_url
- ✅ POST `/api/config/import` - 导入处理 backup_url
- ✅ 在多个 API 端点添加 backup_url 字段检查

##### 前端显示
- ✅ 服务端渲染支持备用链接显示
- ✅ 客户端 AJAX 渲染支持备用链接显示
- ✅ 备用链接显示为橙色文本，与主链接区分
- ✅ 备用链接支持点击跳转（新标签页打开）
- ✅ 备用链接支持复制功能
- ✅ 复制按钮样式与主链接一致（橙色主题）
- ✅ 在设置页面添加"隐藏备用链接"开关

### 样式优化
- ✅ 备用链接文本：橙色（`text-orange-600 dark:text-orange-400`）
- ✅ 备用链接复制按钮：橙色主题（`bg-orange-100 text-orange-700 hover:bg-orange-200`）
- ✅ 主链接复制按钮：绿色主题（`bg-accent-100 text-accent-700 hover:bg-accent-200`）
- ✅ 两个按钮大小和样式完全一致，仅颜色不同

### 修复问题
- ✅ 修复分类记忆只能记录一次的问题
- ✅ 修复 URL 参数优先级问题
- ✅ 修复书签管理界面备用链接不显示的问题
- ✅ 修复编辑表单备用链接值不加载的问题
- ✅ 修复 main.js 语法错误（缺失闭合括号）
- ✅ 修复多级分类点击不响应的问题
- ✅ 修复备用链接按钮样式不一致的问题

### 技术改进
- ✅ 使用 Cookie 实现服务端可读的分类记忆
- ✅ 数据库字段自动迁移机制
- ✅ 完善的导入导出功能
- ✅ 统一的样式系统
- ✅ 完整的错误处理

### 文件变更
- `functions/index.js` - 服务端渲染、数据库字段检查、备用链接支持
- `functions/api/config/index.js` - API 支持备用链接
- `functions/api/config/[id].js` - 更新支持备用链接
- `functions/api/config/export.js` - 导出包含备用链接
- `functions/api/config/import.js` - 导入处理备用链接
- `public/js/main.js` - 搜索优化、分类记忆、备用链接显示
- `public/js/admin.js` - 后台管理备用链接支持
- `public/js/admin-settings.js` - 设置页面新增开关
- `public/admin/index.html` - 添加备用链接输入字段
- `public/index.html` - 版本号更新

### 配置项
新增以下设置选项：
- `home_search_engine_enabled` - 是否启用搜索引擎选择
- `home_remember_last_category` - 是否记住上次访问的分类
- `layout_hide_backup_url` - 是否隐藏备用链接

### 使用说明

#### 搜索功能
1. 点击搜索框旁的搜索引擎图标选择搜索引擎
2. 输入关键词实时过滤书签
3. 按 Enter 键使用选中的搜索引擎搜索
4. 删除输入自动还原显示所有书签

#### 分类记忆
1. 在设置中启用"记住上次分类"
2. 切换分类后，下次访问自动打开该分类
3. URL 参数优先级最高，可覆盖记忆的分类

#### 备用链接
1. 在后台管理添加/编辑书签时输入备用链接
2. 前端显示为橙色文本，位于主链接下方
3. 点击备用链接在新标签页打开
4. 点击复制按钮复制备用链接
5. 在设置中可选择隐藏备用链接

### 兼容性
- 自动数据库迁移，无需手动操作
- 向后兼容，旧数据不受影响
- 导入导出完全兼容新旧格式

---

## 开发者信息
- 所有更改已提交到 Git 仓库
- dev 和 master 分支已同步
- 代码已通过语法检查
- 功能已完整测试
