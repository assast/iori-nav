// functions/api/clicks/sync.js
// 同步点击量到数据库：POST 接收本地未同步增量并累加到 DB
// 支持：{ deltas: { siteId: count, ... } }
import { isAdminAuthenticated, errorResponse, jsonResponse, markHomeCacheDirty } from '../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const body = await request.json();
    const deltasMap = body.deltas;

    if (!deltasMap || typeof deltasMap !== 'object' || Array.isArray(deltasMap)) {
      return errorResponse('Invalid clicks delta map: expected { siteId: count }', 400);
    }

    const validEntries = Object.entries(deltasMap).reduce((items, [siteId, clicks]) => {
      const id = parseInt(siteId, 10);
      if (!Number.isInteger(id) || id <= 0) return items;
      const count = Math.max(0, parseInt(clicks, 10) || 0);
      if (count <= 0) return items;
      items.push([id, count]);
      return items;
    }, []);

    if (validEntries.length === 0) {
      return jsonResponse({ code: 200, message: '无有效数据需要同步', updated: 0 });
    }

    // 逐站累加未同步增量（D1 batch 有 100 条限制，分批执行）
    const BATCH_SIZE = 50;
    let updated = 0;

    for (let i = 0; i < validEntries.length; i += BATCH_SIZE) {
      const batch = validEntries.slice(i, i + BATCH_SIZE);
      const statements = batch.map(([siteId, clicks]) => {
        return env.NAV_DB.prepare('UPDATE sites SET clicks = coalesce(clicks, 0) + ? WHERE id = ?').bind(clicks, siteId);
      });

      if (statements.length > 0) {
        const results = await env.NAV_DB.batch(statements);
        updated += results.reduce((sum, result) => sum + (result.meta?.changes || 0), 0);
      }
    }

    // 标记首页缓存 dirty，使下次渲染带上最新 clicks
    await markHomeCacheDirty(env, 'all');

    return jsonResponse({
      code: 200,
      message: `成功同步 ${updated} 个站点的点击增量`,
      updated
    });
  } catch (e) {
    return errorResponse(`Sync failed: ${e.message}`, 500);
  }
}
