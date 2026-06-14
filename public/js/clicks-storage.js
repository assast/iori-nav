// 点击量本地存储工具
(function () {
  const CLICKS_STORAGE_KEY = 'iori_click_deltas';
  const LEGACY_CLICKS_STORAGE_KEY = 'iori_clicks';

  function loadLocalClicks() {
    try {
      const raw = localStorage.getItem(CLICKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function saveLocalClicks(map) {
    try {
      localStorage.setItem(CLICKS_STORAGE_KEY, JSON.stringify(map));
    } catch (e) { console.warn('Failed to save clicks:', e); }
  }

  function loadLegacyClicks() {
    try {
      const raw = localStorage.getItem(LEGACY_CLICKS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch { return {}; }
  }

  function clearLegacyClicks() {
    try {
      localStorage.removeItem(LEGACY_CLICKS_STORAGE_KEY);
    } catch { }
  }

  function normalizeClicks(value) {
    return Math.max(0, parseInt(value, 10) || 0);
  }

  function migrateLegacyClicks(allSites) {
    const legacyClicks = loadLegacyClicks();
    if (!legacyClicks || Object.keys(legacyClicks).length === 0) return;

    const currentDeltas = loadLocalClicks();
    let didMigrate = false;
    allSites.forEach(site => {
      const key = String(site.id);
      const legacyVal = normalizeClicks(legacyClicks[key]);
      const dbVal = normalizeClicks(site.clicks);
      const delta = Math.max(0, legacyVal - dbVal);
      if (delta > 0) {
        currentDeltas[key] = normalizeClicks(currentDeltas[key]) + delta;
        didMigrate = true;
      }
    });

    if (didMigrate) saveLocalClicks(currentDeltas);
    clearLegacyClicks();
  }

  function setClick(siteId, clicks) {
    const map = loadLocalClicks();
    map[String(siteId)] = normalizeClicks(clicks);
    saveLocalClicks(map);
  }

  function incrementClick(siteId) {
    const map = loadLocalClicks();
    const key = String(siteId);
    map[key] = normalizeClicks(map[key]) + 1;
    saveLocalClicks(map);
  }

  // 合并 DB clicks 与本地未同步增量，得到真实总点击量
  function mergeClicks(allSites) {
    migrateLegacyClicks(allSites);
    const localClicks = loadLocalClicks();
    return allSites.map(site => {
      const key = String(site.id);
      const dbVal = normalizeClicks(site.clicks);
      const deltaVal = normalizeClicks(localClicks[key]);
      return { ...site, clicks: dbVal + deltaVal };
    });
  }

  // DB clicks 已刷新到页面时，清空本地未同步增量
  function overwriteLocalClicks() {
    saveLocalClicks({});
  }

  function clearSyncedClicks(syncedMap) {
    const map = loadLocalClicks();
    Object.entries(syncedMap || {}).forEach(([siteId, clicks]) => {
      const key = String(siteId);
      const remaining = normalizeClicks(map[key]) - normalizeClicks(clicks);
      if (remaining > 0) {
        map[key] = remaining;
      } else {
        delete map[key];
      }
    });
    saveLocalClicks(map);
  }

  window.IORI_CLICKS = {
    load: loadLocalClicks,
    save: saveLocalClicks,
    set: setClick,
    increment: incrementClick,
    merge: mergeClicks,
    overwrite: overwriteLocalClicks,
    clearSynced: clearSyncedClicks,
    STORAGE_KEY: CLICKS_STORAGE_KEY,
    LEGACY_STORAGE_KEY: LEGACY_CLICKS_STORAGE_KEY,
  };
})();
