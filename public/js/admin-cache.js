// CSRF token auto-attach: monkey-patch fetch for POST/PUT/DELETE/PATCH
(function() {
    const meta = document.querySelector('meta[name="csrf-token"]');
    if (!meta) return;
    const csrfToken = meta.getAttribute('content');
    if (!csrfToken) return;

    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        init = init || {};
        const method = (init.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            if (init.headers instanceof Headers) {
                if (!init.headers.has('X-CSRF-Token')) {
                    init.headers.set('X-CSRF-Token', csrfToken);
                }
            } else {
                init.headers = init.headers || {};
                if (!init.headers['X-CSRF-Token']) {
                    init.headers['X-CSRF-Token'] = csrfToken;
                }
            }
        }
        return originalFetch.call(this, input, init);
    };
})();

document.addEventListener('DOMContentLoaded', () => {
    // Refresh Cache Button Logic
    const refreshCacheBtn = document.getElementById('refreshCacheBtn');
    const refreshCacheModal = document.getElementById('refreshCacheModal');
    const closeRefreshCacheModal = document.getElementById('closeRefreshCacheModal');
    const cancelRefreshCacheBtn = document.getElementById('cancelRefreshCacheBtn');
    const confirmRefreshCacheBtn = document.getElementById('confirmRefreshCacheBtn');

    if (refreshCacheBtn && refreshCacheModal) {
        // Open Modal
        refreshCacheBtn.addEventListener('click', () => {
            const localDeltas = (window.IORI_CLICKS && window.IORI_CLICKS.load()) || {};
            const hasUnsyncedClicks = Object.values(localDeltas).some(value => (parseInt(value, 10) || 0) > 0);
            const warning = document.getElementById('refreshCacheUnsyncedWarning');
            if (warning) warning.classList.toggle('hidden', !hasUnsyncedClicks);
            refreshCacheModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });

        // Close Modal Helper
        const closeRefreshModal = () => {
            refreshCacheModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        };

        // Close Events
        if (closeRefreshCacheModal) closeRefreshCacheModal.onclick = closeRefreshModal;
        if (cancelRefreshCacheBtn) cancelRefreshCacheBtn.onclick = closeRefreshModal;
        refreshCacheModal.onclick = (e) => {
            if (e.target === refreshCacheModal) closeRefreshModal();
        };

        // Confirm Action
        if (confirmRefreshCacheBtn) {
            confirmRefreshCacheBtn.onclick = () => {
                confirmRefreshCacheBtn.disabled = true;
                const originalText = confirmRefreshCacheBtn.innerHTML;
                confirmRefreshCacheBtn.innerHTML = '<svg class="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 刷新中...';
                
                fetch('/api/cache/clear', { method: 'POST' })
                    .then(res => res.json())
                    .then(data => {
                        if (data.code === 200) {
                            // 如果返回了 clicksMap，全量覆盖本地 localStorage
                            if (data.clicksMap && window.IORI_CLICKS) {
                                window.IORI_CLICKS.overwrite(data.clicksMap);
                                window.showMessage('缓存刷新成功，已从数据库更新点击量', 'success');
                            } else {
                                window.showMessage('缓存刷新成功', 'success');
                            }
                            closeRefreshModal();
                        } else {
                            window.showMessage('缓存刷新失败: ' + data.message, 'error');
                        }
                    })
                    .catch(err => {
                        window.showMessage('网络错误', 'error');
                    })
                    .finally(() => {
                        confirmRefreshCacheBtn.disabled = false;
                        confirmRefreshCacheBtn.innerHTML = originalText;
                    });
            };
        }
    }

    // Sync Clicks Button Logic
    const syncClicksBtn = document.getElementById('syncClicksBtn');
    const syncClicksModal = document.getElementById('syncClicksModal');
    const closeSyncClicksModal = document.getElementById('closeSyncClicksModal');
    const cancelSyncClicksBtn = document.getElementById('cancelSyncClicksBtn');
    const confirmSyncClicksBtn = document.getElementById('confirmSyncClicksBtn');

    if (syncClicksBtn && syncClicksModal) {
        syncClicksBtn.addEventListener('click', () => {
            syncClicksModal.style.display = 'block';
            document.body.classList.add('modal-open');
        });

        const closeSyncModal = () => {
            syncClicksModal.style.display = 'none';
            document.body.classList.remove('modal-open');
        };

        if (closeSyncClicksModal) closeSyncClicksModal.onclick = closeSyncModal;
        if (cancelSyncClicksBtn) cancelSyncClicksBtn.onclick = closeSyncModal;
        syncClicksModal.onclick = (e) => {
            if (e.target === syncClicksModal) closeSyncModal();
        };

        if (confirmSyncClicksBtn) {
            confirmSyncClicksBtn.onclick = () => {
                confirmSyncClicksBtn.disabled = true;
                const originalText = confirmSyncClicksBtn.innerHTML;
                confirmSyncClicksBtn.innerHTML = '<svg class="animate-spin h-4 w-4 text-white inline mr-1" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 同步中...';

                // 从 localStorage 读取本地未同步点击增量
                const localDeltas = (window.IORI_CLICKS && window.IORI_CLICKS.load()) || {};
                const count = Object.keys(localDeltas).length;

                fetch('/api/clicks/sync', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ deltas: localDeltas })
                })
                    .then(res => res.json())
                    .then(data => {
                        if (data.code === 200) {
                            if (window.IORI_CLICKS) window.IORI_CLICKS.clearSynced(localDeltas);
                            window.showMessage(`同步成功！已提交 ${data.updated || count} 个站点的点击增量`, 'success');
                            closeSyncModal();
                        } else {
                            window.showMessage('同步失败: ' + data.message, 'error');
                        }
                    })
                    .catch(err => {
                        window.showMessage('同步失败（网络错误），本地数据已保留，可重试', 'error');
                    })
                    .finally(() => {
                        confirmSyncClicksBtn.disabled = false;
                        confirmSyncClicksBtn.innerHTML = originalText;
                    });
            };
        }
    }
});
