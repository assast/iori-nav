# 设计文档

## 概述

本设计文档描述了书签导航系统增强功能的技术实现方案。这些增强功能包括：

1. **GitHub搜索引擎集成** - 添加GitHub作为站外搜索选项
2. **搜索体验优化** - 所有搜索引擎支持实时过滤和自动还原
3. **完整备用链接支持** - 从数据库到前端的完整实现

系统架构基于Cloudflare Pages + D1数据库 + Workers，采用服务端渲染(SSR)和客户端渲染(CSR)混合模式。

## 架构

### 系统组件

```
┌─────────────────────────────────────────────────────────────┐
│                        用户浏览器                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  搜索引擎UI   │  │  分类导航     │  │  书签卡片     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
└───────────────────────────┼──────────────────────────────────┘
                            │
                    ┌───────▼────────┐
                    │  main.js       │
                    │  (客户端逻辑)   │
                    └───────┬────────┘
                            │
┌───────────────────────────┼──────────────────────────────────┐
│                    Cloudflare Workers                         │
│                    ┌──────▼────────┐                         │
│                    │ functions/    │                         │
│                    │ index.js      │                         │
│                    │ (服务端渲染)   │                         │
│                    └──────┬────────┘                         │
│                           │                                  │
│         ┌─────────────────┼─────────────────┐               │
│         │                 │                 │               │
│    ┌────▼────┐      ┌────▼────┐      ┌────▼────┐          │
│    │ D1 DB   │      │ KV      │      │ Cookie  │          │
│    │ (sites) │      │ (auth)  │      │ (state) │          │
│    └─────────┘      └─────────┘      └─────────┘          │
└─────────────────────────────────────────────────────────────┘
```

### 数据流

1. **首次加载流程**:
   - 用户访问 → Workers读取Cookie → 查询D1数据库 → 服务端渲染HTML → 返回浏览器
   
2. **客户端导航流程**:
   - 用户点击分类 → JavaScript拦截 → 从预加载数据过滤 → 客户端渲染 → 更新Cookie

3. **搜索流程**:
   - 用户输入 → 实时过滤DOM → 更新显示计数 → (站外搜索时)打开新标签页

## 组件和接口

### 1. 搜索引擎组件

#### 1.1 搜索引擎选项UI

**位置**: `functions/index.js` (服务端渲染)

**HTML结构**:
```html
<div class="search-engine-wrapper">
  <label class="search-engine-option active" data-engine="local">站内</label>
  <label class="search-engine-option" data-engine="google">Google</label>
  <label class="search-engine-option" data-engine="baidu">Baidu</label>
  <label class="search-engine-option" data-engine="bing">Bing</label>
  <label class="search-engine-option" data-engine="github">GitHub</label>
</div>
```

**状态管理**:
- 当前选择的搜索引擎存储在 `localStorage.search_engine`
- 默认值: `'local'`
- 页面加载时从localStorage恢复状态

#### 1.2 搜索输入处理

**位置**: `public/js/main.js`

**接口**:
```javascript
// 搜索引擎状态
let currentSearchEngine = 'local' | 'google' | 'baidu' | 'bing' | 'github';

// 更新搜索引擎UI
function updateSearchEngineUI(engine: string): void

// 搜索输入事件处理
searchInput.addEventListener('input', (e) => {
  // 实时过滤书签卡片
  filterCards(keyword);
  // 更新标题显示
  updateHeading(keyword);
});

// 回车键处理
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && currentSearchEngine !== 'local') {
    // 打开站外搜索
    openExternalSearch(query, currentSearchEngine);
  }
});
```

**搜索URL模板**:
```javascript
const SEARCH_URLS = {
  google: 'https://www.google.com/search?q={query}',
  baidu: 'https://www.baidu.com/s?wd={query}',
  bing: 'https://www.bing.com/search?q={query}',
  github: 'https://github.com/search?q={query}&type=repositories'
};
```

