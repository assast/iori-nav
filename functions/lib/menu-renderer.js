// functions/lib/menu-renderer.js
// 渲染分类菜单 HTML（水平 + 垂直）

import { escapeHTML } from './utils';

/**
 * 渲染水平导航菜单
 * @param {Array} cats - 分类树
 * @param {string} currentCatalogName - 当前选中的分类名
 * @returns {string} HTML 字符串
 */
export function renderHorizontalMenu(cats, currentCatalogName) {
    if (!cats || cats.length === 0) return '';
    return _renderHorizontalItems(cats, currentCatalogName, 0);
}

function _renderHorizontalItems(cats, currentCatalogName, level) {
    return cats.map(cat => {
        const isActive = currentCatalogName === cat.catelog;
        const hasChildren = cat.children && cat.children.length > 0;
        const safeName = escapeHTML(cat.catelog);
        const encodedName = encodeURIComponent(cat.catelog);
        const linkUrl = `?catalog=${encodedName}`;

        const isRoot = level === 0;
        const activeClass = isActive ? 'active' : (isRoot ? 'inactive' : '');
        const navItemActiveClass = isActive ? 'nav-item-active' : '';
        const wrapperClass = isRoot ? 'menu-item-wrapper relative inline-block text-left' : 'menu-item-wrapper relative block w-full';
        const linkClass = isRoot ? `nav-btn ${activeClass} ${navItemActiveClass}` : `dropdown-item ${activeClass} ${navItemActiveClass}`;
        const arrowSvg = hasChildren
            ? (isRoot
                ? '<svg class="w-3 h-3 ml-1 opacity-70"><use href="#icon-chevron-down"/></svg>'
                : '<svg class="dropdown-arrow-icon"><use href="#icon-chevron-right"/></svg>')
            : '';
        const childrenHtml = hasChildren ? `<div class="dropdown-menu">${_renderHorizontalItems(cat.children, currentCatalogName, level + 1)}</div>` : '';

        return `<div class="${wrapperClass}"><a href="${linkUrl}" class="${linkClass}" data-id="${cat.id}">${safeName}${arrowSvg}</a>${childrenHtml}</div>`;
    }).join('');
}

/**
 * 判断节点子树中是否包含当前选中分类（不含自身）
 */
function _hasActiveDescendant(cat, currentCatalogName) {
    if (!currentCatalogName || !cat.children || cat.children.length === 0) return false;
    return cat.children.some(child =>
        child.catelog === currentCatalogName || _hasActiveDescendant(child, currentCatalogName)
    );
}

/**
 * 渲染垂直侧边栏菜单（纸质编辑风：缩进 + 可折叠）
 * 默认只展示一级分类（全部折叠）；选中分类在更深层级时沿路径展开以保证可见
 * 客户端会再叠加「记住展开状态」与「展开到二级 / 全部收起」
 * @param {Array} cats - 分类树
 * @param {string} currentCatalogName - 当前选中的分类名
 * @param {boolean} [_isCustomWallpaper] - 兼容旧调用，不再影响样式
 * @returns {string} HTML 字符串
 */
export function renderVerticalMenu(cats, currentCatalogName, _isCustomWallpaper) {
    return _renderVerticalItems(cats, currentCatalogName, 0);
}

function _renderVerticalItems(cats, currentCatalogName, level) {
    return cats.map(cat => {
        const safeName = escapeHTML(cat.catelog);
        const encodedName = encodeURIComponent(cat.catelog);
        const isActive = currentCatalogName === cat.catelog;
        const activeClass = isActive ? 'is-active' : '';
        const hasChildren = cat.children && cat.children.length > 0;
        // 默认折叠；仅当选中项在子树中时强制展开路径（深链 SSR）
        const isExpanded = hasChildren && _hasActiveDescendant(cat, currentCatalogName);

        const toggleHtml = hasChildren
            ? `<button type="button" class="sidebar-nav-toggle" data-toggle-id="${cat.id}" aria-expanded="${isExpanded ? 'true' : 'false'}" aria-label="${isExpanded ? '收起' : '展开'}${safeName}"><svg class="sidebar-nav-toggle-icon" aria-hidden="true"><use href="#icon-chevron-right"/></svg></button>`
            : `<span class="sidebar-nav-toggle-spacer" aria-hidden="true"></span>`;

        const childrenHtml = hasChildren
            ? `<div class="sidebar-nav-children"${isExpanded ? '' : ' hidden'} data-parent-id="${cat.id}">${_renderVerticalItems(cat.children, currentCatalogName, level + 1)}</div>`
            : '';

        return `<div class="sidebar-nav-item${hasChildren ? (isExpanded ? ' is-expanded' : ' is-collapsed') : ''}" data-depth="${level}" data-id="${cat.id}">` +
            `<div class="sidebar-nav-row">` +
            toggleHtml +
            `<a href="?catalog=${encodedName}" data-id="${cat.id}" class="sidebar-nav-link ${activeClass}" style="--nav-depth: ${level}" data-depth="${level}"><span class="sidebar-nav-label">${safeName}</span></a>` +
            `</div>` +
            childrenHtml +
            `</div>`;
    }).join('');
}
