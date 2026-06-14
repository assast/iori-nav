// DOM Elements
const configTableBody = document.getElementById('configTableBody');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const totalPagesSpan = document.getElementById('totalPages');

const pendingTableBody = document.getElementById('pendingTableBody');
const pendingPrevPageBtn = document.getElementById('pendingPrevPage');
const pendingNextPageBtn = document.getElementById('pendingNextPage');
const pendingCurrentPageSpan = document.getElementById('pendingCurrentPage');
const pendingTotalPagesSpan = document.getElementById('pendingTotalPages');

const messageDiv = document.getElementById('message');

function isModalVisible(modal) {
  if (!modal) return false;
  return modal.style.display === 'block' || modal.style.display === 'flex';
}

function syncBodyModalState() {
  const hasOpenModal = Array.from(document.querySelectorAll('.modal')).some(isModalVisible);
  document.body.classList.toggle('modal-open', hasOpenModal);
}

function focusFirstElement(modal) {
  if (!modal) return;
  const firstFocusable = modal.querySelector('input, select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])');
  firstFocusable?.focus();
}

window.openAdminModal = function(modal) {
  if (!modal) return;
  modal.style.display = 'block';
  document.body.classList.add('modal-open');
  requestAnimationFrame(() => focusFirstElement(modal));
};

window.closeAdminModal = function(modal) {
  if (!modal) return;
  modal.style.display = 'none';
  syncBodyModalState();
};

// Global Data
window.categoriesData = [];
window.categoriesTree = [];

// Global Utility Functions
window.showMessage = function(text, type = 'info', cacheCleared = false) {
  if (!messageDiv) return;
  messageDiv.innerText = text;
  messageDiv.style.display = 'block';
  
  if (type === 'success') {
    messageDiv.style.backgroundColor = '#d4edda';
    messageDiv.style.color = '#155724';
    messageDiv.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    messageDiv.style.backgroundColor = '#f8d7da';
    messageDiv.style.color = '#721c24';
    messageDiv.style.border = '1px solid #f5c6cb';
  } else {
    messageDiv.style.backgroundColor = '#d1ecf1';
    messageDiv.style.color = '#0c5460';
    messageDiv.style.border = '1px solid #bee5eb';
  }

  setTimeout(() => {
    messageDiv.style.display = 'none';
  }, 3000);
}

window.showModalMessage = function(modalId, text, type = 'info') {
  const messageBoxId = modalId.replace('Modal', 'Message');
  const messageBox = document.getElementById(messageBoxId);
  
  if (!messageBox) {
      console.warn('Message box not found for modal:', modalId);
      window.showMessage(text, type); // Fallback
      return;
  }

  messageBox.innerText = text;
  messageBox.style.visibility = 'visible';
  messageBox.style.display = 'block';
  messageBox.style.padding = '10px';
  messageBox.style.marginBottom = '15px';
  messageBox.style.borderRadius = '4px';
  messageBox.style.fontSize = '14px';

  if (type === 'success') {
    messageBox.style.backgroundColor = '#d4edda';
    messageBox.style.color = '#155724';
    messageBox.style.border = '1px solid #c3e6cb';
  } else if (type === 'error') {
    messageBox.style.backgroundColor = '#f8d7da';
    messageBox.style.color = '#721c24';
    messageBox.style.border = '1px solid #f5c6cb';
  } else {
    messageBox.style.backgroundColor = '#d1ecf1';
    messageBox.style.color = '#0c5460';
    messageBox.style.border = '1px solid #bee5eb';
  }

  setTimeout(() => {
    messageBox.style.visibility = 'hidden';
    messageBox.style.display = 'none';
  }, 3000);
}

window.escapeHTML = function (value) {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.normalizeUrl = function (value) {
  var trimmed = String(value || '').trim();
  if (!trimmed) return '';
  
  // Allow data URIs
  if (/^data:image\/[\w+.-]+;base64,/.test(trimmed)) {
      return trimmed;
  }
  
  // Allow relative paths (starting with /)
  if (trimmed.startsWith('/')) {
      return trimmed;
  }

  // Handle HTTP/HTTPS
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  } 
  
  // Handle domain-like strings without protocol
  if (/^[\w.-]+\.[\w.-]+/.test(trimmed)) {
    return 'https://' + trimmed;
  }
  
  return '';
};


