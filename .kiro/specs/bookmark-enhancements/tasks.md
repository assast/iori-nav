# 实施计划: 书签增强功能

## 概述

本实施计划基于当前代码库的分析，所有功能已完成实施。已完成的功能包括：
- ✅ GitHub搜索引擎支持（需求1）- 刚刚完成
- ✅ 搜索功能优化（需求2）
- ✅ 分类记忆功能（需求3）
- ✅ 备用链接数据库支持（需求4）
- ✅ 备用链接API支持（需求6）
- ✅ 备用链接前端显示（需求8）
- ✅ 备用链接导出功能（需求9）
- ✅ 备用链接导入功能（需求10）
- ✅ 备用链接后台管理界面（需求5）
- ✅ 备用链接设置页面（需求7）

## 已完成任务

### 0. GitHub搜索引擎支持 ✅ (刚刚完成)

- ✅ 0.1 在搜索引擎选项中添加GitHub选项
  - 已修改 `functions/index.js` 添加 GitHub 搜索引擎选项到服务端渲染
  - 已修改 `functions/index.js` 添加 GitHub 占位符文本处理
  - _需求: 1.1, 1.2_

- ✅ 0.2 更新客户端搜索引擎处理
  - 已修改 `public/js/main.js` 在 `updateSearchEngineUI` 函数中添加 GitHub 占位符
  - 已修改 `public/js/main.js` 在搜索URL处理中添加 GitHub 搜索URL
  - GitHub 搜索URL: `https://github.com/search?q={query}&type=repositories`
  - _需求: 1.2, 1.3, 1.4, 1.5_

### 1. 备用链接后台管理界面 ✅

- ✅ 1.1 在后台管理界面添加备用链接输入框
  - 已修改 `public/admin/index.html` 添加备用链接输入字段到新增书签表单
  - 已修改 `public/admin/index.html` 添加备用链接输入字段到编辑书签表单
  - _需求: 5.1, 5.2_

- ✅ 1.2 更新新增书签表单提交逻辑
  - 已修改 `public/js/admin-bookmarks.js` 中的表单提交逻辑
  - 在提交数据中包含 `backup_url` 字段
  - _需求: 5.1, 5.3_

- ✅ 1.3 更新编辑书签表单提交逻辑
  - 已修改 `public/js/admin.js` 中的 `handleEdit` 函数
  - 在更新数据中包含 `backup_url` 字段
  - 确保现有的备用链接值正确加载到表单中
  - _需求: 5.2, 5.3, 12.5_

### 2. 备用链接设置页面 ✅

- ✅ 2.1 在设置页面添加隐藏备用链接开关
  - 已修改 `public/admin/index.html` 在设置标签页添加"隐藏备用链接"复选框
  - _需求: 7.1_

- ✅ 2.2 实现设置保存功能
  - 已修改 `public/js/admin-settings.js` 处理 `layout_hide_backup_url` 设置
  - 在保存设置时将开关状态发送到API
  - _需求: 7.2, 7.3_

- ✅ 2.3 实现设置加载功能
  - 已修改 `public/js/admin-settings.js` 从API加载 `layout_hide_backup_url` 设置
  - 在页面加载时正确设置复选框状态
  - _需求: 7.4_

- ✅ 2.4 更新设置API端点
  - 已修改 `functions/api/settings.js` 处理 `layout_hide_backup_url` 参数
  - 确保设置正确保存到数据库
  - 确保设置正确从数据库读取
  - _需求: 7.2, 7.4, 7.5_

### 3. 后端API更新 ✅

- ✅ 3.1 数据库迁移
  - 已在 `functions/index.js` 添加 `backup_url` 字段的自动迁移逻辑
  - _需求: 4.1_

- ✅ 3.2 更新API端点
  - 已修改 `functions/api/config/index.js` 支持 `backup_url` 字段（GET/POST）
  - 已修改 `functions/api/config/[id].js` 支持 `backup_url` 字段（PUT）
  - 已修改 `functions/api/config/export.js` 在导出中包含 `backup_url`
  - 已修改 `functions/api/config/import.js` 在导入中处理 `backup_url`
  - _需求: 6.1, 6.2, 9.1, 10.1_

### 4. 前端显示更新 ✅

- ✅ 4.1 服务器端渲染
  - 已修改 `functions/index.js` 在服务器端渲染中包含备用URL
  - 添加橙色样式的备用URL显示
  - 添加复制按钮功能
  - _需求: 8.1, 8.2, 8.3_

- ✅ 4.2 客户端渲染
  - 已修改 `public/js/main.js` 在客户端渲染中包含备用URL
  - 添加橙色样式的备用URL显示
  - 添加复制按钮功能
  - 支持隐藏备用URL设置
  - _需求: 8.1, 8.2, 8.3, 8.4_

- ✅ 4.3 配置传递
  - 已修改 `functions/index.js` 将 `hideBackupUrl` 配置传递给客户端
  - 已修改 `public/js/main.js` 使用配置控制备用URL显示
  - _需求: 8.4_

## 待完成任务

目前所有功能已完成实施，包括：
- ✅ GitHub 搜索引擎支持（刚刚添加）
- ✅ 备用链接完整功能
- ✅ 分类记忆功能
- ✅ 搜索功能优化

### 建议的后续工作

- [ ] 1. 端到端测试
  - 测试 GitHub 搜索引擎是否正常工作
  - 测试后台管理界面的备用链接添加和编辑
  - 测试设置页面的隐藏备用链接开关
  - 测试前端显示是否正确响应设置
  - 测试导入导出功能是否正确处理备用URL
  - 确保所有功能正常工作

- [ ] 2. 提交代码到 Git
  - 提交所有修改到版本控制系统

## 注意事项

- ✅ 所有代码修改已完成，包括 GitHub 搜索引擎支持
- ✅ GitHub 搜索引擎已添加到搜索选项中，搜索 GitHub 仓库
- 备用链接字段在所有地方都是可选的（允许NULL值）
- 备用URL使用橙色样式以区别于主URL（蓝色）
- 复制按钮功能已集成到现有的复制逻辑中
- 搜索引擎选择会保存到 localStorage 并在页面重新加载时恢复
