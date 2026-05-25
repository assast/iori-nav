// public/js/admin-batch.js

// ===================================
// 批量操作功能 (Batch Operations)
// 与 admin.js 主列表联动，不再使用独立的批量管理模态框
// ===================================

// 批量删除确认模态框元素
const batchDeleteConfirmModal = document.getElementById('batchDeleteConfirmModal');
const closeBatchDeleteConfirmModal = document.getElementById('closeBatchDeleteConfirmModal');
const cancelBatchDeleteBtn = document.getElementById('cancelBatchDeleteBtn');
const confirmBatchDeleteBtn = document.getElementById('confirmBatchDeleteBtn');
const batchDeleteConfirmText = document.getElementById('batchDeleteConfirmText');

// 批量更改分类模态框
const batchCategoryModal = document.getElementById('batchCategoryModal');
const closeBatchCategoryModal = document.getElementById('closeBatchCategoryModal');
const cancelBatchCategoryBtn = document.getElementById('cancelBatchCategoryBtn');
const confirmBatchCategoryBtn = document.getElementById('confirmBatchCategoryBtn');
const batchTargetCategoryInput = document.getElementById('batchTargetCategory');

// 批量更改隐私模态框
const batchPrivacyModal = document.getElementById('batchPrivacyModal');
const closeBatchPrivacyModal = document.getElementById('closeBatchPrivacyModal');
const cancelBatchPrivacyBtn = document.getElementById('cancelBatchPrivacyBtn');
const confirmBatchPrivacyBtn = document.getElementById('confirmBatchPrivacyBtn');

function closeBatchModal(modal) {
    if (!modal) return;
    if (typeof window.closeAdminModal === 'function') {
        window.closeAdminModal(modal);
    } else {
        modal.style.display = 'none';
    }
}

// 绑定删除确认模态框关闭/取消事件
if (closeBatchDeleteConfirmModal) closeBatchDeleteConfirmModal.onclick = () => closeBatchModal(batchDeleteConfirmModal);
if (cancelBatchDeleteBtn) cancelBatchDeleteBtn.onclick = () => closeBatchModal(batchDeleteConfirmModal);
if (batchDeleteConfirmModal) {
    batchDeleteConfirmModal.onclick = (e) => {
        if (e.target === batchDeleteConfirmModal) closeBatchModal(batchDeleteConfirmModal);
    };
}

// 绑定确认删除事件
if (confirmBatchDeleteBtn) {
    confirmBatchDeleteBtn.onclick = () => {
        performBatchAction('delete', { });
        closeBatchModal(batchDeleteConfirmModal);
    };
}

// 批量更改分类
if (closeBatchCategoryModal) closeBatchCategoryModal.onclick = () => closeBatchModal(batchCategoryModal);
if (cancelBatchCategoryBtn) cancelBatchCategoryBtn.onclick = () => closeBatchModal(batchCategoryModal);

if (confirmBatchCategoryBtn) {
    confirmBatchCategoryBtn.addEventListener('click', () => {
        const targetId = batchTargetCategoryInput.value;
        if (!targetId || targetId === '0') {
            alert('请选择一个有效的分类');
            return;
        }

        performBatchAction('update_category', { categoryId: targetId });
        closeBatchModal(batchCategoryModal);
    });
}

// 批量更改隐私
if (closeBatchPrivacyModal) closeBatchPrivacyModal.onclick = () => closeBatchModal(batchPrivacyModal);
if (cancelBatchPrivacyBtn) cancelBatchPrivacyBtn.onclick = () => closeBatchModal(batchPrivacyModal);

if (confirmBatchPrivacyBtn) {
    confirmBatchPrivacyBtn.addEventListener('click', async () => {
        const privacyVal = document.querySelector('input[name="batchPrivacyOption"]:checked').value;
        const isPrivate = privacyVal === '1';

        // 自动更新关联的分类为公开
        if (!isPrivate) {
            // 找出所有选中的 Item，然后收集涉及的私密分类ID
            const categoriesToUpdate = new Set();
            window.selectedBookmarkIds.forEach(id => {
                const item = window.allConfigs?.find(c => c.id == id);
                // 如果是全选跨页操作，这里可能有问题，因为 allConfigs 只有当前页。
                // 但目前的 UI 实现仅支持当前页操作 (checkboxes 都是根据当前页渲染的)
                if (item && item.catelog_id) {
                    const cat = window.categoriesData.find(c => c.id == item.catelog_id);
                    if (cat && cat.is_private) {
                        categoriesToUpdate.add(item.catelog_id);
                    }
                }
            });

            if (categoriesToUpdate.size > 0) {
                 window.showMessage(`正在自动公开 ${categoriesToUpdate.size} 个私密分类...`, 'info');
                 // 并发更新分类
                 const updates = Array.from(categoriesToUpdate).map(catId => {
                     const cat = window.categoriesData.find(c => c.id == catId);
                     return fetch(`/api/categories/${catId}`, {
                         method: 'PUT',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ ...cat, is_private: false })
                     });
                 });

                  try {
                      await Promise.all(updates);
                      // 刷新分类数据
                      if (typeof window.loadGlobalCategories === 'function') window.loadGlobalCategories();
                  } catch (e) {
                     window.showMessage('自动公开分类失败', 'error');
                     return;
                 }
            }
        }

        performBatchAction('update_privacy', { isPrivate: isPrivate });
        closeBatchModal(batchPrivacyModal);
    });
}

// 执行批量请求
function performBatchAction(action, payload) {
    const ids = Array.from(window.selectedBookmarkIds);
    if (ids.length === 0) return;
    window.showMessage('正在处理...', 'info');

    fetch('/api/config/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: action,
            ids: ids,
            payload: payload
        })
    }).then(res => res.json())
      .then(data => {
          if (data.code === 200) {
              window.showMessage(data.message, 'success');
              // 刷新主界面数据
              if (typeof window.fetchConfigs === 'function') window.fetchConfigs();
              // 如果更改了隐私，分类状态也可能变了，刷新分类
              if (typeof window.fetchCategories === 'function') window.fetchCategories();

              // 清空选择
              if (typeof window.clearBookmarkSelection === 'function') {
                  window.clearBookmarkSelection();
              } else {
                  window.selectedBookmarkIds.clear();
                  document.querySelectorAll('.bookmark-checkbox').forEach(cb => cb.checked = false);
                  if (typeof window.updateBatchActionsBar === 'function') window.updateBatchActionsBar();
              }
          } else {
              window.showMessage(data.message || '操作失败', 'error');
          }
      }).catch(err => {
          window.showMessage('网络错误: ' + err.message, 'error');
      });
}