#### 1.3 实时过滤逻辑

**算法**:
```javascript
function filterCards(keyword) {
  const lowerKeyword = keyword.toLowerCase().trim();
  const cards = document.querySelectorAll('.site-card');
  
  if (lowerKeyword === '') {
    // 空输入：显示所有卡片
    cards.forEach(card => card.classList.remove('hidden'));
  } else {
    // 有输入：根据匹配结果显示/隐藏
    cards.forEach(card => {
      const name = card.dataset.name.toLowerCase();
      const url = card.dataset.url.toLowerCase();
      const catalog = card.dataset.catalog.toLowerCase();
      const desc = card.dataset.desc.toLowerCase();
      
      const matches = name.includes(lowerKeyword) ||
                     url.includes(lowerKeyword) ||
                     catalog.includes(lowerKeyword) ||
                     desc.includes(lowerKeyword);
      
      if (matches) {
        card.classList.remove('hidden');
      } else {
        card.classList.add('hidden');
      }
    });
  }
  
  updateHeading(lowerKeyword);
}
```

**性能考虑**:
- 使用 `dataset` 属性避免DOM查询
- 使用CSS类切换而非display属性
- 不使用防抖，保持即时响应

### 2. 分类记忆组件

#### 2.1 Cookie管理

**Cookie规格**:
- 名称: `iori_last_category`
- 值: 分类ID (整数)
- 路径: `/`
- 有效期: 365天
- SameSite: `Lax`

**设置Cookie** (客户端):
```javascript
function setCookie(name, value, days) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + value + expires + "; path=/; SameSite=Lax";
}
```

**读取Cookie** (服务端):
```javascript
const cookies = request.headers.get('Cookie') || '';
const match = cookies.match(/iori_last_category=(\d+)/);
const cookieCatId = match ? parseInt(match[1]) : null;
```

#### 2.2 服务端渲染逻辑

**位置**: `functions/index.js`

**决策流程**:
```javascript
// 1. 检查URL参数
let requestedCatalogName = url.searchParams.get('catalog');

// 2. 如果没有URL参数
if (!requestedCatalogName) {
  // 2.1 优先检查Cookie (如果功能开启)
  if (homeRememberLastCategory) {
    const cookieCatId = readCookieCategoryId(request);
    if (cookieCatId && categoryMap.has(cookieCatId)) {
      requestedCatalogName = categoryMap.get(cookieCatId).catelog;
    }
  }
  
  // 2.2 回退到默认分类设置
  if (!requestedCatalogName) {
    const defaultCat = homeDefaultCategory.trim();
    if (defaultCat && categoryIdMap.has(defaultCat)) {
      requestedCatalogName = defaultCat;
    }
  }
}

// 3. 根据分类名称查询书签
const targetCategoryIds = getCategoryIds(requestedCatalogName);
const sites = filterSitesByCategories(allSites, targetCategoryIds);

// 4. 渲染HTML
return renderHTML(sites, requestedCatalogName);
```

**优先级**:
1. URL参数 (最高优先级)
2. Cookie记忆 (如果功能开启)
3. 默认分类设置
4. 显示全部

#### 2.3 客户端导航

**位置**: `public/js/main.js`

**AJAX导航逻辑**:
```javascript
document.addEventListener('click', async (e) => {
  const link = e.target.closest('a[href^="?catalog="]');
  if (!link) return;
  
  e.preventDefault();
  const catalogId = link.getAttribute('data-id');
  
  // 1. 从预加载数据过滤
  const filteredSites = catalogId 
    ? allSites.filter(s => s.catelog_id == catalogId)
    : allSites;
  
  // 2. 客户端渲染
  renderSites(filteredSites);
  
  // 3. 更新导航状态
  updateNavigationState(catalogId);
  
  // 4. 保存到Cookie (如果功能开启)
  if (config.rememberLastCategory) {
    if (catalogId) {
      setCookie('iori_last_category', catalogId, 365);
    } else {
      setCookie('iori_last_category', '', -1); // 删除Cookie
    }
  }
});
```

