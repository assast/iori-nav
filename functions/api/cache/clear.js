import { isAdminAuthenticated, errorResponse, jsonResponse, clearHomeCache, clearHomeCacheDirty } from '../../_middleware';

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    await clearHomeCache(env, 'all');
    await clearHomeCacheDirty(env, 'all');

    // 从 DB 读取所有站点的 clicks 映射，供前端全量覆盖 localStorage
    let clicksMap = {};
    try {
      const { results } = await env.NAV_DB.prepare('SELECT id, clicks FROM sites').all();
      if (results && results.length > 0) {
        for (const row of results) {
          clicksMap[String(row.id)] = row.clicks || 0;
        }
      }
    } catch (e) {
      console.warn('Failed to read clicks map:', e);
    }

    const response = jsonResponse({
      code: 200,
      message: '首页缓存已清除',
      clicksMap
    });
    // Clear stale cookie to prevent auto-refresh loop if any
    response.headers.append('Set-Cookie', 'iori_cache_stale=; Path=/; Max-Age=0; SameSite=Lax');
    response.headers.append('Set-Cookie', 'iori_cache_public_stale=; Path=/; Max-Age=0; SameSite=Lax');
    response.headers.append('Set-Cookie', 'iori_cache_private_stale=; Path=/; Max-Age=0; SameSite=Lax');
    return response;
  } catch (e) {
    return errorResponse(`Failed to clear cache: ${e.message}`, 500);
  }
}
