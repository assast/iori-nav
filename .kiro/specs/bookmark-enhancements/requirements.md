# 需求文档

## 简介

本文档定义了书签导航系统的增强功能需求，包括GitHub搜索引擎支持、搜索功能优化、分类记忆功能和完整的备用链接功能实现。

## 术语表

- **System**: 书签导航系统
- **User**: 使用书签导航系统的用户
- **Admin**: 管理员用户
- **Search_Engine**: 搜索引擎（站内、Google、Baidu、Bing、GitHub）
- **Backup_URL**: 备用链接
- **Category**: 书签分类
- **Cookie**: 浏览器Cookie存储
- **Database**: D1数据库
- **Server_Rendering**: 服务端渲染
- **Client_Rendering**: 客户端渲染

## 需求

### 需求 1: GitHub搜索引擎支持

**用户故事:** 作为用户，我想要使用GitHub搜索引擎选项，以便我可以直接搜索GitHub仓库。

#### 验收标准

1. WHEN 站外搜索功能启用时，THE System SHALL 在搜索引擎选项中显示GitHub选项
2. WHEN 用户选择GitHub搜索引擎时，THE System SHALL 更新搜索框占位符为"GitHub 搜索..."
3. WHEN 用户在GitHub搜索模式下按下回车键时，THE System SHALL 在新标签页打开GitHub仓库搜索结果
4. WHEN 用户切换搜索引擎时，THE System SHALL 保存用户的选择到localStorage
5. WHEN 页面加载时，THE System SHALL 恢复用户上次选择的搜索引擎

### 需求 2: 搜索功能优化

**用户故事:** 作为用户，我想要所有搜索引擎都支持实时过滤，并且删除输入时自动还原显示，以便获得更流畅的搜索体验。

#### 验收标准

1. WHEN 用户在任何搜索引擎模式下输入关键词时，THE System SHALL 实时过滤显示匹配的书签卡片
2. WHEN 用户删除搜索关键词时，THE System SHALL 自动还原所有书签卡片的显示
3. WHEN 搜索框为空时，THE System SHALL 显示所有当前分类下的书签
4. WHEN 用户输入搜索关键词时，THE System SHALL 根据书签名称、URL、分类和描述进行匹配
5. WHEN 搜索结果变化时，THE System SHALL 更新标题显示匹配的书签数量

### 需求 3: 备用链接数据库支持

**用户故事:** 作为系统管理员，我想要数据库自动支持备用链接字段，以便存储和管理书签的备用URL。

#### 验收标准

1. WHEN 系统启动时，THE System SHALL 检查sites表是否存在backup_url字段
2. IF sites表不存在backup_url字段，THEN THE System SHALL 自动添加backup_url TEXT字段
3. WHEN 系统启动时，THE System SHALL 检查pending_sites表是否存在backup_url字段
4. IF pending_sites表不存在backup_url字段，THEN THE System SHALL 自动添加backup_url TEXT字段
5. WHEN 数据库字段添加完成后，THE System SHALL 设置indexesChecked标志为true

### 需求 4: 备用链接后台管理

**用户故事:** 作为管理员，我想要在后台管理界面添加和编辑备用链接，以便为书签提供备用访问方式。

#### 验收标准

1. WHEN 管理员创建新书签时，THE System SHALL 提供备用链接输入框
2. WHEN 管理员编辑现有书签时，THE System SHALL 显示当前的备用链接值
3. WHEN 管理员提交书签表单时，THE System SHALL 验证备用链接URL格式
4. WHEN 备用链接为空时，THE System SHALL 允许提交并存储NULL值
5. WHEN 备用链接格式无效时，THE System SHALL 显示错误提示

### 需求 5: 备用链接API支持

**用户故事:** 作为开发者，我想要API完整支持备用链接的增删改查操作，以便前后端能够正确处理备用链接数据。

#### 验收标准

1. WHEN API创建书签时，THE System SHALL 接受并存储backup_url字段
2. WHEN API更新书签时，THE System SHALL 接受并更新backup_url字段
3. WHEN API查询书签时，THE System SHALL 返回backup_url字段
4. WHEN API删除书签时，THE System SHALL 同时删除backup_url数据
5. WHEN API批量操作时，THE System SHALL 正确处理所有书签的backup_url字段