// Pagination Logic
function updatePaginationButtons() {
  if (prevPageBtn) prevPageBtn.disabled = currentPage <= 1;
  if (nextPageBtn) nextPageBtn.disabled = currentPage >= Math.ceil(totalItems / pageSize);
}

function updatePendingPaginationButtons() {
  if (pendingPrevPageBtn) pendingPrevPageBtn.disabled = pendingCurrentPage <= 1;
  if (pendingNextPageBtn) pendingNextPageBtn.disabled = pendingCurrentPage >= Math.ceil(pendingTotalItems / pendingPageSize);
}

// Tab Switching
const tabButtons = document.querySelectorAll('.tab-button');
const tabContents = document.querySelectorAll('.tab-content');

tabButtons.forEach(button => {
  button.addEventListener('click', () => {
    const tab = button.dataset.tab;
    tabButtons.forEach(b => b.classList.remove('active'));
    button.classList.add('active');
    tabContents.forEach(content => {
      content.classList.remove('active');
      if (content.id === tab) {
        content.classList.add('active');
      }
    })
    if (tab === 'categories') {
        // Defined in admin-categories.js
        if (typeof fetchCategories === 'function') {
            fetchCategories();
        }
    } else if (tab === 'pending') {
      fetchPendingConfigs();
    }
  });
});

// Search & Filter
const searchInput = document.getElementById('searchInput');
const categoryFilter = document.getElementById('categoryFilter');
const pageSizeSelect = document.getElementById('pageSizeSelect');

let currentPage = 1;
let pageSize = 50; // Default to 50
let totalItems = 0;
window.allConfigs = [];
let currentSearchKeyword = '';
let currentCategoryFilter = '';

if (searchInput) {
  let debounceTimer;
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      currentSearchKeyword = e.target.value.trim();
      currentPage = 1;
      clearBookmarkSelection();
      fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
    }, 300);
  });
}

if (pageSizeSelect) {
  pageSizeSelect.value = pageSize;
  pageSizeSelect.addEventListener('change', () => {
    pageSize = parseInt(pageSizeSelect.value);
    currentPage = 1;
    clearBookmarkSelection();
    fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
  });
}

// Helper: Build Category Tree
window.buildCategoryTree = function(categories) {
    const map = new Map();
    const roots = [];
    
    categories.forEach(cat => {
        map.set(cat.id, { ...cat, children: [] });
    });
    
    categories.forEach(cat => {
        if (cat.parent_id && map.has(cat.parent_id)) {
            map.get(cat.parent_id).children.push(map.get(cat.id));
        } else {
            roots.push(map.get(cat.id));
        }
    });
    
    const sortFn = (a, b) => {
        const orderA = a.sort_order ?? 9999;
        const orderB = b.sort_order ?? 9999;
        return orderA - orderB || a.id - b.id;
    };
    
    const sortRecursive = (nodes) => {
        nodes.sort(sortFn);
        nodes.forEach(node => {
            if (node.children.length > 0) sortRecursive(node.children);
        });
    };
    
    sortRecursive(roots);
    return roots;
}

