/**
 * admin-categories.js
 * 分类管理功能：列表展示、增删改查、排序
 */

// DOM Elements
const categoryTableBody = document.getElementById('categoryTableBody');
const categoryPrevPageBtn = document.getElementById('categoryPrevPage');
const categoryNextPageBtn = document.getElementById('categoryNextPage');
const categoryCurrentPageSpan = document.getElementById('categoryCurrentPage');
const categoryTotalPagesSpan = document.getElementById('categoryTotalPages');
const categoryPageSizeSelect = document.getElementById('categoryPageSizeSelect');
const addCategoryBtn = document.getElementById('addCategoryBtn');
const categoryExpandAllBtn = document.getElementById('categoryExpandAllBtn');
const categoryCollapseAllBtn = document.getElementById('categoryCollapseAllBtn');

// State
let categoryCurrentPage = 1;
let categoryPageSize = 10000; // Default show all for tree view structure
let categoryTotalItems = 0;
let currentViewParentId = null;
let expandedCategoryIds = new Set();

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initCategoryEvents();
    // 初始加载由 tab 切换或 admin.js 触发
});

function initCategoryEvents() {
    // Page Size
    if (categoryPageSizeSelect) {
        categoryPageSizeSelect.value = categoryPageSize;
        categoryPageSizeSelect.addEventListener('change', () => {
            categoryPageSize = parseInt(categoryPageSizeSelect.value);
            categoryCurrentPage = 1;
            fetchCategories(categoryCurrentPage);
        });
    }

    // Pagination
    if (categoryPrevPageBtn) {
        categoryPrevPageBtn.addEventListener('click', () => {
            if (categoryCurrentPage > 1) {
                categoryCurrentPage--;
                fetchCategories(categoryCurrentPage);
            }
        });
    }

    if (categoryNextPageBtn) {
        categoryNextPageBtn.addEventListener('click', () => {
            if (categoryCurrentPage < Math.ceil(categoryTotalItems / categoryPageSize)) {
                categoryCurrentPage++;
                fetchCategories(categoryCurrentPage);
            }
        });
    }

    if (categoryExpandAllBtn) {
        categoryExpandAllBtn.addEventListener('click', () => {
            expandAllCategories();
        });
    }

    if (categoryCollapseAllBtn) {
        categoryCollapseAllBtn.addEventListener('click', () => {
            collapseAllCategories();
        });
    }

    // Add Category Button
    if (addCategoryBtn) {
        addCategoryBtn.addEventListener('click', () => {
            // Populate dropdown with current tree
            // Ensure createCascadingDropdown is available (from admin.js)
            if (typeof window.createCascadingDropdown === 'function') {
                window.createCascadingDropdown('newCategoryParentWrapper', 'newCategoryParent', window.categoriesTree, '0');
            }
            const modal = document.getElementById('addCategoryModal');
            if (modal) {
                modal.style.display = 'block';
                document.body.classList.add('modal-open');
            }
        });
    }
}

// Global function to be called by Tab switching in admin.js
window.fetchCategories = function(page = categoryCurrentPage) {
    if (!categoryTableBody) return;
    
    categoryTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-10">加载中...</td></tr>';
    
    fetch(`/api/categories?page=${page}&pageSize=${categoryPageSize}`)
        .then(res => res.json())
        .then(data => {
            if (data.code === 200) {
                categoryTotalItems = data.total;
                categoryCurrentPage = data.page;
                
                if (categoryTotalPagesSpan) categoryTotalPagesSpan.innerText = Math.ceil(categoryTotalItems / categoryPageSize);
                if (categoryCurrentPageSpan) categoryCurrentPageSpan.innerText = categoryCurrentPage;
                
                // Update global data (defined in admin.js)
                window.categoriesData = data.data || [];
                
                // Rebuild Tree
                if (typeof window.buildCategoryTree === 'function') {
                    window.categoriesTree = window.buildCategoryTree(window.categoriesData);
                }
                
                renderCategoryView(currentViewParentId);
                updateCategoryPaginationButtons();
                
                // Also refresh dropdowns if they exist in other tabs (optional but good consistency)
                // We might need a global event or callback for this.
            } else {
                window.showMessage(data.message || '加载分类失败', 'error');
                categoryTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-red-500">加载失败</td></tr>';
            }
        }).catch((err) => {
            console.error('Fetch Categories Error:', err);
            window.showMessage('网络错误: ' + err.message, 'error');
            categoryTableBody.innerHTML = '<tr><td colspan="7" class="text-center py-10 text-red-500">加载失败</td></tr>';
        });
};

function updateCategoryPaginationButtons() {
    if (categoryPrevPageBtn) categoryPrevPageBtn.disabled = categoryCurrentPage <= 1;
    if (categoryNextPageBtn) categoryNextPageBtn.disabled = categoryCurrentPage >= Math.ceil(categoryTotalItems / categoryPageSize);
}