### 3. 备用链接组件

#### 3.1 数据库Schema

**表结构修改**:
```sql
-- sites表添加字段
ALTER TABLE sites ADD COLUMN backup_url TEXT;

-- pending_sites表添加字段
ALTER TABLE pending_sites ADD COLUMN backup_url TEXT;
```

**自动迁移逻辑** (位置: `functions/index.js`):
```javascript
if (!indexesChecked) {
  try {
    // 检查backup_url字段是否存在
    await env.NAV_DB.prepare("SELECT backup_url FROM sites LIMIT 1").first();
  } catch (e) {
    // 字段不存在，添加字段
    await env.NAV_DB.prepare("ALTER TABLE sites ADD COLUMN backup_url TEXT").run();
  }
  
  // 对pending_sites表执行相同操作
  try {
    await env.NAV_DB.prepare("SELECT backup_url FROM pending_sites LIMIT 1").first();
  } catch (e) {
    await env.NAV_DB.prepare("ALTER TABLE pending_sites ADD COLUMN backup_url TEXT").run();
  }
  
  indexesChecked = true;
}
```

#### 3.2 API接口

**查询接口** (GET /api/config):
```javascript
// 返回数据包含backup_url字段
const { results } = await env.NAV_DB.prepare(`
  SELECT id, name, url, logo, desc, catelog_id, catelog_name, 
         sort_order, is_private, backup_url, create_time, update_time
  FROM sites
  WHERE ...
`).all();
```

**创建接口** (POST /api/config):
```javascript
const { name, url, logo, desc, catelog_id, backup_url } = await request.json();

// 验证backup_url
const sanitizedBackupUrl = backup_url ? sanitizeUrl(backup_url) : null;

await env.NAV_DB.prepare(`
  INSERT INTO sites (name, url, logo, desc, catelog_id, backup_url, ...)
  VALUES (?, ?, ?, ?, ?, ?, ...)
`).bind(name, url, logo, desc, catelog_id, sanitizedBackupUrl, ...).run();
```

**更新接口** (PUT /api/config/:id):
```javascript
const { backup_url, ...otherFields } = await request.json();

const sanitizedBackupUrl = backup_url ? sanitizeUrl(backup_url) : null;

await env.NAV_DB.prepare(`
  UPDATE sites 
  SET backup_url = ?, ...
  WHERE id = ?
`).bind(sanitizedBackupUrl, ..., id).run();
```

#### 3.3 设置管理

**数据库存储**:
```sql
-- settings表
INSERT INTO settings (key, value) VALUES ('layout_hide_backup_url', 'false');
```

**服务端读取** (位置: `functions/index.js`):
```javascript
let layoutHideBackupUrl = false;

const { results } = await env.NAV_DB.prepare(`
  SELECT key, value FROM settings WHERE key = 'layout_hide_backup_url'
`).all();

if (results && results.length > 0) {
  layoutHideBackupUrl = results[0].value === 'true';
}
```

**设置API** (POST /api/settings):
```javascript
const { layout_hide_backup_url } = await request.json();

await env.NAV_DB.prepare(`
  INSERT OR REPLACE INTO settings (key, value)
  VALUES ('layout_hide_backup_url', ?)
`).bind(layout_hide_backup_url ? 'true' : 'false').run();
```

#### 3.4 前端显示