// Helper: Create Cascading Dropdown
window.createCascadingDropdown = function(containerId, inputId, categoriesTree, initialValue = null, excludeId = null) {
    const container = document.getElementById(containerId);
    const input = document.getElementById(inputId);
    if (!container || !input) return;
    
    const isFilter = inputId === 'categoryFilter';

    let initialLabel = '请选择分类';
    const findLabel = (nodes, id) => {
        for (const node of nodes) {
            if (String(node.id) === String(id)) return node.catelog;
            if (node.children) {
                const found = findLabel(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };
    
    if (initialValue && initialValue != '0') {
        if (isFilter) {
             initialLabel = initialValue;
             input.value = initialValue;
        } else {
            const label = findLabel(categoriesTree, initialValue);
            if (label) initialLabel = label;
            input.value = initialValue;
        }
    } else if (initialValue == '0' && !isFilter) {
        initialLabel = '无 (顶级分类)';
        input.value = '0';
    } else if (isFilter && !initialValue) {
        initialLabel = '所有分类';
        input.value = '';
    } else {
        input.value = '';
    }

    container.innerHTML = '';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-dropdown-trigger';
    trigger.textContent = initialLabel;
    container.appendChild(trigger);
    
    const menu = document.createElement('div');
    menu.className = 'custom-dropdown-menu';
    
    if (inputId.toLowerCase().includes('parent')) {
        const rootItem = document.createElement('div');
        rootItem.className = 'custom-dropdown-item';
        rootItem.innerHTML = '<span class="font-medium text-gray-900">无 (顶级分类)</span>';
        rootItem.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '0';
            trigger.textContent = '无 (顶级分类)';
            menu.classList.remove('show');
        });
        menu.appendChild(rootItem);
    }
    
    if (isFilter) {
        const rootItem = document.createElement('div');
        rootItem.className = 'custom-dropdown-item';
        rootItem.innerHTML = '<span class="font-medium text-gray-900">所有分类</span>';
        rootItem.addEventListener('click', (e) => {
            e.stopPropagation();
            input.value = '';
            trigger.textContent = '所有分类';
            menu.classList.remove('show');
            input.dispatchEvent(new Event('change'));
        });
        menu.appendChild(rootItem);
    }

    const renderItems = (nodes, depth = 0) => {
        nodes.forEach(node => {
            if (excludeId && node.id == excludeId) return; 
            
            const item = document.createElement('div');
            item.className = 'custom-dropdown-item';
            
            item.style.paddingLeft = `${15 + depth * 20}px`;
            
            let prefix = '';
            if (depth > 0) {
                prefix = '└─ ';
            }

            const textSpan = document.createElement('span');
            textSpan.textContent = prefix + node.catelog;
            item.appendChild(textSpan);
            
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                if (isFilter) {
                    input.value = node.id;
                } else {
                    input.value = node.id;
                }
                trigger.textContent = node.catelog;
                menu.classList.remove('show');
                input.dispatchEvent(new Event('change'));
            });
            
            menu.appendChild(item);
            
            if (node.children && node.children.length > 0) {
                renderItems(node.children, depth + 1);
            }
        });
    };
    
    renderItems(categoriesTree);
    container.appendChild(menu);
    
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.custom-dropdown-menu.show').forEach(m => {
            if (m !== menu) m.classList.remove('show');
        });
        menu.classList.toggle('show');
    });
    
    document.addEventListener('click', (e) => {
        if (!container.contains(e.target)) {
            menu.classList.remove('show');
        }
    });
}


// Load Global Categories
window.loadGlobalCategories = function() {
  fetch('/api/categories?pageSize=10000')
    .then(res => res.json())
    .then(data => {
      if (data.code === 200 && data.data) {
        window.categoriesData = data.data;
        window.categoriesTree = window.buildCategoryTree(window.categoriesData);
        
        if (categoryFilter) {
             window.createCascadingDropdown('categoryFilterWrapper', 'categoryFilter', window.categoriesTree);
        }
      }
    });
}
window.loadGlobalCategories();

if (categoryFilter) {
  categoryFilter.addEventListener('change', () => {
    currentCategoryFilter = categoryFilter.value;
    currentPage = 1;
    clearBookmarkSelection();
    fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
  });
}

// Fetch Configs (Bookmarks)
window.fetchConfigs = function(page = currentPage, keyword = currentSearchKeyword, catalogId = currentCategoryFilter) {
  // 显示加载状态
  if (configTableBody) {
      configTableBody.innerHTML = `
        <tr><td colspan="11" class="text-center py-20">
            <div class="flex flex-col items-center justify-center">
                <div class="w-10 h-10 border-4 border-gray-200 border-t-primary-500 rounded-full animate-spin mb-4"></div>
                <p class="text-gray-500 text-sm">正在加载书签数据...</p>
            </div>
        </td></tr>
      `;
  }

  const params = new URLSearchParams();
  params.append('page', page);
  params.append('pageSize', pageSize);

  if (keyword) {
    params.append('keyword', keyword);
  }

  if (catalogId) {
    params.append('catalogId', catalogId);
  }

  const url = `/api/config?${params.toString()}`;

  fetch(url)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        totalItems = data.total;
        currentPage = data.page;
        totalPagesSpan.innerText = Math.ceil(totalItems / pageSize);
        currentPageSpan.innerText = currentPage;
        window.allConfigs = data.data;
        pruneBookmarkSelectionToConfigs(window.allConfigs);
        renderConfig(window.allConfigs);
        updatePaginationButtons();
      } else {
        window.showMessage(data.message, 'error');
        // 错误时清空或显示错误信息
        if (configTableBody) configTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-red-500 py-10">${data.message}</td></tr>`;
      }
    }).catch(err => {
      window.showMessage('网络错误', 'error');
      if (configTableBody) configTableBody.innerHTML = `<tr><td colspan="11" class="text-center text-red-500 py-10">网络错误: ${err.message}</td></tr>`;
    })
}

