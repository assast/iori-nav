// public/js/admin-bookmarks.js

const addBookmarkBtn = document.getElementById('addBookmarkBtn');
const addBookmarkModal = document.getElementById('addBookmarkModal');
const closeBookmarkModal = document.getElementById('closeBookmarkModal');
const addBookmarkForm = document.getElementById('addBookmarkForm');
const addBookmarkCatelogSelect = document.getElementById('addBookmarkCatelog');

if (addBookmarkBtn) {
  addBookmarkBtn.addEventListener('click', () => {
    // 确保 tree 存在
    if (typeof window.categoriesTree !== 'undefined') {
         if (typeof window.createCascadingDropdown === 'function') {
            window.createCascadingDropdown('addBookmarkCatelogWrapper', 'addBookmarkCatelog', window.categoriesTree);
         }
         addBookmarkModal.style.display = 'block';
    } else {
        // Fallback fetch
        fetch('/api/categories?pageSize=9999').then(res => res.json()).then(data => {
            if (data.code === 200) {
              window.categoriesData = data.data || [];
              if (typeof window.buildCategoryTree === 'function') {
                  window.categoriesTree = window.buildCategoryTree(window.categoriesData);
              }
              if (typeof window.createCascadingDropdown === 'function') {
                window.createCascadingDropdown('addBookmarkCatelogWrapper', 'addBookmarkCatelog', window.categoriesTree);
              }
              addBookmarkModal.style.display = 'block';
            } else {
              window.showMessage('无法加载分类数据', 'error');
            }
        });
    }
  });
}

if (closeBookmarkModal) {
  closeBookmarkModal.addEventListener('click', () => {
    addBookmarkModal.style.display = 'none';
    if (addBookmarkForm) addBookmarkForm.reset();
  });
}

const cancelAddBookmarkBtn = document.getElementById('cancelAddBookmarkBtn');
if (cancelAddBookmarkBtn) {
  cancelAddBookmarkBtn.addEventListener('click', () => {
    addBookmarkModal.style.display = 'none';
    if (addBookmarkForm) addBookmarkForm.reset();
  });
}

async function checkAndUpdateCategoryPrivacy(catelogId, isPrivate) {
    // 如果书签是私密的，无需关心分类（分类私密或公开都行）
    if (isPrivate) return true;
    
    // 书签是公开的，检查分类
    const category = window.categoriesData.find(c => c.id == catelogId);
    if (category && category.is_private) {
        // 分类是私密的，需要将其改为公开
        try {
            const res = await fetch(`/api/categories/${catelogId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...category,
                    is_private: false
                })
            });
            const data = await res.json();
            if (data.code === 200) {
                // 更新本地数据
                category.is_private = false;
                return true;
            } else {
                window.showMessage('自动更新分类隐私失败: ' + data.message, 'error');
                return false;
            }
        } catch (err) {
            window.showMessage('网络错误，无法更新分类隐私', 'error');
            return false;
        }
    }
    return true;
}

if (addBookmarkForm) {
  addBookmarkForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const name = document.getElementById('addBookmarkName').value;
    const url = document.getElementById('addBookmarkUrl').value;
    const logo = document.getElementById('addBookmarkLogo').value;
    const desc = document.getElementById('addBookmarkDesc').value;
    const catelogId = addBookmarkCatelogSelect.value;
    const sortOrder = document.getElementById('addBookmarkSortOrder').value;
    const isPrivate = document.getElementById('addBookmarkIsPrivate').checked;

    if (!name || !url || !catelogId) {
      window.showMessage('名称, URL 和分类为必填项', 'error');
      return;
    }

    // Check privacy
    const success = await checkAndUpdateCategoryPrivacy(catelogId, isPrivate);
    if (!success) return;

    const payload = {
      name: name.trim(),
      url: url.trim(),
      logo: logo.trim(),
      desc: desc.trim(),
      catelogId: catelogId,
      is_private: isPrivate
    };

    if (sortOrder !== '') payload.sort_order = Number(sortOrder);

    fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 201) {
          window.showMessage('添加成功', 'success');
          setTimeout(() => {
            addBookmarkModal.style.display = 'none';
            addBookmarkForm.reset();
            if (typeof window.fetchConfigs === 'function') window.fetchConfigs();
            // 如果分类被修改了，也刷新分类
            if (typeof window.fetchCategories === 'function') window.fetchCategories();
          }, 1000);
        } else {
          window.showMessage(data.message, 'error');
        }
      }).catch(err => {
        window.showMessage('网络错误', 'error');
      });
  });
}

// 编辑书签表单逻辑
const editBookmarkModal = document.getElementById('editBookmarkModal');
const closeEditBookmarkModal = document.getElementById('closeEditBookmarkModal');
const editBookmarkForm = document.getElementById('editBookmarkForm');

if (closeEditBookmarkModal) {
  closeEditBookmarkModal.addEventListener('click', () => { editBookmarkModal.style.display = 'none'; });
}

const cancelEditBookmarkBtn = document.getElementById('cancelEditBookmarkBtn');
if (cancelEditBookmarkBtn) {
  cancelEditBookmarkBtn.addEventListener('click', () => { editBookmarkModal.style.display = 'none'; });
}

if (editBookmarkForm) {
  editBookmarkForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    data.is_private = document.getElementById('editBookmarkIsPrivate').checked;

    // Check privacy
    const success = await checkAndUpdateCategoryPrivacy(data.catelog_id, data.is_private);
    if (!success) return;

    fetch(`/api/config/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    }).then(res => res.json())
      .then(data => {
        if (data.code === 200) {
          window.showMessage('修改成功', 'success');
          setTimeout(() => {
            if (typeof window.fetchConfigs === 'function') window.fetchConfigs();
            // 如果分类被修改了，也刷新分类
            if (typeof window.fetchCategories === 'function') window.fetchCategories();
            editBookmarkModal.style.display = 'none';
          }, 1000);
        } else { window.showMessage(data.message, 'error'); }
      }).catch(err => { window.showMessage('网络错误', 'error'); });
  });
}

// 删除确认模态框逻辑 - 这部分如果 admin.js 已经处理了全局的，这里可以移除，
// 但为了兼容性如果 admin.js 没暴露所有 DOM 元素，这里保留无妨。
// 为了避免重复绑定，最好检查一下。admin.js 中已经有全局处理逻辑了。
// 这里仅仅保留 DOM 元素的获取和简单的显示隐藏，具体的逻辑由 admin.js 的 window.handleDelete 驱动