**服务端渲染** (位置: `functions/index.js`):
```javascript
const sitesGridMarkup = sites.map((site, index) => {
  // ... 其他代码 ...
  
  // 备用链接HTML
  const backupUrl = sanitizeUrl(site.backup_url);
  const hasBackupUrl = Boolean(backupUrl);
  const backupUrlHtml = (layoutHideBackupUrl || !hasBackupUrl) ? '' : `
    <div class="mt-2 flex items-center justify-between">
      <a href="${escapeHTML(backupUrl)}" 
         target="_blank" 
         rel="noopener noreferrer" 
         class="text-xs text-orange-600 dark:text-orange-400 truncate flex-1 min-w-0 mr-2" 
         title="${escapeHTML(backupUrl)}">
        ${escapeHTML(backupUrl)}
      </a>
      <button class="copy-btn-backup ..." data-url="${escapeHTML(backupUrl)}">
        <svg>...</svg>
        <span class="copy-text">复制</span>
        <span class="copy-success hidden">已复制!</span>
      </button>
    </div>
  `;
  
  return `
    <div class="site-card">
      ...
      ${linksHtml}
      ${backupUrlHtml}
    </div>
  `;
}).join('');
```

**客户端渲染** (位置: `public/js/main.js`):
```javascript
function renderSites(sites) {
  const config = window.IORI_LAYOUT_CONFIG || {};
  const hideBackupUrl = config.hideBackupUrl === true;
  
  sites.forEach(site => {
    const backupUrl = normalizeUrl(site.backup_url);
    const hasBackupUrl = !!backupUrl;
    
    const backupUrlHtml = (hideBackupUrl || !hasBackupUrl) ? '' : `
      <div class="mt-2 flex items-center justify-between">
        <a href="${escapeHTML(backupUrl)}" 
           target="_blank" 
           rel="noopener noreferrer" 
           class="text-xs text-orange-600 dark:text-orange-400 truncate">
          ${escapeHTML(backupUrl)}
        </a>
        <button class="copy-btn-backup" data-url="${escapeHTML(backupUrl)}">
          ...
        </button>
      </div>
    `;
    
    card.innerHTML = `
      ...
      ${linksHtml}
      ${backupUrlHtml}
    `;
    
    // 绑定复制事件
    const copyBtnBackup = card.querySelector('.copy-btn-backup');
    if (copyBtnBackup) {
      copyBtnBackup.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const url = this.getAttribute('data-url');
        if (url) {
          navigator.clipboard.writeText(url).then(() => {
            showCopySuccess(this);
          });
        }
      });
    }
  });
}
```

#### 3.5 导入导出

**导出功能** (位置: `functions/api/config/export.js`):
```javascript
// JSON导出
const sites = await env.NAV_DB.prepare(`
  SELECT id, name, url, logo, desc, catelog_id, catelog_name, 
         sort_order, is_private, backup_url
  FROM sites
`).all();

const exportData = {
  sites: sites.results,
  categories: categories.results,
  version: '1.0'
};

return new Response(JSON.stringify(exportData, null, 2), {
  headers: {
    'Content-Type': 'application/json',
    'Content-Disposition': 'attachment; filename="bookmarks.json"'
  }
});
```

**导入功能** (位置: `functions/api/config/import.js`):
```javascript
const { sites } = await request.json();

for (const site of sites) {
  const backupUrl = site.backup_url ? sanitizeUrl(site.backup_url) : null;
  
  await env.NAV_DB.prepare(`
    INSERT INTO sites (name, url, logo, desc, catelog_id, backup_url, ...)
    VALUES (?, ?, ?, ?, ?, ?, ...)
  `).bind(
    site.name,
    site.url,
    site.logo,
    site.desc,
    site.catelog_id,
    backupUrl,
    ...
  ).run();
}
```

## 数据模型

### 1. 数据库表

#### sites表
```sql
CREATE TABLE sites (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  logo TEXT,
  desc TEXT,
  catelog_id INTEGER NOT NULL,
  catelog_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 9999,
  is_private INTEGER DEFAULT 0,
  backup_url TEXT,  -- 新增字段
  create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### settings表
```sql
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

-- 新增设置项
INSERT INTO settings (key, value) VALUES 
  ('layout_hide_backup_url', 'false');