let pendingCurrentPage = 1;
let pendingPageSize = 10;
let pendingTotalItems = 0;
let allPendingConfigs = [];

// Pagination Event Listeners
if (prevPageBtn) {
  prevPageBtn.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      clearBookmarkSelection();
      fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
    }
  });
}

if (nextPageBtn) {
  nextPageBtn.addEventListener('click', () => {
    if (currentPage < Math.ceil(totalItems / pageSize)) {
      currentPage++;
      clearBookmarkSelection();
      fetchConfigs(currentPage, currentSearchKeyword, currentCategoryFilter);
    }
  });
}

if (pendingPrevPageBtn) {
  pendingPrevPageBtn.addEventListener('click', () => {
    if (pendingCurrentPage > 1) {
      pendingCurrentPage--;
      fetchPendingConfigs(pendingCurrentPage);
    }
  });
}

if (pendingNextPageBtn) {
  pendingNextPageBtn.addEventListener('click', () => {
    if (pendingCurrentPage < Math.ceil(pendingTotalItems / pendingPageSize)) {
      pendingCurrentPage++;
      fetchPendingConfigs(pendingCurrentPage);
    }
  });
}

// Pending Configs (Audit)
function fetchPendingConfigs(page = pendingCurrentPage) {
  if (!pendingTableBody) return;
  pendingTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-10">加载中...</td></tr>';
  fetch(`/api/pending?page=${page}&pageSize=${pendingPageSize}`)
    .then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        pendingTotalItems = data.total;
        pendingCurrentPage = data.page;
        pendingTotalPagesSpan.innerText = Math.ceil(pendingTotalItems / pendingPageSize);
        pendingCurrentPageSpan.innerText = pendingCurrentPage;
        allPendingConfigs = data.data;
        renderPendingConfigs(allPendingConfigs);
        updatePendingPaginationButtons();
      } else {
        window.showMessage(data.message, 'error');
      }
    }).catch(err => {
      window.showMessage('网络错误', 'error');
    });
}

