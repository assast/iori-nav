// functions/api/config/[id].js
import { isAdminAuthenticated, errorResponse, jsonResponse, normalizeSortOrder, markHomeCacheDirty } from '../../_middleware';
import { buildFaviconUrl } from '../../lib/utils';


export async function onRequestGet(context) {
  const { request, env, params } = context;
  const id = params.id;
  const { results } = await env.NAV_DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).all();
  if (results.length === 0) {
    return errorResponse('config not found', 404);
  }
  const config = results[0];
  
  // 私密站点需要认证才能访问
  if (config.is_private && !(await isAdminAuthenticated(request, env))) {
    return errorResponse('config not found', 404);
  }
  
  return jsonResponse({
    code: 200,
    data: config
  });
}

export async function onRequestPut(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }
  
  try {
    const existing = await env.NAV_DB.prepare('SELECT * FROM sites WHERE id = ?').bind(id).first();
    if (!existing) {
      return errorResponse('config not found', 404);
    }

    const config = await request.json();
    const { name, url, logo, desc, catelog_id, sort_order, is_private, clicks } = config;

    // Support partial updates: use existing values when field is not provided
    const sanitizedName = name !== undefined ? String(name).trim() : existing.name;
    const sanitizedUrl = url !== undefined ? String(url).trim() : existing.url;
    let sanitizedLogo = logo !== undefined ? (String(logo).trim() || null) : existing.logo;
    const sanitizedDesc = desc !== undefined ? (String(desc).trim() || null) : existing.desc;
    const sortOrderValue = sort_order !== undefined ? normalizeSortOrder(sort_order) : existing.sort_order;
    const isPrivateValue = is_private !== undefined ? (is_private ? 1 : 0) : existing.is_private;
    const clicksValue = clicks !== undefined ? Math.max(0, parseInt(clicks, 10) || 0) : (existing.clicks || 0);
    const finalCatelogId = catelog_id !== undefined ? catelog_id : existing.catelog_id;

    if (!sanitizedName || !sanitizedUrl || !finalCatelogId) {
      return errorResponse('Name, URL and Catelog are required', 400);
    }
    const iconAPI = env.ICON_API || 'https://faviconsnap.com/api/favicon?url=';
    if (logo !== undefined || url !== undefined) {
      sanitizedLogo = buildFaviconUrl(sanitizedUrl, sanitizedLogo, iconAPI);
    }

    // Fetch category name
    const categoryResult = await env.NAV_DB.prepare('SELECT catelog, is_private FROM category WHERE id = ?').bind(finalCatelogId).first();
    const catelogName = categoryResult ? categoryResult.catelog : 'Unknown';

    // If category is private, force site to be private
    let finalIsPrivate = isPrivateValue;
    if (categoryResult && categoryResult.is_private === 1) {
        finalIsPrivate = 1;
    }

    const update = await env.NAV_DB.prepare(`
      UPDATE sites
      SET name = ?, url = ?, logo = ?, desc = ?, catelog_id = ?, catelog_name = ?, sort_order = ?, is_private = ?, clicks = ?, update_time = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(sanitizedName, sanitizedUrl, sanitizedLogo, sanitizedDesc, finalCatelogId, catelogName, sortOrderValue, finalIsPrivate, clicksValue, id).run();

    const dirtyScope = (existing.is_private === 1 && finalIsPrivate === 1) ? 'private' : 'all';
    await markHomeCacheDirty(env, dirtyScope);

    return jsonResponse({
      code: 200,
      message: 'Config updated successfully',
      update
    });
  } catch (e) {
    return errorResponse(`Failed to update config: ${e.message}`, 500);
  }
}

export async function onRequestDelete(context) {
  const { request, env, params } = context;
  const id = params.id;

  if (!(await isAdminAuthenticated(request, env))) {
    return errorResponse('Unauthorized', 401);
  }

  try {
    const existing = await env.NAV_DB.prepare('SELECT id, is_private FROM sites WHERE id = ?').bind(id).first();
    if (!existing) {
      return errorResponse('config not found', 404);
    }

    const del = await env.NAV_DB.prepare('DELETE FROM sites WHERE id = ?').bind(id).run();

    await markHomeCacheDirty(env, existing.is_private ? 'private' : 'all');

    return jsonResponse({
      code: 200,
      message: 'Config deleted successfully',
      del
    });
  } catch (e) {
    return errorResponse(`Failed to delete config: ${e.message}`, 500);
  }
}