```

### 2. JavaScript数据结构

#### 站点对象
```typescript
interface Site {
  id: number;
  name: string;
  url: string;
  logo?: string;
  desc?: string;
  catelog_id: number;
  catelog_name?: string;
  sort_order: number;
  is_private: number;
  backup_url?: string;  // 新增字段
  create_time: string;
  update_time: string;
}
```

#### 布局配置对象
```typescript
interface LayoutConfig {
  hideDesc: boolean;
  hideLinks: boolean;
  hideBackupUrl: boolean;  // 新增字段
  hideCategory: boolean;
  gridCols: string;
  cardStyle: string;
  enableFrostedGlass: boolean;
  rememberLastCategory: boolean;  // 新增字段
}
```

#### 搜索引擎类型
```typescript
type SearchEngine = 'local' | 'google' | 'baidu' | 'bing' | 'github';
```

### 3. Cookie数据

```typescript
interface Cookies {
  iori_last_category?: string;  // 分类ID
  wallpaper_index?: string;     // 壁纸索引
  theme?: 'light' | 'dark';     // 主题
}
```

### 4. LocalStorage数据

```typescript
interface LocalStorage {
  search_engine: SearchEngine;  // 搜索引擎选择
  iori_last_category?: string;  // 分类ID (备份)
  theme: 'light' | 'dark';      // 主题
}
```

## 错误处理

### 1. 数据库错误

**场景**: 数据库字段不存在或迁移失败

**处理**:
```javascript
try {
  await env.NAV_DB.prepare("SELECT backup_url FROM sites LIMIT 1").first();
} catch (e) {
  console.error('backup_url field check failed:', e);
  try {
    await env.NAV_DB.prepare("ALTER TABLE sites ADD COLUMN backup_url TEXT").run();
    console.log('backup_url field added successfully');
  } catch (e2) {
    console.error('Failed to add backup_url field:', e2);
    // 继续运行，但备用链接功能不可用
  }
}
```

**降级策略**: 如果字段添加失败，系统继续运行，但备用链接功能不可用。

### 2. URL验证错误

**场景**: 用户输入无效的URL

**处理**:
```javascript
function sanitizeUrl(url) {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return '';  // 只接受HTTP/HTTPS协议
    }
    return parsed.href;
  } catch {
    // URL解析失败
    if (/^https?:\/\//i.test(trimmed)) {
      return trimmed;  // 宽松处理
    }
    return '';  // 无效URL
  }
}
```

**用户反馈**: 在表单验证时显示错误提示。

### 3. Cookie读取错误

**场景**: Cookie格式错误或分类ID无效

**处理**:
```javascript
let cookieCatId = null;
try {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(/iori_last_category=(\d+)/);
  if (match) {
    cookieCatId = parseInt(match[1]);
    // 验证分类ID是否存在
    if (!categoryMap.has(cookieCatId)) {
      cookieCatId = null;  // 无效ID，忽略
    }
  }
} catch (e) {
  console.error('Failed to read category cookie:', e);
  cookieCatId = null;
}
```

**降级策略**: 如果Cookie无效，回退到默认分类设置。

### 4. 搜索引擎状态错误

**场景**: localStorage不可用或数据损坏

**处理**:
```javascript
let currentSearchEngine = 'local';
try {
  const saved = localStorage.getItem('search_engine');
  if (saved && ['local', 'google', 'baidu', 'bing', 'github'].includes(saved)) {
    currentSearchEngine = saved;
  }
} catch (e) {
  console.error('Failed to read search engine preference:', e);
  // 使用默认值
}
```

**降级策略**: 使用默认的站内搜索。

### 5. 客户端渲染错误

**场景**: 预加载数据不可用或渲染失败

**处理**:
```javascript
try {
  if (!window.IORI_SITES) {
    // 预加载数据不可用，回退到服务端渲染
    window.location.href = href;
    return;
  }
  
  const filteredSites = filterSites(catalogId);
  renderSites(filteredSites);
} catch (err) {
  console.error('Client-side navigation failed:', err);
  // 回退到服务端渲染
  window.location.href = href;
}
```

**降级策略**: 回退到传统的页面跳转。

### 6. 复制功能错误

**场景**: Clipboard API不可用

**处理**:
```javascript
navigator.clipboard.writeText(url).then(() => {
  showCopySuccess(btn);
}).catch(() => {
  // 备用方法：使用execCommand
  const textarea = document.createElement('textarea');
  textarea.value = url;
  textarea.style.position = 'fixed';
  document.body.appendChild(textarea);
  textarea.select();
  try {
    document.execCommand('copy');
    showCopySuccess(btn);
  } catch (e) {
    alert('复制失败，请手动复制');
  }
  document.body.removeChild(textarea);
});
```

**降级策略**: 使用传统的execCommand方法，最后提示用户手动复制。

## 测试策略

本项目将采用双重测试方法：

1. **单元测试** - 验证具体示例、边界情况和错误条件
2. **属性测试** - 验证跨所有输入的通用属性

两者互补且都是全面覆盖所必需的。单元测试捕获具体错误，属性测试验证一般正确性。

### 测试框架

- **单元测试**: Vitest
- **属性测试**: fast-check (JavaScript属性测试库)
- **测试运行**: 每个属性测试最少100次迭代

### 测试配置

每个属性测试必须：
- 运行至少100次迭代（由于随机化）
- 引用其设计文档属性
- 使用标签格式: `Feature: bookmark-enhancements, Property {number}: {property_text}`

### 单元测试重点

单元测试应专注于：
- 演示正确行为的具体示例
- 组件之间的集成点
- 边界情况和错误条件

属性测试应专注于：
- 适用于所有输入的通用属性
- 通过随机化实现全面的输入覆盖

避免编写过多的单元测试 - 属性测试处理大量输入的覆盖。


## 正确性属性

*属性是一个特征或行为，应该在系统的所有有效执行中保持为真——本质上是关于系统应该做什么的形式化陈述。属性作为人类可读规范和机器可验证正确性保证之间的桥梁。*

### 属性 1: 搜索引擎选择持久化

*对于任何*有效的搜索引擎选择（local、google、baidu、bing、github），保存到localStorage然后重新加载页面应该恢复相同的搜索引擎选择。

**验证需求: 1.4, 1.5**

### 属性 2: 搜索占位符一致性

*对于任何*搜索引擎选择，搜索框的占位符文本应该与选择的搜索引擎匹配（local → "搜索书签..."，google → "Google 搜索..."，等等）。

**验证需求: 1.2**

### 属性 3: 实时搜索过滤

*对于任何*搜索关键词和书签集合，过滤后显示的卡片应该只包含名称、URL、分类或描述中包含该关键词的书签（不区分大小写）。

**验证需求: 2.1, 2.4**

### 属性 4: 搜索还原往返

*对于任何*书签集合，输入搜索关键词然后删除所有输入应该恢复显示所有原始书签。

**验证需求: 2.2**

### 属性 5: 搜索结果计数一致性

*对于任何*搜索操作，标题中显示的书签数量应该等于实际显示的（非隐藏）书签卡片数量。

**验证需求: 2.5**

### 属性 6: 分类记忆往返

*对于任何*有效的分类ID，当分类记忆功能启用时，保存到Cookie然后重新加载页面（无URL参数）应该渲染该分类的书签。

**验证需求: 3.1, 3.2, 3.3**

### 属性 7: URL验证一致性

*对于任何*URL字符串，sanitizeUrl函数应该返回有效的HTTP/HTTPS URL或空字符串，并且对于所有有效的URL对象，应该返回其href属性。

**验证需求: 5.3, 5.5, 10.2**

### 属性 8: 备用链接API往返

*对于任何*书签对象（包含backup_url字段），通过API创建然后查询应该返回相同的backup_url值（如果为空则为null）。

**验证需求: 6.1, 6.3**

### 属性 9: 备用链接更新持久化

*对于任何*现有书签和新的backup_url值，通过API更新然后查询应该返回更新后的backup_url值。

**验证需求: 6.2, 6.3**

### 属性 10: 备用链接批量操作一致性

*对于任何*书签集合，批量操作（创建、更新、查询）应该正确处理每个书签的backup_url字段，不丢失或混淆数据。

**验证需求: 6.5**

### 属性 11: 设置持久化往返

*对于任何*布尔设置值（layout_hide_backup_url），保存到数据库然后重新加载应该返回相同的值。

**验证需求: 7.2, 7.4**

### 属性 12: 备用链接显示一致性

*对于任何*有backup_url的书签，当隐藏开关关闭时，服务端渲染和客户端渲染的卡片都应该包含备用链接HTML元素。

**验证需求: 8.1, 8.2**

### 属性 13: 备用链接复制功能

*对于任何*有效的备用URL，点击复制按钮应该将该URL复制到剪贴板，并且剪贴板内容应该与原始URL完全匹配。

**验证需求: 8.4**

### 属性 14: 导出数据完整性

*对于任何*书签集合，导出为JSON格式应该包含所有书签的所有字段（包括backup_url），并且每个书签对象都应该有backup_url属性（即使值为null）。

**验证需求: 9.1, 9.2**

### 属性 15: 导入导出往返

*对于任何*书签集合，导出为JSON然后导入应该产生等价的书签数据（包括所有backup_url值）。

**验证需求: 9.2, 10.1, 10.3**

### 属性 16: 导入URL验证

*对于任何*导入的书签数据，如果backup_url字段存在且格式有效，应该存储该值；如果格式无效或字段缺失，应该存储NULL。

**验证需求: 10.2, 10.3**

### 属性 17: 管理界面备用链接显示

*对于任何*书签，在管理界面的卡片中应该显示其backup_url（如果存在）或显示"未设置"（如果为null）。

**验证需求: 11.1, 11.2**

### 属性 18: 编辑表单数据往返

*对于任何*书签，点击编辑按钮应该在表单中加载其当前的backup_url值，修改后保存应该更新数据库，再次编辑应该显示更新后的值。

**验证需求: 11.4, 12.1, 12.2, 12.5**

### 边界情况和示例测试

以下验收标准应该通过单元测试（示例和边界情况）进行验证：

- **1.1**: GitHub选项在启用时显示（示例）
- **1.3**: GitHub搜索URL格式正确（示例）
- **2.3**: 空搜索显示所有书签（边界情况）
- **3.4**: 无效分类ID回退到默认（边界情况）
- **4.1-4.5**: 数据库迁移逻辑（示例）
- **5.1**: 创建表单包含备用链接输入框（示例）
- **5.4**: 空备用链接允许提交（边界情况）
- **6.4**: 删除书签同时删除backup_url（示例）
- **7.1**: 设置页面显示开关（示例）
- **7.3**: 保存成功显示提示（示例）
- **7.5**: 开关立即应用到前端（示例）
- **8.3**: 点击备用链接打开新标签页（示例）
- **8.5**: 隐藏开关启用时不显示（示例）
- **8.6**: 无备用链接时不显示区域（边界情况）
- **9.3**: HTML格式导出包含备用链接（示例）
- **9.4**: 无备用链接时导出null（边界情况）
- **9.5**: 导出提供完整下载文件（示例）
- **10.4**: 无效URL存储NULL并警告（边界情况）
- **10.5**: 缺失字段存储NULL（边界情况）
- **11.3**: 无备用链接显示"未设置"（边界情况）
- **11.5**: 过长URL截断显示（示例）
- **12.3**: NULL值显示空输入框（边界情况）
- **12.4**: 表单允许修改（示例）