function renderPendingConfigs(configs) {
  if (!pendingTableBody) return;
  pendingTableBody.innerHTML = '';
  if (configs.length === 0) {
    pendingTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-10">暂无待审核数据</td></tr>';
    return;
  }
  configs.forEach(config => {
    const rawUrl = String(config.url || '');
    const rawDesc = String(config.desc || '');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="p-3 border-b">${config.id}</td>
      <td class="p-3 border-b">${window.escapeHTML(config.name)}</td>
      <td class="p-3 border-b truncate max-w-[200px]" title="${window.escapeHTML(rawUrl)}">${window.escapeHTML(rawUrl)}</td>
      <td class="p-3 border-b">${config.logo ? `<img src="${window.escapeHTML(window.normalizeUrl(config.logo))}" class="w-8 h-8 rounded">` : '无'}</td>
      <td class="p-3 border-b max-w-[200px] truncate" title="${window.escapeHTML(rawDesc)}">${window.escapeHTML(rawDesc)}</td>
      <td class="p-3 border-b">${window.escapeHTML(config.catelog)}</td>
      <td class="p-3 border-b">
        <div class="flex gap-2">
          <button class="approve-btn bg-green-100 text-green-600 hover:bg-green-200 px-2 py-1 rounded text-xs" data-id="${config.id}">通过</button>
          <button class="reject-btn bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs" data-id="${config.id}">拒绝</button>
        </div>
      </td>
    `;
    pendingTableBody.appendChild(tr);
  });
  bindPendingActionEvents();
}

function bindPendingActionEvents() {
  document.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      handlePendingAction(this.dataset.id, 'approve');
    });
  });
  document.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      handlePendingAction(this.dataset.id, 'reject');
    });
  });
}

function handlePendingAction(id, action) {
  const method = action === 'approve' ? 'PUT' : 'DELETE';
  const url = `/api/pending/${id}`;
  
  fetch(url, { method: method })
    .then(res => res.json())
    .then(data => {
      if (data.code === 200 || data.code === 201) {
        window.showMessage(action === 'approve' ? '审批通过' : '已拒绝', 'success');
        fetchPendingConfigs();
        if (action === 'approve') fetchConfigs();
      } else {
        window.showMessage(data.message, 'error');
      }
    }).catch(() => window.showMessage('操作失败', 'error'));
}

// Render Bookmarks List (Table Mode)
function renderConfig(configs) {
  if (!configTableBody) return;
  configTableBody.innerHTML = '';
  if (configs.length === 0) {
    configTableBody.innerHTML = '<tr><td colspan="11" class="text-center text-gray-500 py-10">没有配置数据</td></tr>';
    updateSelectAllMainState();
    updateBatchActionsBar();
    return;
  }
  configs.forEach(config => {
    const tr = document.createElement('tr');
    const rawName = String(config.name || '');
    const safeName = window.escapeHTML(rawName || '未命名');
    const normalizedUrl = window.normalizeUrl(config.url);
    const displayUrl = config.url ? window.escapeHTML(config.url) : '未提供';
    const normalizedLogo = window.normalizeUrl(config.logo);
    const descCell = config.desc ? window.escapeHTML(config.desc) : '暂无描述';
    const safeCatalog = window.escapeHTML(config.catelog_name || '未分类');
    const cardInitial = (rawName.trim().charAt(0) || '站').toUpperCase();
    const sortOrder = config.sort_order ?? '';
    const isChecked = window.selectedBookmarkIds?.has(config.id) ? 'checked' : '';

    // Private badge
    const privacyBadge = config.is_private
      ? '<span class="privacy-tag privacy-private">私密</span>'
      : '<span class="privacy-tag privacy-public">公开</span>';

    let logoHtml = '';
    if (normalizedLogo) {
      logoHtml = `<img src="${window.escapeHTML(normalizedLogo)}" alt="${safeName}" class="w-8 h-8 rounded object-cover bg-gray-50">`;
    } else {
      logoHtml = `<div class="w-8 h-8 rounded bg-primary-100 text-primary-600 flex items-center justify-center font-bold text-xs">${cardInitial}</div>`;
    }

    const urlLink = normalizedUrl
      ? `<a href="${window.escapeHTML(normalizedUrl)}" target="_blank" rel="noopener noreferrer" class="text-blue-600 hover:underline truncate max-w-[200px] inline-block" title="${displayUrl}">${displayUrl}</a>`
      : `<span class="text-gray-400">未提供</span>`;

    tr.innerHTML = `
      <td class="p-3 border-b text-center">
        <input type="checkbox" class="bookmark-checkbox rounded" data-id="${config.id}" ${isChecked}>
      </td>
      <td class="p-3 border-b text-gray-500">${config.id}</td>
      <td class="p-3 border-b">${logoHtml}</td>
      <td class="p-3 border-b font-medium text-gray-900" title="${safeName}">${safeName}</td>
      <td class="p-3 border-b">${urlLink}</td>
      <td class="p-3 border-b text-gray-600 max-w-[200px] truncate" title="${descCell}">${descCell}</td>
      <td class="p-3 border-b text-gray-600">${safeCatalog}</td>
      <td class="p-3 border-b">${privacyBadge}</td>
      <td class="p-3 border-b">
        <input type="number" class="sort-input" value="${sortOrder}" data-id="${config.id}" min="0" step="1" title="修改后按回车保存">
      </td>
      <td class="p-3 border-b text-gray-600 text-center">${config.clicks || 0}</td>
      <td class="p-3 border-b">
        <div class="flex gap-2 flex-wrap">
          <button class="edit-btn bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded text-xs" data-id="${config.id}">编辑</button>
          <button class="del-btn bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs" data-id="${config.id}">删除</button>
        </div>
      </td>
    `;
    configTableBody.appendChild(tr);
  });
  bindActionEvents();
  bindSortInputEvents();
  bindBatchCheckboxEvents();
  updateBatchActionsBar();
}

function bindActionEvents() {
  document.querySelectorAll('.edit-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      window.handleEdit(this.dataset.id);
    })
  });

  document.querySelectorAll('.del-btn').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      const id = this.dataset.id;
      window.handleDelete(id)
    })
  })
}

// Global Edit/Delete Functions used by admin-bookmarks.js or local bindings
window.handleEdit = function(id) {
  const config = window.allConfigs.find(c => c.id == id);
  if (!config) {
    window.showMessage('找不到书签数据', 'error');
    return;
  }
  
  document.getElementById('editBookmarkId').value = config.id;
  document.getElementById('editBookmarkName').value = config.name;
  document.getElementById('editBookmarkUrl').value = config.url;
  document.getElementById('editBookmarkLogo').value = config.logo;
  document.getElementById('editBookmarkDesc').value = config.desc;
  document.getElementById('editBookmarkSortOrder').value = config.sort_order;
  document.getElementById('editBookmarkIsPrivate').checked = !!config.is_private;
  const clicksInput = document.getElementById('editBookmarkClicks');
  if (clicksInput) clicksInput.value = config.clicks || 0;
  
  // Create dropdown using window.categoriesTree
  window.createCascadingDropdown('editBookmarkCatelogWrapper', 'editBookmarkCatelog', window.categoriesTree, config.catelog_id);
  
  const editModal = document.getElementById('editBookmarkModal');
  if (editModal) {
      window.openAdminModal(editModal);
  }
}

// Delete Logic Variables for sharing
window.deleteTargetId = null; 

window.handleDelete = function(id) {
  window.deleteTargetId = id;
  const deleteConfirmModal = document.getElementById('deleteConfirmModal');
  if (deleteConfirmModal) {
      window.openAdminModal(deleteConfirmModal);
  } else if (confirm('确定删除该书签吗？')) {
      window.performDelete(id);
  }
}

window.performDelete = function(id) {
  fetch(`/api/config/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  }).then(res => res.json())
    .then(data => {
      if (data.code === 200) {
        window.showMessage('删除成功', 'success', data.cacheCleared);
        fetchConfigs();
      } else {
        window.showMessage(data.message || '删除失败', 'error');
      }
    }).catch(err => {
      window.showMessage('网络错误', 'error');
    });
}

