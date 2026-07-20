document.addEventListener('DOMContentLoaded', function () {
  // ========== 侧边栏控制 ==========
  const sidebar = document.getElementById('sidebar');
  const mobileOverlay = document.getElementById('mobileOverlay');
  const sidebarToggle = document.getElementById('sidebarToggle');
  const closeSidebar = document.getElementById('closeSidebar');

  function openSidebar() {
    sidebar?.classList.add('open');
    mobileOverlay?.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeSidebarMenu() {
    sidebar?.classList.remove('open');
    mobileOverlay?.classList.remove('open');
    document.body.style.overflow = '';
  }

  sidebarToggle?.addEventListener('click', openSidebar);
  closeSidebar?.addEventListener('click', closeSidebarMenu);
  mobileOverlay?.addEventListener('click', closeSidebarMenu);

  // 为初始 SSR 渲染的卡片设置动画延迟（已从服务端移至前端）
  const initialCards = document.querySelectorAll('.site-card.card-anim-enter');
  const sitesGrid = document.getElementById('sitesGrid');
  const sitesEmptyState = document.getElementById('sitesEmptyState');
  const clearSearchBtn = document.getElementById('clearSearchBtn');

  // 毛玻璃开关在整个页面生命周期内不变：IORI_LAYOUT_CONFIG 为主，CSS 变量做回退。
  // 只在启动时读一次，避免 renderSites 每次切分类都触发 getComputedStyle
  const isFrostedEnabled = (() => {
    const config = window.IORI_LAYOUT_CONFIG || {};
    if (config.enableFrostedGlass !== undefined) return config.enableFrostedGlass;
    const frostedBlurVal = getComputedStyle(document.documentElement)
      .getPropertyValue('--frosted-glass-blur').trim();
    return frostedBlurVal !== '';
  })();

  initialCards.forEach((card, index) => {
    const delay = Math.min(index, 12) * 20;
    if (delay > 0) card.style.animationDelay = `${delay}ms`;
    card.addEventListener('animationend', () => {
      card.classList.remove('card-anim-enter');
      if (card.style.animationDelay) {
        card.style.removeProperty('animation-delay');
      }
    }, { once: true });
  });

  // ========== 复制链接功能 ==========
  sitesGrid?.addEventListener('click', function (e) {
    const btn = e.target.closest('.copy-btn');
    if (!btn) return;

    e.preventDefault();
    e.stopPropagation();
    const url = btn.getAttribute('data-url');
    if (!url) return;

    navigator.clipboard.writeText(url).then(() => {
      showCopySuccess(btn);
    }).catch(() => {
      // 备用方法
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showCopySuccess(btn);
      } catch (err) {
        alert('复制失败,请手动复制');
      }
      document.body.removeChild(textarea);
    });
  });

  function showCopySuccess(btn) {
    const successMsg = btn.querySelector('.copy-success');
    if (!successMsg) return;
    successMsg.classList.remove('hidden');
    successMsg.classList.add('copy-success-animation');
    setTimeout(() => {
      successMsg.classList.add('hidden');
      successMsg.classList.remove('copy-success-animation');
    }, 2000);
  }

  // ========== 点击量追踪 ==========
  // 点击站点卡片时在 localStorage 累加，不触发网络写入，不立即重排
  sitesGrid?.addEventListener('click', function (e) {
    const link = e.target.closest('.site-card a[target="_blank"]');
    if (!link) return;
    const card = link.closest('.site-card');
    const siteId = card?.getAttribute('data-id');
    if (siteId && window.IORI_CLICKS) {
      window.IORI_CLICKS.increment(siteId);
    }
  });

  // ========== 返回顶部 ==========
  const backToTop = document.getElementById('backToTop');
  const appScroll = document.getElementById('app-scroll');

  let scrollTicking = false;
  const onScroll = () => {
    if (scrollTicking) return;
    scrollTicking = true;
    requestAnimationFrame(() => {
      const top = appScroll ? appScroll.scrollTop : window.pageYOffset;
      if (top > 300) {
        backToTop?.classList.remove('opacity-0', 'invisible');
      } else {
        backToTop?.classList.add('opacity-0', 'invisible');
      }
      scrollTicking = false;
    });
  };

  if (appScroll) {
    appScroll.addEventListener('scroll', onScroll);
  } else {
    window.addEventListener('scroll', onScroll);
  }

  backToTop?.addEventListener('click', function () {
    if (appScroll) {
      appScroll.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // ========== 模态框控制 ==========
  const addSiteModal = document.getElementById('addSiteModal');
  const addSiteBtnSidebar = document.getElementById('addSiteBtnSidebar');
  const closeModalBtn = document.getElementById('closeModal');
  const cancelAddSite = document.getElementById('cancelAddSite');
  const addSiteForm = document.getElementById('addSiteForm');

  function openModal() {
    addSiteModal?.classList.remove('opacity-0', 'invisible');
    addSiteModal?.querySelector('.max-w-md')?.classList.remove('translate-y-8');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    addSiteModal?.classList.add('opacity-0', 'invisible');
    addSiteModal?.querySelector('.max-w-md')?.classList.add('translate-y-8');
    document.body.style.overflow = '';
  }

  let cachedCategories = null;

  async function fetchCategoriesForSelect() {
    const selectElement = document.getElementById('addSiteCatelog');
    if (!selectElement) return;

    if (cachedCategories) {
      selectElement.innerHTML = '<option value="" disabled selected>请选择一个分类</option>';
      cachedCategories.forEach(category => {
        const option = document.createElement('option');
        option.value = category.id;
        option.textContent = category.catelog;
        selectElement.appendChild(option);
      });
      return;
    }

    try {
      const response = await fetch('/api/categories?pageSize=999');
      const data = await response.json();
      if (data.code === 200 && data.data) {
        cachedCategories = data.data;
        selectElement.innerHTML = '<option value="" disabled selected>请选择一个分类</option>';
        data.data.forEach(category => {
          const option = document.createElement('option');
          option.value = category.id;
          option.textContent = category.catelog;
          selectElement.appendChild(option);
        });
      } else {
        selectElement.innerHTML = '<option value="" disabled>无法加载分类</option>';
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      selectElement.innerHTML = '<option value="" disabled>加载分类失败</option>';
    }
  }

  addSiteBtnSidebar?.addEventListener('click', (e) => {
    e.preventDefault();
    openModal();
    fetchCategoriesForSelect();
  });

  closeModalBtn?.addEventListener('click', closeModal);
  cancelAddSite?.addEventListener('click', closeModal);
  addSiteModal?.addEventListener('click', (e) => {
    if (e.target === addSiteModal) closeModal();
  });

  // ========== 表单提交 ==========
  addSiteForm?.addEventListener('submit', function (e) {
    e.preventDefault();

    const data = {
      name: document.getElementById('addSiteName').value,
      url: document.getElementById('addSiteUrl').value,
      logo: document.getElementById('addSiteLogo').value,
      desc: document.getElementById('addSiteDesc').value,
      catelog_id: document.getElementById('addSiteCatelog').value
    };

    fetch('/api/config/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
      .then(res => res.json())
      .then(data => {
        if (data.code === 201) {
          showToast('提交成功,等待管理员审核');
          closeModal();
          addSiteForm.reset();
        } else {
          alert(data.message || '提交失败');
        }
      })
      .catch(err => {
        console.error('网络错误:', err);
        alert('网络错误,请稍后重试');
      });
  });

  function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'fixed top-4 right-4 bg-accent-500 text-white px-4 py-2 rounded shadow-lg z-50 transition-opacity duration-300';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 300);
    }, 2500);
  }

  // ========== 分类批量打开 ==========
  const categoryOpenConfirmModal = document.getElementById('categoryOpenConfirmModal');
  const categoryOpenConfirmDialog = categoryOpenConfirmModal?.querySelector('.category-open-confirm-dialog');
  const categoryOpenConfirmForm = document.getElementById('categoryOpenConfirmForm');
  const categoryOpenConfirmTitle = document.getElementById('categoryOpenConfirmTitle');
  const categoryOpenConfirmTarget = document.getElementById('categoryOpenConfirmTarget');
  const categoryOpenConfirmSummary = document.getElementById('categoryOpenConfirmSummary');
  const categoryOpenScopeFields = document.getElementById('categoryOpenScopeFields');
  const categoryOpenScopeCurrent = document.getElementById('categoryOpenScopeCurrent');
  const categoryOpenScopeDescendants = document.getElementById('categoryOpenScopeDescendants');
  const categoryOpenCurrentCount = document.getElementById('categoryOpenCurrentCount');
  const categoryOpenDescendantCount = document.getElementById('categoryOpenDescendantCount');
  const confirmCategoryOpen = document.getElementById('confirmCategoryOpen');
  const closeCategoryOpenConfirmButton = document.getElementById('closeCategoryOpenConfirm');
  const cancelCategoryOpenConfirmButton = document.getElementById('cancelCategoryOpenConfirm');
  let pendingCategoryOpen = null;
  let categoryOpenLastFocus = null;
  let categoryOpenPreviousScrollOverflow = '';

  sitesGrid?.addEventListener('click', function (e) {
    const button = e.target.closest('.category-open-btn');
    if (!button) return;

    e.preventDefault();
    e.stopPropagation();

    requestCategoryOpen(button.getAttribute('data-category-id'));
  });

  function getSafeSiteUrl(site) {
    const normalizedUrl = normalizeUrl(site?.url);
    if (!normalizedUrl) return '';

    try {
      const parsed = new URL(normalizedUrl);
      return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function getOpenableCategorySites(categoryId, includeDescendants) {
    return getSitesForCategory(categoryId, includeDescendants)
      .map(site => ({ site, url: getSafeSiteUrl(site) }))
      .filter(item => item.url);
  }

  function getSelectedCategoryOpenSites() {
    if (!pendingCategoryOpen) return [];
    return categoryOpenScopeDescendants?.checked
      ? pendingCategoryOpen.descendantSites
      : pendingCategoryOpen.currentSites;
  }

  function updateCategoryOpenConfirmation() {
    if (!pendingCategoryOpen || !categoryOpenConfirmSummary || !confirmCategoryOpen) return;

    const selectedSites = getSelectedCategoryOpenSites();
    categoryOpenConfirmSummary.textContent = `将在新标签页中打开 ${selectedSites.length} 个书签。`;
    confirmCategoryOpen.disabled = selectedSites.length === 0;
  }

  function closeCategoryOpenConfirmation() {
    if (!categoryOpenConfirmModal?.classList.contains('is-open')) return;

    categoryOpenConfirmModal.classList.remove('is-open');
    categoryOpenConfirmModal.setAttribute('aria-hidden', 'true');
    if (appScroll) appScroll.style.overflow = categoryOpenPreviousScrollOverflow;
    pendingCategoryOpen = null;
    categoryOpenLastFocus?.focus();
    categoryOpenLastFocus = null;
  }

  function requestCategoryOpen(categoryId) {
    if (!categoryId || !categoryOpenConfirmModal) return;

    const currentSites = getOpenableCategorySites(categoryId, false);
    const descendantSites = getOpenableCategorySites(categoryId, true);
    if (descendantSites.length === 0) {
      showToast('该分类下没有可打开的书签');
      return;
    }

    const descendantIds = (window.IORI_CATEGORY_DESCENDANT_IDS || {})[String(categoryId)] || [String(categoryId)];
    const hasDescendants = descendantIds.length > 1;
    pendingCategoryOpen = { categoryId, currentSites, descendantSites };
    categoryOpenLastFocus = document.activeElement;

    if (categoryOpenConfirmTitle) {
      categoryOpenConfirmTitle.textContent = '确认一键打开';
    }
    if (categoryOpenConfirmTarget) {
      categoryOpenConfirmTarget.textContent = `「${getCategoryGroupLabel(categoryId)}」`;
    }
    if (categoryOpenScopeFields) categoryOpenScopeFields.hidden = !hasDescendants;
    // 默认始终只打开当前分类自己
    if (categoryOpenScopeCurrent) categoryOpenScopeCurrent.checked = true;
    if (categoryOpenScopeDescendants) categoryOpenScopeDescendants.checked = false;
    if (categoryOpenCurrentCount) categoryOpenCurrentCount.textContent = `${currentSites.length} 个`;
    if (categoryOpenDescendantCount) categoryOpenDescendantCount.textContent = `${descendantSites.length} 个`;
    updateCategoryOpenConfirmation();

    categoryOpenPreviousScrollOverflow = appScroll?.style.overflow || '';
    if (appScroll) appScroll.style.overflow = 'hidden';
    categoryOpenConfirmModal.classList.add('is-open');
    categoryOpenConfirmModal.setAttribute('aria-hidden', 'false');
    requestAnimationFrame(() => {
      // 当前分类为空时，把焦点放到「包含子分类」选项，提示可切换范围
      const initialFocus = hasDescendants && currentSites.length === 0
        ? categoryOpenScopeDescendants
        : confirmCategoryOpen;
      initialFocus?.focus();
    });
  }

  categoryOpenScopeFields?.addEventListener('change', updateCategoryOpenConfirmation);
  closeCategoryOpenConfirmButton?.addEventListener('click', closeCategoryOpenConfirmation);
  cancelCategoryOpenConfirmButton?.addEventListener('click', closeCategoryOpenConfirmation);
  categoryOpenConfirmModal?.addEventListener('click', (e) => {
    if (e.target === categoryOpenConfirmModal) closeCategoryOpenConfirmation();
  });
  categoryOpenConfirmDialog?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeCategoryOpenConfirmation();
      return;
    }
    if (e.key !== 'Tab') return;

    const focusable = Array.from(categoryOpenConfirmDialog.querySelectorAll('button:not([disabled]), input:not([disabled])'))
      .filter(element => !element.closest('[hidden]'));
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });
  categoryOpenConfirmForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pendingCategoryOpen) return;

    // 防止在“仅当前分类且数量为 0”时通过回车提交
    if (getSelectedCategoryOpenSites().length === 0) {
      updateCategoryOpenConfirmation();
      return;
    }

    const { categoryId } = pendingCategoryOpen;
    // 无子分类时强制只打开当前分类；有子分类时以用户选择为准（默认仅当前）
    const includeDescendants = !categoryOpenScopeFields?.hidden
      && categoryOpenScopeDescendants?.checked === true;
    closeCategoryOpenConfirmation();
    openCategorySites(categoryId, includeDescendants);
  });

  function openCategorySites(categoryId, includeDescendants) {
    if (!categoryId) return;

    const sites = getOpenableCategorySites(categoryId, includeDescendants);

    if (sites.length === 0) {
      showToast('该分类下没有可打开的书签');
      return;
    }

    let openedCount = 0;
    sites.forEach(({ site, url }) => {
      const tab = window.open(url, '_blank');
      if (tab) {
        // Keep the opened page from retaining a reference to the navigation site.
        tab.opener = null;
        openedCount += 1;
        if (site.id && window.IORI_CLICKS) window.IORI_CLICKS.increment(site.id);
      }
    });

    if (openedCount === 0) {
      showToast('浏览器拦截了弹窗，请允许本站弹窗后重试');
    } else if (openedCount < sites.length) {
      showToast(`已打开 ${openedCount}/${sites.length} 个书签，浏览器拦截了部分标签页`);
    } else {
      showToast(`已打开 ${openedCount} 个书签`);
    }
  }

  // ========== 搜索功能 ==========
  const searchInputs = document.querySelectorAll('.search-input-target');

  // 预缓存卡片搜索数据：从 IORI_SITES 按 data-id 查表，避免把数据再塞进 card 的 data-* 属性
  let searchCardCache = null;
  function getSearchCardCache() {
    if (searchCardCache) return searchCardCache;
    const cards = sitesGrid?.querySelectorAll('.site-card');
    if (!cards) return [];
    const sitesById = new Map();
    (window.IORI_SITES || []).forEach(s => sitesById.set(String(s.id), s));
    searchCardCache = Array.from(cards).map(card => {
      const id = card.getAttribute('data-id');
      const s = sitesById.get(String(id)) || {};
      const text = [s.name, s.url, s.catelog_name || '未分类', s.desc]
        .map(v => (v || '').toLowerCase()).join('\0');
      return { el: card, text };
    });
    return searchCardCache;
  }

  function updateSearchEmptyState(keyword, visibleCount) {
    if (!sitesEmptyState) return;

    const categoryEmptyState = sitesGrid?.querySelector('[data-role="category-empty-state"]');
    const shouldShowSearchEmpty = Boolean(keyword) && visibleCount === 0;

    sitesEmptyState.classList.toggle('hidden', !shouldShowSearchEmpty);

    if (categoryEmptyState) {
      categoryEmptyState.classList.toggle('hidden', shouldShowSearchEmpty);
    }
  }

  function getActiveSearchKeyword() {
    const filledInput = Array.from(searchInputs).find(input => input.value.trim());
    return (filledInput?.value || searchInputs[0]?.value || '').trim();
  }

  function applyLocalSearch(keyword, activeCatalog = undefined) {
    const normalizedKeyword = (keyword || '').toLowerCase().trim();
    const cached = getSearchCardCache();
    let visibleCount = 0;

    cached.forEach(({ el, text }) => {
      const isMatch = normalizedKeyword === '' || text.includes(normalizedKeyword);
      el.classList.toggle('hidden', !isMatch);
      if (isMatch) visibleCount++;
    });

    updateSearchEmptyState(normalizedKeyword, visibleCount);
    updateHeading(normalizedKeyword, activeCatalog, visibleCount);
    return visibleCount;
  }

  function syncSearchState(activeCatalog = undefined) {
    if (currentSearchEngine !== 'local') {
      updateSearchEmptyState('', sitesGrid?.querySelectorAll('.site-card:not(.hidden)').length || 0);
      updateHeading('', activeCatalog, sitesGrid?.querySelectorAll('.site-card:not(.hidden)').length || 0);
      return;
    }

    const keyword = getActiveSearchKeyword();
    if (keyword) {
      applyLocalSearch(keyword, activeCatalog);
      return;
    }

    const visibleCount = sitesGrid?.querySelectorAll('.site-card:not(.hidden)').length || 0;
    updateSearchEmptyState('', visibleCount);
    updateHeading('', activeCatalog, visibleCount);
  }

  let searchDebounceTimer = null;

  // Initialize Search Engine UI based on saved preference
  const engineOptions = document.querySelectorAll('.search-engine-option');

  // 如果外部搜索被禁用（没有搜索引擎选项），强制使用本地搜索
  let currentSearchEngine = 'local';
  if (engineOptions.length > 0) {
    currentSearchEngine = localStorage.getItem('search_engine') || 'local';
    if (currentSearchEngine === 'bing') {
      currentSearchEngine = 'github';
      localStorage.setItem('search_engine', currentSearchEngine);
    }
  } else {
    // 清除之前保存的外部搜索引擎选择
    localStorage.removeItem('search_engine');
  }

  function updateSearchEngineUI(engine) {
    // Update Active Class
    engineOptions.forEach(opt => {
      if (opt.dataset.engine === engine) {
        opt.classList.add('active');
      } else {
        opt.classList.remove('active');
      }
    });

    // Update Placeholder
    let placeholder = '搜索书签...';
    switch (engine) {
      case 'google': placeholder = 'Google 搜索...'; break;
      case 'baidu': placeholder = '百度搜索...'; break;
      case 'github': placeholder = 'GitHub 搜索...'; break;
    }

    searchInputs.forEach(input => {
      input.placeholder = placeholder;
    });

    if (engine === 'local') {
      syncSearchState();
      return;
    }

    getSearchCardCache().forEach(({ el }) => el.classList.remove('hidden'));
    updateSearchEmptyState('', getSearchCardCache().length);
    updateHeading('', undefined, getSearchCardCache().length);
  }

  // Apply initial state
  if (engineOptions.length > 0) {
    updateSearchEngineUI(currentSearchEngine);
  }

  // Search Engine Switching Logic
  engineOptions.forEach(option => {
    option.addEventListener('click', () => {
      currentSearchEngine = option.dataset.engine;
      localStorage.setItem('search_engine', currentSearchEngine); // Save to storage
      updateSearchEngineUI(currentSearchEngine);

      // Focus input after switch
      searchInputs.forEach(input => input.focus());
    });
  });

  searchInputs.forEach(input => {
    // Local Search Input Handler with debounce
    input.addEventListener('input', function () {
      if (currentSearchEngine !== 'local') return;

      const value = this.value;
      // Sync other inputs immediately
      searchInputs.forEach(otherInput => {
        if (otherInput !== this) otherInput.value = value;
      });

      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        applyLocalSearch(value);
      }, 200);
    });

    // External Search Enter Handler
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && currentSearchEngine !== 'local') {
        e.preventDefault();
        const query = this.value.trim();
        if (query) {
          let url = '';
          switch (currentSearchEngine) {
            case 'google': url = `https://www.google.com/search?q=${encodeURIComponent(query)}`; break;
            case 'baidu': url = `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`; break;
            case 'github': url = `https://github.com/search?q=${encodeURIComponent(query)}`; break;
          }
          if (url) window.open(url, '_blank');
        }
      }
    });
  });

  clearSearchBtn?.addEventListener('click', () => {
    searchInputs.forEach(input => {
      input.value = '';
    });
    applyLocalSearch('');
    searchInputs[0]?.focus();
  });

  function updateHeading(keyword, activeCatalog, count) {
    const heading = document.querySelector('[data-role="list-heading"]');
    if (!heading) return;

    const visibleCount = (count !== undefined) ? count : (sitesGrid?.querySelectorAll('.site-card:not(.hidden)').length || 0);
    const isMobile = window.innerWidth < 440;

    // Explicitly handle navigation state
    if (activeCatalog !== undefined) {
      if (activeCatalog) {
        heading.dataset.active = activeCatalog;
      } else {
        // Null or empty string means "All Categories"
        delete heading.dataset.active;
      }
    }

    if (keyword) {
      heading.textContent = isMobile ? `搜索 · ${visibleCount}` : `搜索“${keyword}” · ${visibleCount} 个书签`;
    } else {
      const currentActive = heading.dataset.active;
      if (isMobile) {
        heading.textContent = `${currentActive || '全部'} · ${visibleCount}`;
      } else {
        if (currentActive) {
          heading.textContent = `${currentActive} · ${visibleCount} 个书签`;
        } else {
          heading.textContent = `全部收藏 · ${visibleCount} 个书签`;
        }
      }
    }
  }

  // 初次加载时根据屏幕宽度修正标题显示
  syncSearchState();

  // ========== 一言 API ==========
  const hitokotoContainer = document.querySelector('#hitokoto')?.parentElement;
  // 检查容器是否被隐藏，如果隐藏则不发起请求
  if (hitokotoContainer && !hitokotoContainer.classList.contains('hidden')) {
    fetch('https://v1.hitokoto.cn', { signal: AbortSignal.timeout(3000) })
      .then(res => res.json())
      .then(data => {
        const hitokoto = document.getElementById('hitokoto_text');
        if (hitokoto) {
          hitokoto.href = `https://hitokoto.cn/?uuid=${data.uuid}`;
          hitokoto.innerText = data.hitokoto;
        }
      })
      .catch(console.error);
  }

  // ========== Horizontal Menu Overflow Logic ==========
  const navContainer = document.getElementById('horizontalCategoryNav');
  const moreWrapper = document.getElementById('horizontalMoreWrapper');
  const moreBtn = document.getElementById('horizontalMoreBtn');
  const dropdown = document.getElementById('horizontalMoreDropdown');

  // Define these globally within the scope so updateNavigationState can use them
  let checkOverflow = () => { };
  let resetNav = () => { };

  if (navContainer && moreWrapper && moreBtn && dropdown) {
    resetNav = () => {
      const dropdownItems = Array.from(dropdown.children);
      dropdownItems.forEach(item => {
        if (item.dataset.originalClass) item.className = item.dataset.originalClass;
        const link = item.querySelector('a');
        if (link && link.dataset.originalClass) link.className = link.dataset.originalClass;
        navContainer.insertBefore(item, moreWrapper);
      });
      moreWrapper.classList.add('hidden');
      moreBtn.classList.remove('active', 'text-primary-600', 'bg-secondary-100');
      moreBtn.classList.add('inactive');
    };

    checkOverflow = () => {
      resetNav();

      // Filter visible category items (exclude moreWrapper which is hidden now)
      // Actually moreWrapper is child of navContainer.
      const navChildren = Array.from(navContainer.children).filter(el => el !== moreWrapper);

      if (navChildren.length === 0) return;

      const firstTop = navChildren[0].offsetTop;
      const lastItem = navChildren[navChildren.length - 1];

      // Check if last item wraps
      if (lastItem.offsetTop === firstTop) {
        // No wrapping even for the last item -> All fit!
        navContainer.style.overflow = 'visible';
        return;
      }

      // Wrapping detected! Show the "More" button to participate in layout
      moreWrapper.classList.remove('hidden');

      // Loop to move items to dropdown until everything fits on one line
      // We check if "moreWrapper" (which is now the last item) wraps.
      // Or if the item before it wraps.
      while (true) {
        // Current visible items (categories)
        const currentCategories = Array.from(navContainer.children).filter(el => el !== moreWrapper && el.style.display !== 'none');

        if (currentCategories.length === 0) break; // Should not happen

        const lastCategory = currentCategories[currentCategories.length - 1];

        // Check condition: Does "moreWrapper" wrap? Or does "lastCategory" wrap?
        // (We want everything on the first line)
        const moreWrapperWraps = moreWrapper.offsetTop > firstTop;
        const lastCategoryWraps = lastCategory.offsetTop > firstTop;

        if (!moreWrapperWraps && !lastCategoryWraps) {
          // Fits!
          break;
        }

        // Doesn't fit. Move lastCategory to dropdown.
        // Prepend to maintain order (4, 5 -> [5] -> [4, 5])

        // Save wrapper class
        if (!lastCategory.dataset.originalClass) {
          lastCategory.dataset.originalClass = lastCategory.className;
        }

        // Wrapper becomes a block item in dropdown
        lastCategory.className = 'menu-item-wrapper block w-full relative';

        // Adjust inner link style
        const link = lastCategory.querySelector('a');
        if (link) {
          link.dataset.originalClass = link.className;
          const isActive = link.classList.contains('active');
          link.className = 'dropdown-item w-full text-left px-4 py-2 text-sm';
          if (isActive) link.classList.add('active');
        }

        dropdown.insertBefore(lastCategory, dropdown.firstChild);
      }

      // Check if any item in dropdown is active and highlight More button
      const activeInDropdown = dropdown.querySelector('.active');
      if (activeInDropdown) {
        moreBtn.classList.add('active');
        moreBtn.classList.remove('inactive');
        moreBtn.classList.add('text-primary-600', 'bg-secondary-100');
      }

      // Restore overflow to visible to allow dropdowns (submenus) to show
      navContainer.style.overflow = 'visible';
    };

    // Initial check
    setTimeout(checkOverflow, 100);
    window.addEventListener('resize', () => {
      // Debounce
      clearTimeout(window.resizeTimer);
      window.resizeTimer = setTimeout(checkOverflow, 100);
    });

    // Toggle Dropdown
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = dropdown.classList.contains('hidden');
      if (isHidden) {
        dropdown.classList.remove('hidden');
        document.body.classList.add('menu-open');
      } else {
        dropdown.classList.add('hidden');
        document.body.classList.remove('menu-open');
      }
    });

    // Close on click inside dropdown
    dropdown.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link) {
        dropdown.classList.add('hidden');
        document.body.classList.remove('menu-open');
      }
    });

    // Close on click outside
    document.addEventListener('click', (e) => {
      if (!dropdown.contains(e.target) && !moreBtn.contains(e.target)) {
        dropdown.classList.add('hidden');
        document.body.classList.remove('menu-open');
      }
    });
  }

  // ========== AJAX Navigation ==========
  document.addEventListener('click', async (e) => {
    const link = e.target.closest('a[href^="?catalog="]');
    if (!link) return;

    // Allow new tab clicks
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    e.preventDefault();
    const href = link.getAttribute('href');
    const catalogId = link.getAttribute('data-id');

    // 优先使用 data-name (横向菜单可能没有), 其次 textContent
    // 但侧边栏现在有 svg，text content 会包含换行符。需要 trim。
    let catalogName = link.textContent.trim();

    if (typeof closeSidebarMenu === 'function') {
      closeSidebarMenu();
    }

    const sitesGrid = document.getElementById('sitesGrid');
    if (!sitesGrid) return;

    sitesGrid.style.transition = 'opacity 0.15s ease-out';
    sitesGrid.style.opacity = '0';

    try {
      // 如果没有预加载数据，回退到普通跳转
      if (!window.IORI_SITES) {
        window.location.href = href;
        return;
      }

      await new Promise(resolve => setTimeout(resolve, 50));

      sitesGrid.style.transition = 'none';
      sitesGrid.style.opacity = '1';

      const filteredSites = catalogId ? getSitesForCategory(catalogId) : getSitesForCategory(null);

      renderSites(filteredSites, catalogId);
      updateNavigationState(catalogId);
      syncSearchState(catalogId ? catalogName : null);

      // Remember Last Category Logic
      const config = window.IORI_LAYOUT_CONFIG || {};
      if (config.rememberLastCategory) {
        if (catalogId) {
          localStorage.setItem('iori_last_category', catalogId);
          setCookie('iori_last_category', catalogId, 365);
        } else {
          // Explicitly save "all" state
          localStorage.setItem('iori_last_category', 'all');
          setCookie('iori_last_category', 'all', 365);
        }
      }

    } catch (err) {
      console.error('Client-side navigation failed:', err);
    }
  });

  function setCookie(name, value, days) {
    let expires = "";
    if (days) {
      const date = new Date();
      date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
      expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
  }

  function getSitesForCategory(catalogId, includeDescendants = true) {
    const rawSites = window.IORI_SITES || [];
    const config = window.IORI_LAYOUT_CONFIG || {};
    // 合并本地与 DB 的 clicks 值
    const allSites = window.IORI_CLICKS ? window.IORI_CLICKS.merge(rawSites) : rawSites;

    if (!catalogId) {
      // 全部视图：若按点击量排序则全局降序
      if (config.sortByClicks) {
        return [...allSites].sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
      }
      return allSites;
    }

    const categoryDescendantIds = window.IORI_CATEGORY_DESCENDANT_IDS || {};
    const descendantIds = includeDescendants
      ? categoryDescendantIds[String(catalogId)] || [String(catalogId)]
      : [String(catalogId)];
    const descendantIdSet = new Set(descendantIds.map(id => String(id)));

    const filtered = allSites.filter(site => descendantIdSet.has(String(site.catelog_id)));

    if (config.sortByClicks) {
      // 分类视图保持分类树分组顺序，分类内部按点击量降序
      const categoryRank = new Map(descendantIds.map((id, index) => [String(id), index]));
      return filtered.sort((a, b) => {
        const rankA = categoryRank.get(String(a.catelog_id)) ?? Number.MAX_SAFE_INTEGER;
        const rankB = categoryRank.get(String(b.catelog_id)) ?? Number.MAX_SAFE_INTEGER;
        if (rankA !== rankB) return rankA - rankB;
        return (b.clicks || 0) - (a.clicks || 0);
      });
    }

    // 默认：按分类树顺序排列
    const categoryRank = new Map(descendantIds.map((id, index) => [String(id), index]));
    return filtered.sort((a, b) => {
      const rankA = categoryRank.get(String(a.catelog_id)) ?? Number.MAX_SAFE_INTEGER;
      const rankB = categoryRank.get(String(b.catelog_id)) ?? Number.MAX_SAFE_INTEGER;
      return rankA - rankB;
    });
  }

  function getCategoryGroupLabel(catelogId) {
    const names = window.IORI_CATEGORY_NAMES || {};
    return names[String(catelogId)] || '未分类';
  }

  function renderCategoryGroupHeader(label, isRootGroup, categoryId) {
    const safeLabel = escapeHTML(label || '未分类');
    const safeCategoryId = escapeHTML(categoryId || '');
    const subtitle = isRootGroup ? '当前' : '子目录';
    return `
      <div class="category-group-header col-span-full w-full ${isRootGroup ? 'mt-0' : 'mt-5 sm:mt-7'} mb-1 sm:mb-2" data-role="category-group-header" data-category-id="${safeCategoryId}">
        <div class="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 text-gray-700 dark:text-gray-200">
          <div class="flex items-baseline gap-2 min-w-0">
            <span class="text-sm sm:text-[0.95rem] font-semibold tracking-wide truncate" title="${safeLabel}">${safeLabel}</span>
            <span class="text-[11px] text-gray-400 dark:text-gray-500 flex-shrink-0 tracking-wider">${subtitle}</span>
          </div>
          <div class="category-group-actions inline-flex items-center gap-1" role="group" aria-label="${safeLabel}批量操作">
            <button type="button" class="category-group-action category-open-btn" data-category-id="${safeCategoryId}" title="选择范围后打开${safeLabel}的书签" aria-label="选择范围后打开${safeLabel}的书签">
              <svg aria-hidden="true"><use href="#icon-external-link"/></svg>
              <span class="category-action-label">一键打开</span>
            </button>
          </div>
        </div>
      </div>`;
  }

  function groupSitesForCategoryView(sites, activeCatalogId) {
    if (!activeCatalogId) return [{ id: '', label: '', isRootGroup: false, sites }];

    const groups = [];
    let currentGroup = null;
    sites.forEach(site => {
      const groupId = String(site.catelog_id || '');
      if (!currentGroup || currentGroup.id !== groupId) {
        currentGroup = {
          id: groupId,
          label: getCategoryGroupLabel(groupId),
          isRootGroup: groupId === String(activeCatalogId),
          sites: [],
        };
        groups.push(currentGroup);
      }
      currentGroup.sites.push(site);
    });
    return groups;
  }

  function renderSiteCard(site, index, options) {
    const { hideDesc, hideLinks, hideCategory, isFiveCols, isSixCols, cardStyle } = options;
    const rawName = String(site.name || '未命名');
    const safeName = escapeHTML(rawName);
    const safeUrl = normalizeUrl(site.url);
    const safeDesc = escapeHTML(site.desc || '暂无描述');
    const safeCatalog = escapeHTML(site.catelog_name || site.catelog || '未分类');
    const cardInitial = (rawName.trim().charAt(0) || '站').toUpperCase();

    const isAboveFold = index < 8;
    const imgLoadingAttrs = isAboveFold ? 'fetchpriority="high" decoding="async"' : 'loading="lazy" decoding="async"';
    const logoHtml = site.logo
      ? `<img src="${escapeHTML(site.logo)}" alt="${safeName}" width="36" height="36" class="w-9 h-9 rounded-md object-cover bg-gray-100 dark:bg-gray-700" ${imgLoadingAttrs}>`
      : `<div class="w-9 h-9 rounded-md bg-primary-600 flex items-center justify-center text-white font-semibold text-base shadow-inner">${cardInitial}</div>`;

    const descHtml = hideDesc ? '' : `<p class="site-desc mt-2 text-sm leading-relaxed line-clamp-2" title="${safeDesc}">${safeDesc}</p>`;

    const hasValidUrl = !!safeUrl;
    const linksHtml = hideLinks ? '' : `
        <div class="site-card-meta mt-auto pt-3 flex items-center justify-between gap-2">
          <span class="site-url text-xs truncate min-w-0 flex-1" title="${safeUrl}">${safeUrl || '未提供链接'}</span>
          <button class="copy-btn relative inline-flex items-center px-2 py-1 rounded-md text-xs font-medium transition-colors ${hasValidUrl ? '' : 'is-disabled'}" data-url="${safeUrl}" ${hasValidUrl ? '' : 'disabled'} aria-label="复制链接">
            <svg class="h-3 w-3 ${isFiveCols || isSixCols ? '' : 'mr-1'}" aria-hidden="true"><use href="#icon-copy"/></svg>
            ${isFiveCols || isSixCols ? '' : '<span class="copy-text">复制</span>'}
            <span class="copy-success hidden absolute -top-8 right-0 bg-accent-500 text-white text-xs px-2 py-1 rounded shadow-md">已复制!</span>
          </button>
        </div>`;

    const categoryHtml = hideCategory ? '' : `
              <span class="site-category mt-1 truncate" title="${safeCatalog}">${safeCatalog}</span>`;

    const frostedClass = isFrostedEnabled ? 'frosted-glass-effect' : '';
    const cardStyleClass = cardStyle === 'style2' ? 'style-2' : '';
    const baseCardClass = isFrostedEnabled
      ? 'site-card group overflow-hidden transition-all'
      : 'site-card group bg-white border border-primary-100/50 shadow-[0_1px_2px_rgba(36,48,58,0.04)] overflow-hidden dark:bg-gray-800 dark:border-gray-700';

    const card = document.createElement('div');
    card.className = `${baseCardClass} ${frostedClass} ${cardStyleClass} card-anim-enter`;
    const delay = Math.min(index, 12) * 20;
    if (delay > 0) {
      card.style.animationDelay = `${delay}ms`;
    }

    card.addEventListener('animationend', () => {
      card.classList.remove('card-anim-enter');
      card.style.animation = 'none';
      if (delay > 0) card.style.removeProperty('animation-delay');
    }, { once: true });

    card.setAttribute('data-id', site.id);
    card.innerHTML = `
      <div class="site-card-content">
        <a href="${safeUrl}" ${hasValidUrl ? 'target="_blank" rel="noopener noreferrer"' : ''} class="block">
          <div class="flex items-start">
            <div class="site-icon flex-shrink-0">
              ${logoHtml}
            </div>
            <div class="flex-1 min-w-0">
              <h3 class="site-title text-[0.95rem] font-semibold text-gray-900 truncate origin-left" title="${safeName}">${safeName}</h3>
              ${categoryHtml}
            </div>
          </div>
          ${descHtml}
        </a>
        ${linksHtml}
      </div>
      `;
    return card;
  }

  function renderSites(sites, activeCatalogId = null) {
    const sitesGrid = document.getElementById('sitesGrid');
    if (!sitesGrid) return;

    // 重新渲染时清除搜索缓存
    searchCardCache = null;

    // 使用全局配置获取布局设置，避免依赖 DOM 推断
    const config = window.IORI_LAYOUT_CONFIG || {};
    const cardOptions = {
      isFiveCols: config.gridCols === '5',
      isSixCols: config.gridCols === '6',
      hideDesc: config.hideDesc === true,
      hideLinks: config.hideLinks === true,
      hideCategory: config.hideCategory === true,
      cardStyle: config.cardStyle || 'style1',
    };

    sitesGrid.innerHTML = '';
    updateSearchEmptyState('', sites.length);

    if (sites.length === 0) {
      const activeHeaderHtml = activeCatalogId
        ? renderCategoryGroupHeader(getCategoryGroupLabel(activeCatalogId), true, activeCatalogId)
        : '';
      sitesGrid.innerHTML = `${activeHeaderHtml}<div data-role="category-empty-state" class="col-span-full text-center text-gray-500 py-10">本分类下暂无书签</div>`;
      return;
    }

    let cardIndex = 0;
    if (activeCatalogId) {
      sitesGrid.insertAdjacentHTML('beforeend', renderCategoryGroupHeader(getCategoryGroupLabel(activeCatalogId), true, activeCatalogId));
    }

    groupSitesForCategoryView(sites, activeCatalogId).forEach(group => {
      if (activeCatalogId && !group.isRootGroup) {
        sitesGrid.insertAdjacentHTML('beforeend', renderCategoryGroupHeader(group.label, false, group.id));
      }

      group.sites.forEach(site => {
        sitesGrid.appendChild(renderSiteCard(site, cardIndex, cardOptions));
        cardIndex += 1;
      });
    });
  }

  function updateNavigationState(catalogId) {
    // 1. Update states on standard nav items (in main container and dropdown)
    // 注意：不再调用 resetNav() 以避免打断用户交互
    const allLinks = document.querySelectorAll('a.nav-btn, a.dropdown-item');
    allLinks.forEach(link => {
      const linkId = link.getAttribute('data-id');
      const isActive = (!catalogId && !linkId) || (String(linkId) === String(catalogId));

      if (isActive) {
        link.classList.remove('inactive');
        link.classList.add('active', 'nav-item-active');
      } else {
        link.classList.remove('active', 'nav-item-active');
        link.classList.add('inactive');
      }
      // 保存状态，供 checkOverflow 恢复使用
      link.dataset.originalClass = link.className;
    });

    // 2. Parent highlighting
    const navContainer = document.getElementById('horizontalCategoryNav');
    if (navContainer) {
      const topWrappers = Array.from(navContainer.children);
      topWrappers.forEach(wrapper => {
        const topLink = wrapper.querySelector(':scope > a.nav-btn');
        if (!topLink) return;

        const topLinkId = topLink.getAttribute('data-id');
        // 如果顶级项不是当前分类，检查其子项是否有匹配
        if (String(topLinkId) !== String(catalogId)) {
          const subLink = wrapper.querySelector(`a[data-id="${catalogId}"]`);
          if (subLink) {
            topLink.classList.remove('inactive');
            topLink.classList.add('active', 'nav-item-active');
            topLink.dataset.originalClass = topLink.className;
          }
        }
      });
    }

    // 3. Highlight "More" button if active category is inside dropdown
    if (dropdown && moreBtn) {
      const activeInDropdown = dropdown.querySelector('.active');
      if (activeInDropdown) {
        moreBtn.classList.add('active', 'text-primary-600', 'bg-secondary-100');
        moreBtn.classList.remove('inactive');
      } else {
        moreBtn.classList.remove('active', 'text-primary-600', 'bg-secondary-100');
        moreBtn.classList.add('inactive');
      }
    }

    // 4. Highlight "All" button explicitly if no catalogId provided (means "All")
    if (!catalogId) {
      const allBtn = document.querySelector('a[href="?catalog=all"]');
      if (allBtn) {
        allBtn.classList.remove('inactive');
        allBtn.classList.add('active', 'nav-item-active');
      }
    }

    // Update Sidebar (Vertical Menu)
    const sidebar = document.getElementById('sidebar');
    if (sidebar) {
      const links = sidebar.querySelectorAll('.sidebar-nav-link, a[data-id], a[href="?catalog=all"]');
      links.forEach(link => {
        const linkId = link.getAttribute('data-id');
        const isAllLink = link.getAttribute('data-nav-all') === '1' || link.getAttribute('href') === '?catalog=all';
        const isActive = (!catalogId && isAllLink) || (!!catalogId && String(linkId) === String(catalogId));
        link.classList.toggle('is-active', isActive);
      });
    }
  }

  // 辅助函数
  const _ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, c => _ESC[c]);
  }

  function normalizeUrl(url) {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    return 'https://' + url;
  }

  // Auto-restore Last Category
  const didRestoreLastCategory = (function () {
    const config = window.IORI_LAYOUT_CONFIG || {};
    const urlParams = new URLSearchParams(window.location.search);
    const hasCatalogParam = urlParams.has('catalog');

    if (config.rememberLastCategory && !hasCatalogParam) {
      let lastId = localStorage.getItem('iori_last_category');

      // Fallback to Cookie if LocalStorage is missing (e.g. cleared or not synced)
      if (!lastId) {
        const match = document.cookie.match(/iori_last_category=(all|\d+)/);
        if (match) {
          lastId = match[1];
        }
      }

      if (lastId) {
        // 若与 SSR 当前渲染的分类一致，无需恢复分类；点击排序的本地增量会在后续初始化重排中处理
        if (String(lastId) === String(config.ssrCatalogId)) {
          return false;
        }

        if (lastId === 'all') {
          // Explicitly restore "All Categories" state
          const allSites = getSitesForCategory(null);
          renderSites(allSites);
          updateNavigationState(null);
          syncSearchState(null);
          return true;
        }

        // Try to find the category link in DOM to get correct Name and Href
        const link = document.querySelector(`a[data-id="${lastId}"]`);

        if (link) {
          const href = link.getAttribute('href');
          // Clone logic from click handler
          // Note: link.textContent might contain garbage if it has icons.
          // But updateHeading handles it? No, we should be careful.
          // main.js click handler uses: let catalogName = link.textContent.trim();
          let catalogName = link.innerText.trim();

          const filteredSites = getSitesForCategory(lastId);

          renderSites(filteredSites, lastId);
          updateNavigationState(lastId);
          syncSearchState(catalogName);
          return true;
        } else {
          localStorage.removeItem('iori_last_category');
        }
      }
    }
    return false;
  })();

  // 首屏 SSR 只包含 DB clicks；开启点击排序时用本地未同步增量重排一次
  (function rerenderInitialClicksSort() {
    const config = window.IORI_LAYOUT_CONFIG || {};
    if (!config.sortByClicks || didRestoreLastCategory || !window.IORI_CLICKS) return;

    const ssrCatalogId = config.ssrCatalogId && config.ssrCatalogId !== 'all' ? config.ssrCatalogId : null;
    renderSites(getSitesForCategory(ssrCatalogId), ssrCatalogId);
  })();

  requestAnimationFrame(() => {
    document.body.classList.add('app-ready');
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;

    if (!dropdown?.classList.contains('hidden')) {
      dropdown.classList.add('hidden');
      document.body.classList.remove('menu-open');
    }

    if (sidebar?.classList.contains('open')) {
      closeSidebarMenu();
    }
  });

  // Theme Toggle Logic
  const themeToggleBtn = document.getElementById('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const isDark = document.documentElement.classList.contains('dark');
      const nextState = isDark ? 'light' : 'dark';

      const updateTheme = () => {
        if (nextState === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        localStorage.setItem('theme', nextState);
      };

      // Fallback for browsers without View Transitions
      if (!document.startViewTransition) {
        updateTheme();
        return;
      }

      // Add class for custom transition CSS
      document.documentElement.classList.add('theme-animating');

      const transition = document.startViewTransition(() => {
        updateTheme();
      });

      transition.finished.finally(() => {
        document.documentElement.classList.remove('theme-animating');
      });
    });
  }

});