### 需求 6: 备用链接设置页面

**用户故事:** 作为管理员，我想要在设置页面添加隐藏备用链接的开关，以便控制前端是否显示备用链接。

#### 验收标准

1. WHEN 管理员访问设置页面时，THE System SHALL 显示"隐藏备用链接"开关选项
2. WHEN 管理员切换开关状态时，THE System SHALL 保存设置到数据库
3. WHEN 设置保存成功后，THE System SHALL 显示成功提示
4. WHEN 页面加载时，THE System SHALL 从数据库读取当前开关状态
5. WHEN 开关状态改变时，THE System SHALL 立即应用到前端显示

### 需求 7: 备用链接前端显示

**用户故事:** 作为用户，我想要在书签卡片中看到备用链接，以便在主链接无法访问时使用备用链接。

#### 验收标准

1. WHEN 书签存在备用链接且未隐藏时，THE System SHALL 在服务端渲染的卡片中显示备用链接
2. WHEN 书签存在备用链接且未隐藏时，THE System SHALL 在客户端渲染的卡片中显示备用链接
3. WHEN 用户点击备用链接时，THE System SHALL 在新标签页打开备用URL
4. WHEN 用户点击备用链接复制按钮时，THE System SHALL 复制备用URL到剪贴板
5. WHEN 备用链接隐藏开关启用时，THE System SHALL 不显示任何备用链接
6. WHEN 书签没有备用链接时，THE System SHALL 不显示备用链接区域

### 需求 8: 导出功能支持备用链接

**用户故事:** 作为管理员，我想要导出数据时包含备用链接字段，以便完整备份书签数据。

#### 验收标准

1. WHEN 管理员导出书签数据时，THE System SHALL 在导出文件中包含backup_url字段
2. WHEN 导出JSON格式时，THE System SHALL 为每个书签包含backup_url属性
3. WHEN 导出HTML格式时，THE System SHALL 在书签元数据中包含备用链接信息
4. WHEN 书签没有备用链接时，THE System SHALL 在导出数据中包含空值或null
5. WHEN 导出完成后，THE System SHALL 提供包含完整数据的下载文件

### 需求 9: 导入功能支持备用链接

**用户故事:** 作为管理员，我想要导入数据时正确处理备用链接字段，以便恢复完整的书签数据。

#### 验收标准

1. WHEN 管理员导入包含backup_url的JSON数据时，THE System SHALL 正确解析backup_url字段
2. WHEN 导入的数据包含backup_url时，THE System SHALL 验证URL格式
3. WHEN backup_url格式有效时，THE System SHALL 存储到数据库
4. WHEN backup_url格式无效时，THE System SHALL 存储NULL值并记录警告
5. WHEN 导入的数据不包含backup_url时，THE System SHALL 为该字段存储NULL值

### 需求 10: 书签管理卡片显示备用链接

**用户故事:** 作为管理员，我想要在书签管理卡片中看到备用链接，以便快速查看和管理备用URL。

#### 验收标准

1. WHEN 管理员查看书签列表时，THE System SHALL 在每个书签卡片中显示备用链接
2. WHEN 书签存在备用链接时，THE System SHALL 显示完整的备用URL
3. WHEN 书签没有备用链接时，THE System SHALL 显示"未设置"或空白
4. WHEN 管理员点击编辑按钮时，THE System SHALL 在编辑表单中加载备用链接值
5. WHEN 备用链接过长时，THE System SHALL 使用省略号截断显示

### 需求 11: 编辑时正确加载备用链接

**用户故事:** 作为管理员，我想要编辑书签时正确加载备用链接值，以便修改或更新备用URL。

#### 验收标准

1. WHEN 管理员点击编辑书签时，THE System SHALL 从数据库查询backup_url字段
2. WHEN 查询到备用链接时，THE System SHALL 填充到编辑表单的备用链接输入框
3. WHEN 备用链接为NULL时，THE System SHALL 显示空的输入框
4. WHEN 表单加载完成后，THE System SHALL 允许管理员修改备用链接
5. WHEN 管理员保存修改时，THE System SHALL 更新数据库中的backup_url字段