function collectExpandableCategoryIds(categories, ids = []) {
    categories.forEach(item => {
        if (item.children && item.children.length > 0) {
            ids.push(String(item.id));
            collectExpandableCategoryIds(item.children, ids);
        }
    });
    return ids;
}

function expandAllCategories() {
    expandedCategoryIds = new Set(collectExpandableCategoryIds(window.categoriesTree || []));
    renderCategoryView(null);
}

function collapseAllCategories() {
    expandedCategoryIds.clear();
    renderCategoryView(null);
}

function renderCategoryView(parentId) {
    if (parentId && parentId != '0') {
        expandedCategoryIds.add(String(parentId));
    }
    currentViewParentId = null;
    updateCategoryBreadcrumb(null);
    renderCategoryTable(window.categoriesTree || []);
}

function updateCategoryBreadcrumb(parentId) {
    const backBtn = document.getElementById('categoryBackBtn');
    const breadcrumb = document.getElementById('categoryBreadcrumb');
    
    if(!parentId || parentId == '0') {
        if(backBtn) backBtn.classList.add('hidden');
        if(breadcrumb) breadcrumb.textContent = '顶级分类';
    } else {
        if(backBtn) backBtn.classList.remove('hidden');
        const cat = window.categoriesData.find(c => c.id == parentId);
        if(breadcrumb) breadcrumb.textContent = cat ? cat.catelog : '未知分类';
        
        if (backBtn) {
            backBtn.onclick = () => {
                 const currentCat = window.categoriesData.find(c => c.id == parentId);
                 if(currentCat && currentCat.parent_id && currentCat.parent_id != '0') {
                     renderCategoryView(currentCat.parent_id);
                 } else {
                     renderCategoryView(null);
                 }
            };
        }
    }
}

function renderCategoryTable(categories) {
    if (!categoryTableBody) return;
    categoryTableBody.innerHTML = '';
    if (!categories || categories.length === 0) {
        categoryTableBody.innerHTML = '<tr><td colspan="7" class="text-center text-gray-500 py-10">没有分类数据</td></tr>';
        return;
    }

    const renderRows = (nodes, depth = 0) => {
        nodes.forEach(item => {
            const tr = document.createElement('tr');
            const safeName = window.escapeHTML(item.catelog);
            const siteCount = item.site_count || 0;
            const sortValue = item.sort_order === null || item.sort_order === 9999 ? '' : item.sort_order;
            const subCount = item.children ? item.children.length : 0;
            const hasChildren = subCount > 0;
            const isExpanded = expandedCategoryIds.has(String(item.id));
            const expandLabel = isExpanded ? '收起' : '展开';
            const expandIcon = isExpanded ? '▾' : '▸';
            const childButton = hasChildren
                ? `<button class="category-subs-btn bg-indigo-100 text-indigo-600 hover:bg-indigo-200 px-2 py-1 rounded text-xs" data-category-id="${item.id}" aria-expanded="${isExpanded}">${expandIcon} ${expandLabel}</button>`
                : '<button class="category-subs-btn bg-gray-100 text-gray-400 px-2 py-1 rounded text-xs" disabled>无子分类</button>';

            const privacyBadge = item.is_private
                ? '<span class="privacy-tag privacy-private">私密</span>'
                : '<span class="privacy-tag privacy-public">公开</span>';

            tr.className = depth > 0 ? 'category-child-row' : '';
            tr.innerHTML = `
                <td class="p-3 border-b text-gray-500">${item.id}</td>
                <td class="p-3 border-b font-medium text-gray-900">
                    <span class="category-name-cell" style="padding-left: ${depth * 1.5}rem">${safeName}</span>
                </td>
                <td class="p-3 border-b text-gray-600">${siteCount}</td>
                <td class="p-3 border-b text-gray-600">${subCount}</td>
                <td class="p-3 border-b">${privacyBadge}</td>
                <td class="p-3 border-b">
                    <input type="number" class="sort-input" value="${sortValue}" data-id="${item.id}" min="0" step="1" title="修改后按回车保存">
                </td>
                <td class="p-3 border-b">
                    <div class="flex gap-2 flex-wrap">
                        ${childButton}
                        <button class="category-edit-btn bg-blue-100 text-blue-600 hover:bg-blue-200 px-2 py-1 rounded text-xs" data-category-id="${item.id}">编辑</button>
                        <button class="category-del-btn bg-red-100 text-red-600 hover:bg-red-200 px-2 py-1 rounded text-xs" data-category-id="${item.id}" data-site-count="${siteCount}" data-sub-count="${subCount}">删除</button>
                    </div>
                </td>
            `;
            categoryTableBody.appendChild(tr);

            if (hasChildren && isExpanded) {
                renderRows(item.children, depth + 1);
            }
        });
    };

    renderRows(categories);

    bindCategoryEvents();
    bindCategorySortInputEvents();
}

