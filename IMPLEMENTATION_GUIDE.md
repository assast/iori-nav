# 功能实现指南

## 已完成的功能

### 1. ✅ 添加 GitHub 搜索引擎
- 在搜索引擎选项中添加了 GitHub
- 支持搜索 GitHub 仓库

### 2. ✅ 站外搜索同时触发站内搜索
- 当使用站外搜索引擎（Google/Baidu/Bing/GitHub）时，按回车会同时：
  - 打开新标签页进行站外搜索
  - 在当前页面执行站内搜索过滤

### 3. ✅ 分类记忆功能
- 使用 Cookie 和 localStorage 双重保存
- 服务端直接渲染，无需客户端跳转
- 刷新页面保持当前分类

## 待完成的功能

### 4. 备用链接功能

需要在以下位置添加代码：

#### 4.1 数据库字段（已添加）
```sql
ALTER TABLE sites ADD COLUMN backup_url TEXT;
ALTER TABLE pending_sites ADD COLUMN backup_url TEXT;
```

#### 4.2 服务端渲染（functions/index.js）

在站点卡片渲染代码中，需要添加备用链接的HTML（约在第780-820行）：

```javascript
// 在 linksHtml 定义之后添加
const backupUrl = sanitizeUrl(site.backup_url);
const hasBackupUrl = Boolean(backupUrl);
const backupUrlHtml = (layoutHideBackupUrl || !hasBackupUrl) ? '' : `
  <div class="mt-2 flex items-center justify-between">
    <span class="text-xs text-orange-600 dark:text-orange-400 truncate flex-1 min-w-0 mr-2" title="${escapeHTML(backupUrl)}">
      备用: ${escapeHTML(backupUrl)}
    </span>
    <button class="copy-btn-backup relative flex items-center px-2 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50 rounded-full text-xs font-medium transition-colors" data-url="${escapeHTML(backupUrl)}">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ${layoutGridCols >= '5' ? '' : 'mr-1'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
      ${layoutGridCols >= '5' ? '' : '<span class="copy-text">复制</span>'}
      <span class="copy-success hidden absolute -top-8 right-0 bg-orange-500 text-white text-xs px-2 py-1 rounded shadow-md">已复制!</span>
    </button>
  </div>
`;

// 然后在卡片HTML中，在 ${linksHtml} 之后添加 ${backupUrlHtml}
```

#### 4.3 客户端JavaScript（public/js/main.js）

在 renderSites 函数中（约在第600-700行），添加备用链接的渲染和事件处理：

```javascript
// 在 renderSites 函数中，添加备用链接的处理
const backupUrl = normalizeUrl(site.backup_url);
const hasBackupUrl = !!backupUrl;
const hideBackupUrl = config.hideBackupUrl === true;

const backupUrlHtml = (hideBackupUrl || !hasBackupUrl) ? '' : `
  <div class="mt-2 flex items-center justify-between">
    <a href="${escapeHTML(backupUrl)}" target="_blank" rel="noopener noreferrer" class="text-xs text-orange-600 truncate flex-1 min-w-0 mr-2" title="${escapeHTML(backupUrl)}">
      备用: ${escapeHTML(backupUrl)}
    </a>
    <button class="copy-btn-backup relative flex items-center px-2 py-1 bg-orange-100 text-orange-700 hover:bg-orange-200 rounded-full text-xs font-medium transition-colors" data-url="${escapeHTML(backupUrl)}">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-3 w-3 ${isFiveCols || isSixCols ? '' : 'mr-1'}" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
      </svg>
      ${isFiveCols || isSixCols ? '' : '<span class="copy-text">复制</span>'}
      <span class="copy-success hidden absolute -top-8 right-0 bg-orange-500 text-white text-xs px-2 py-1 rounded shadow-md">已复制!</span>
    </button>
  </div>
`;

// 在卡片HTML中添加 ${backupUrlHtml}

// 添加备用链接复制按钮的事件监听
const copyBtnBackup = card.querySelector('.copy-btn-backup');
if (copyBtnBackup) {
    copyBtnBackup.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const url = this.getAttribute('data-url');
        if (!url) return;
        
        navigator.clipboard.writeText(url).then(() => {
            showCopySuccess(this);
        }).catch(() => {
            const textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            document.body.appendChild(textarea);
            textarea.select();
            try { document.execCommand('copy'); showCopySuccess(this); } catch (e) {}
            document.body.removeChild(textarea);
        });
    });
}
```

#### 4.4 配置传递

在 functions/index.js 的 layoutConfigScript 中添加（约在第1250行）：

```javascript
const layoutConfigScript = `
  <script>
    window.IORI_LAYOUT_CONFIG = {
      hideDesc: ${layoutHideDesc},
      hideLinks: ${layoutHideLinks},
      hideCategory: ${layoutHideCategory},
      hideBackupUrl: ${layoutHideBackupUrl},
      gridCols: "${layoutGridCols}",
      cardStyle: "${layoutCardStyle}",
      enableFrostedGlass: ${layoutEnableFrostedGlass}
    };
  </script>
`;
```

## 使用说明

1. **GitHub 搜索**：在搜索框上方选择 GitHub，输入关键词后按回车
2. **站外搜索触发站内搜索**：使用任何站外搜索引擎时，会同时在当前页面过滤显示匹配的书签
3. **备用链接**：
   - 在后台管理中为站点添加备用链接
   - 在设置中可以控制是否显示备用链接
   - 备用链接支持点击跳转和复制功能