function bindSortInputEvents() {
  document.querySelectorAll('#configTableBody .sort-input').forEach(input => {
    input.addEventListener('change', async function () {
      const id = this.dataset.id;
      const newSortOrder = Number(this.value);
      if (isNaN(newSortOrder)) {
        window.showMessage('排序值必须是数字', 'error');
        return;
      }

      const config = window.allConfigs.find(c => c.id == id);
      if (config && config.sort_order === newSortOrder) return;

      try {
        const res = await fetch(`/api/config/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: newSortOrder })
        });
        const data = await res.json();
        if (data.code === 200) {
          window.showMessage('排序已保存', 'success');
          if (config) config.sort_order = newSortOrder;
        } else {
          window.showMessage(data.message || '保存排序失败', 'error');
        }
      } catch (err) {
        window.showMessage('保存排序失败: ' + err.message, 'error');
      }
    });
  });
}

// ===================================
// 批量操作功能 (Batch Operations)
// ===================================
window.selectedBookmarkIds = new Set();

function updateSelectAllMainState() {
  const selectAllMain = document.getElementById('selectAllMain');
  if (!selectAllMain) return;

  const checkboxes = Array.from(document.querySelectorAll('.bookmark-checkbox'));
  const checkedCount = checkboxes.filter(cb => cb.checked).length;

  selectAllMain.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
  selectAllMain.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
}

function clearBookmarkSelection() {
  if (window.selectedBookmarkIds) {
    window.selectedBookmarkIds.clear();
  }
  document.querySelectorAll('.bookmark-checkbox').forEach(cb => cb.checked = false);
  updateSelectAllMainState();
  updateBatchActionsBar();
}
window.clearBookmarkSelection = clearBookmarkSelection;

function pruneBookmarkSelectionToConfigs(configs) {
  if (!window.selectedBookmarkIds) return;

  const visibleIds = new Set((configs || []).map(config => String(config.id)));
  window.selectedBookmarkIds.forEach(id => {
    if (!visibleIds.has(String(id))) {
      window.selectedBookmarkIds.delete(id);
    }
  });
}

function bindBatchCheckboxEvents() {
  // 行内复选框
  document.querySelectorAll('.bookmark-checkbox').forEach(cb => {
    cb.addEventListener('change', (e) => {
      const id = parseInt(e.target.dataset.id);
      if (e.target.checked) {
        window.selectedBookmarkIds.add(id);
      } else {
        window.selectedBookmarkIds.delete(id);
      }
      updateSelectAllMainState();
      updateBatchActionsBar();
    });
  });
}

function updateBatchActionsBar() {
  const bar = document.getElementById('batchActionsBar');
  const countSpan = document.getElementById('batchSelectedCountMain');
  const count = window.selectedBookmarkIds.size;

  if (countSpan) countSpan.textContent = count;
  if (bar) {
    bar.classList.toggle('hidden', count === 0);
  }
  updateSelectAllMainState();
}
window.updateBatchActionsBar = updateBatchActionsBar;

// 全选/取消全选
const selectAllMain = document.getElementById('selectAllMain');
if (selectAllMain) {
  selectAllMain.addEventListener('change', (e) => {
    const checked = e.target.checked;
    document.querySelectorAll('.bookmark-checkbox').forEach(cb => {
      cb.checked = checked;
      const id = parseInt(cb.dataset.id);
      if (checked) {
        window.selectedBookmarkIds.add(id);
      } else {
        window.selectedBookmarkIds.delete(id);
      }
    });
    updateSelectAllMainState();
    updateBatchActionsBar();
  });
}

// 取消选择
const batchClearSelectionBtn = document.getElementById('batchClearSelectionBtn');
if (batchClearSelectionBtn) {
  batchClearSelectionBtn.addEventListener('click', () => {
    clearBookmarkSelection();
  });
}

// 批量删除按钮
const batchDeleteBtnMain = document.getElementById('batchDeleteBtnMain');
if (batchDeleteBtnMain) {
  batchDeleteBtnMain.addEventListener('click', () => {
    const count = window.selectedBookmarkIds.size;
    if (count === 0) return;
    const batchDeleteConfirmModal = document.getElementById('batchDeleteConfirmModal');
    const batchDeleteConfirmText = document.getElementById('batchDeleteConfirmText');
    if (batchDeleteConfirmText) {
      batchDeleteConfirmText.textContent = `确定要删除选中的 ${count} 条书签吗？`;
    }
    if (batchDeleteConfirmModal) {
      window.openAdminModal(batchDeleteConfirmModal);
    }
  });
}

// 批量更改分类按钮
const batchChangeCategoryBtnMain = document.getElementById('batchChangeCategoryBtnMain');
if (batchChangeCategoryBtnMain) {
  batchChangeCategoryBtnMain.addEventListener('click', () => {
    if (window.selectedBookmarkIds.size === 0) return;
    if (typeof window.createCascadingDropdown === 'function') {
      window.createCascadingDropdown('batchTargetCategoryWrapper', 'batchTargetCategory', window.categoriesTree);
    }
    const batchCategoryModal = document.getElementById('batchCategoryModal');
    if (batchCategoryModal) window.openAdminModal(batchCategoryModal);
  });
}

// 批量更改隐私按钮
const batchChangePrivacyBtnMain = document.getElementById('batchChangePrivacyBtnMain');
if (batchChangePrivacyBtnMain) {
  batchChangePrivacyBtnMain.addEventListener('click', () => {
    if (window.selectedBookmarkIds.size === 0) return;
    const batchPrivacyModal = document.getElementById('batchPrivacyModal');
    if (batchPrivacyModal) window.openAdminModal(batchPrivacyModal);
  });
}

// Init Data
fetchConfigs();

// Check public config to show/hide pending tab
fetch('/api/public-config')
    .then(res => res.json())
    .then(data => {
        if (data && !data.submissionEnabled) {
            const pendingTabBtn = document.querySelector('.tab-button[data-tab="pending"]');
            if (pendingTabBtn) {
                pendingTabBtn.style.display = 'none';
            }
        }
    })
    .catch(err => console.error('Failed to fetch public config:', err));


// ==========================================
// 私密分类与书签联动逻辑
// ==========================================

function setupBookmarkPrivacyLinkage(selectId, checkboxId) {
    const select = document.getElementById(selectId);
    const checkbox = document.getElementById(checkboxId);
    
    if (!select || !checkbox) return;
    
    const updatePrivacy = () => {
        const catId = select.value;
        const category = window.categoriesData.find(c => c.id == catId);
        
        const container = checkbox.closest('.form-group');
        let hint = container.querySelector('.privacy-hint');
        
        if (category && category.is_private) {
            // 如果用户没有手动修改过，则默认跟随分类
            if (!checkbox.hasAttribute('data-user-touched')) {
                checkbox.checked = true;
            }
            checkbox.disabled = false; // 不再强制禁用
            
            if (!hint) {
                hint = document.createElement('span');
                hint.className = 'privacy-hint text-xs text-amber-600 ml-2 font-normal';
                const label = container.querySelector('label:first-child');
                if (label) label.appendChild(hint);
            }
            
            // 动态提示
            if (!checkbox.checked) {
                 hint.innerText = '(注意: 保存后所属分类也将变为公开)';
            } else {
                 hint.innerText = '(建议: 所属分类为私密)';
            }
        } else {
            checkbox.disabled = false;
            if (hint) hint.remove();
        }
    };
    
    select.addEventListener('change', updatePrivacy);
    
    // 监听复选框变化，标记用户已操作
    checkbox.addEventListener('change', () => {
        checkbox.setAttribute('data-user-touched', 'true');
        updatePrivacy();
    });
    
    // Attach to element for external call
    select.updatePrivacyState = updatePrivacy;
}

// 初始化监听器
document.addEventListener('DOMContentLoaded', () => {
   setupBookmarkPrivacyLinkage('addBookmarkCatelog', 'addBookmarkIsPrivate');
   setupBookmarkPrivacyLinkage('editBookmarkCatelog', 'editBookmarkIsPrivate');

   // Delete Bookmark Modal Events
   const deleteConfirmModal = document.getElementById('deleteConfirmModal');
   const closeDeleteConfirmModal = document.getElementById('closeDeleteConfirmModal');
   const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
   const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');

   if (deleteConfirmModal) {
       if (closeDeleteConfirmModal) {
           closeDeleteConfirmModal.onclick = () => {
               window.closeAdminModal(deleteConfirmModal);
           };
       }
       if (cancelDeleteBtn) {
           cancelDeleteBtn.onclick = () => {
               window.closeAdminModal(deleteConfirmModal);
           };
       }
       if (confirmDeleteBtn) {
           confirmDeleteBtn.onclick = () => {
               if (window.deleteTargetId) {
                   window.performDelete(window.deleteTargetId);
                   window.closeAdminModal(deleteConfirmModal);
               }
           };
       }
       // Click outside to close
       deleteConfirmModal.onclick = (e) => {
           if (e.target === deleteConfirmModal) {
               window.closeAdminModal(deleteConfirmModal);
           }
       };
   }
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  const visibleModals = Array.from(document.querySelectorAll('.modal')).filter(isModalVisible);
  if (visibleModals.length === 0) return;

  const topmostModal = visibleModals.sort((a, b) => {
    const aIndex = Number(window.getComputedStyle(a).zIndex || 0);
    const bIndex = Number(window.getComputedStyle(b).zIndex || 0);
    return aIndex - bIndex;
  }).pop();

  if (topmostModal) {
    window.closeAdminModal(topmostModal);
  }
});

// 监听新增按钮点击
const addBookmarkBtnRef = document.getElementById('addBookmarkBtn');
if (addBookmarkBtnRef) {
    addBookmarkBtnRef.addEventListener('click', () => {
        // ... (existing logic) ...
        document.body.classList.add('modal-open');
        // ...
    });
}
if (addBookmarkBtnRef) {
    addBookmarkBtnRef.addEventListener('click', () => {
        setTimeout(() => {
             const select = document.getElementById('addBookmarkCatelog');
             // 重置状态
             const checkbox = document.getElementById('addBookmarkIsPrivate');
             if(checkbox) checkbox.removeAttribute('data-user-touched');
             
             if (select && select.updatePrivacyState) select.updatePrivacyState();
        }, 100);
    });
}