function bindCategoryEvents() {
    document.querySelectorAll('.category-edit-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const categoryId = this.getAttribute('data-category-id');
            const category = window.categoriesData.find(c => c.id == categoryId);
            if (category) {
                document.getElementById('editCategoryId').value = category.id;
                document.getElementById('editCategoryName').value = category.catelog;
                const sortOrder = category.sort_order;
                document.getElementById('editCategorySortOrder').value = (sortOrder === null || sortOrder === 9999) ? '' : sortOrder;
                document.getElementById('editCategoryIsPrivate').checked = !!category.is_private;
                
                if (typeof window.createCascadingDropdown === 'function') {
                    window.createCascadingDropdown('editCategoryParentWrapper', 'editCategoryParent', window.categoriesTree, category.parent_id || '0', category.id);
                }

                document.getElementById('editCategoryModal').style.display = 'block';
                document.body.classList.add('modal-open');
            } else {
                window.showMessage('找不到分类数据', 'error');
            }
        });
    });

    document.querySelectorAll('.category-del-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const category_id = this.getAttribute('data-category-id');
            const siteCount = parseInt(this.getAttribute('data-site-count') || '0');
            const subCount = parseInt(this.getAttribute('data-sub-count') || '0');
            
            if (siteCount > 0) {
                window.showMessage(`无法删除：该分类包含 ${siteCount} 个书签`, 'error');
                return;
            }
            if (subCount > 0) {
                window.showMessage(`无法删除：该分类包含 ${subCount} 个子分类`, 'error');
                return;
            }
            
            if (!category_id) return;
            
            // 使用自定义模态框而不是原生 confirm
            const deleteModal = document.getElementById('deleteCategoryConfirmModal');
            if (deleteModal) {
                // 解绑旧事件（如果有）
                const confirmBtn = document.getElementById('confirmDeleteCategoryBtn');
                const cancelBtn = document.getElementById('cancelDeleteCategoryBtn');
                const closeBtn = document.getElementById('closeDeleteCategoryConfirmModal');
                
                // 使用 cloneNode 快速清除所有 event listeners
                const newConfirmBtn = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                
                newConfirmBtn.addEventListener('click', () => {
                     deleteCategory(category_id);
                     deleteModal.style.display = 'none';
                });
                
                const closeModal = () => {
                     deleteModal.style.display = 'none';
                     document.body.classList.remove('modal-open');
                }
                cancelBtn.onclick = closeModal;
                closeBtn.onclick = closeModal;
                
                deleteModal.style.display = 'block';
                document.body.classList.add('modal-open');
            } else if (confirm('确定删除该分类吗？')) {
                deleteCategory(category_id);
            }
        });
    });
  
    document.querySelectorAll('.category-subs-btn').forEach(btn => {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            const categoryId = this.getAttribute('data-category-id');
            const key = String(categoryId);
            if (expandedCategoryIds.has(key)) {
                expandedCategoryIds.delete(key);
            } else {
                expandedCategoryIds.add(key);
            }
            renderCategoryView(null);
        });
    });
}

function deleteCategory(id) {
    fetch('/api/categories/' + encodeURIComponent(id), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reset: true }) // Logical delete or reset
    }).then(res => res.json()).then(data => {
        if (data.code === 200) {
            window.showMessage('删除成功', 'success');
            // Refresh categories and also bookmarks configs because dropdowns/counts might change
            fetchCategories();
            if (typeof fetchConfigs === 'function') fetchConfigs();
            if (typeof window.loadGlobalCategories === 'function') window.loadGlobalCategories();
        } else {
            window.showMessage(data.message || '删除失败', 'error');
        }
    });
}

function bindCategorySortInputEvents() {
    document.querySelectorAll('#categoryTableBody .sort-input').forEach(input => {
        input.addEventListener('change', async function () {
            const id = this.dataset.id;
            const newSortOrder = Number(this.value);
            if (isNaN(newSortOrder)) {
                window.showMessage('排序值必须是数字', 'error');
                return;
            }

            const category = window.categoriesData.find(c => c.id == id);
            if (category && category.sort_order === newSortOrder) return;

            try {
                const res = await fetch('/api/categories/reorder', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ items: [{ id, sort_order: newSortOrder }] })
                });
                const data = await res.json();
                if (data.code === 200) {
                    window.showMessage('排序已保存', 'success');
                    if (category) category.sort_order = newSortOrder;
                    fetchCategories(categoryCurrentPage);
                } else {
                    window.showMessage(data.message || '保存排序失败', 'error');
                }
            } catch (err) {
                window.showMessage('保存排序失败: ' + err.message, 'error');
            }
        });
    });
}


// ========== 编辑分类功能 ==========
const editCategoryModal = document.getElementById('editCategoryModal');
const closeEditCategoryModal = document.getElementById('closeEditCategoryModal');
const editCategoryForm = document.getElementById('editCategoryForm');

const cancelEditCategoryBtn = document.getElementById('cancelEditCategoryBtn');
if (cancelEditCategoryBtn) {
  cancelEditCategoryBtn.addEventListener('click', () => {
    editCategoryModal.style.display = 'none';
    document.body.classList.remove('modal-open');
  });
}

if (closeEditCategoryModal) {
    closeEditCategoryModal.addEventListener('click', () => {
        editCategoryModal.style.display = 'none';
        document.body.classList.remove('modal-open');
    });
}

if (editCategoryForm) {
    editCategoryForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const id = document.getElementById('editCategoryId').value;
        const categoryName = document.getElementById('editCategoryName').value.trim();
        const sortOrder = document.getElementById('editCategorySortOrder').value.trim();
        const parentId = document.getElementById('editCategoryParent').value;
        const isPrivate = document.getElementById('editCategoryIsPrivate').checked;

        if (!categoryName) {
            window.showMessage('分类名称不能为空', 'error');
            return;
        }

        // Check duplicate name (excluding self)
        const isDuplicate = window.categoriesData.some(category => category.catelog === categoryName && category.id != id);
        if (isDuplicate) {
            window.showMessage('该分类名称已存在', 'error');
            return;
        }

        const payload = {
            catelog: categoryName,
            parent_id: parentId,
            is_private: isPrivate
        };

        if (sortOrder !== '') {
            payload.sort_order = Number(sortOrder);
        }

        fetch(`/api/categories/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(res => res.json())
            .then(data => {
                if (data.code === 200) {
                    window.showMessage('分类更新成功', 'success');
                    editCategoryModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    fetchCategories(categoryCurrentPage);
                    // 刷新主界面数据（因为分类名可能变了）
                    if (typeof fetchConfigs === 'function') fetchConfigs();
                    if (typeof window.loadGlobalCategories === 'function') window.loadGlobalCategories();
                } else {
                    window.showMessage(data.message || '分类更新失败', 'error');
                }
            }).catch(err => {
                window.showMessage('网络错误: ' + err.message, 'error');
            });
    });
}

// ========== 新增分类功能 ==========
const addCategoryModal = document.getElementById('addCategoryModal');
const closeCategoryModal = document.getElementById('closeCategoryModal');
const addCategoryForm = document.getElementById('addCategoryForm');

const cancelAddCategoryBtn = document.getElementById('cancelAddCategoryBtn');
if (cancelAddCategoryBtn) {
  cancelAddCategoryBtn.addEventListener('click', () => {
    addCategoryModal.style.display = 'none';
    document.body.classList.remove('modal-open');
    if (addCategoryForm) addCategoryForm.reset();
  });
}

if (closeCategoryModal) {
    closeCategoryModal.addEventListener('click', () => {
        addCategoryModal.style.display = 'none';
        document.body.classList.remove('modal-open');
        addCategoryForm.reset();
    });
}

// 提交新增分类表单
if (addCategoryForm) {
    addCategoryForm.addEventListener('submit', function (e) {
        e.preventDefault();

        const categoryName = document.getElementById('newCategoryName').value.trim();
        const sortOrder = document.getElementById('newCategorySortOrder').value.trim();
        const parentId = document.getElementById('newCategoryParent').value;
        const isPrivate = document.getElementById('newCategoryIsPrivate').checked;

        if (!categoryName) {
            window.showMessage('分类名称不能为空', 'error');
            return;
        }

        const payload = {
            catelog: categoryName,
            parent_id: parentId,
            is_private: isPrivate
        };

        if (sortOrder !== '') {
            payload.sort_order = Number(sortOrder);
        }

        fetch('/api/categories/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        }).then(res => res.json())
            .then(data => {
                if (data.code === 201 || data.code === 200) {
                    window.showMessage('分类创建成功', 'success');
                    addCategoryModal.style.display = 'none';
                    document.body.classList.remove('modal-open');
                    addCategoryForm.reset();

                    fetchCategories();
                    // 刷新主界面数据（因为主界面数据也变了，比如下拉框需要更新）
                    if (typeof fetchConfigs === 'function') fetchConfigs();
                    if (typeof window.loadGlobalCategories === 'function') window.loadGlobalCategories();
                } else {
                    window.showMessage(data.message || '分类创建失败', 'error');
                }
            }).catch(err => {
                window.showMessage('网络错误: ' + err.message, 'error');
            });
    });
}
