// functions/admin/login.js

import { timingSafeEqual, checkLoginRateLimit, recordLoginFailure, clearLoginFailures, buildSessionCookie } from '../_middleware';

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

async function createAdminSession(env, ttl = 86400) {
  const token = crypto.randomUUID();
  await env.NAV_AUTH.put(`session_${token}`, Date.now().toString(), { expirationTtl: ttl });
  return token;
}

// 暴力破解防护配置
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 600; // 10 分钟

function renderLoginPage(message = '') {
  const hasError = Boolean(message);
  const safeMessage = hasError ? escapeHTML(message) : '';

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>管理员登录</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; padding: 0; font-family: Inter, "Noto Sans SC", system-ui, -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }
    body { display: flex; justify-content: center; align-items: center; background-color: #f6f5f4; padding: 1rem; }
    .login-container {
      background-color: #ffffff; padding: 2rem; border-radius: 12px;
      border: 1px solid #e5e3df;
      box-shadow: rgba(15, 15, 15, 0.08) 0px 4px 12px 0px; width: 100%; max-width: 380px;
      animation: fadeIn 0.5s ease-out;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .login-title { font-size: 1.75rem; font-weight: 600; text-align: center; margin: 0 0 1.5rem 0; color: #1a1a1a; letter-spacing: -0.02em; }
    .form-group { margin-bottom: 1.25rem; }
    label { display: block; margin-bottom: 0.5rem; font-weight: 500; color: #37352f; font-size: 0.875rem; }
    input[type="text"], input[type="password"], select {
      width: 100%; padding: 0.75rem 1rem; border: 1px solid #c8c4be; border-radius: 8px;
      font-size: 1rem; transition: border-color 0.15s, box-shadow 0.15s; min-height: 44px;
      background: #ffffff; color: #1a1a1a;
    }
    input:focus, select:focus { border-color: #5645d4; outline: none; box-shadow: 0 0 0 2px rgba(86, 69, 212, 0.2); }
    button {
      width: 100%; padding: 0.75rem 1.125rem; background-color: #5645d4; color: white; border: none;
      border-radius: 8px; font-size: 0.875rem; font-weight: 500; cursor: pointer; min-height: 44px;
      transition: background-color 0.15s, transform 0.1s;
    }
    button:hover { background-color: #4534b3; }
    button:active { transform: scale(0.98); }
    .error-message { color: #e03131; font-size: 0.875rem; margin-top: 0.5rem; text-align: center; }
    .back-link { display: block; text-align: center; margin-top: 1.5rem; color: #0075de; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="login-container">
    <h1 class="login-title">管理员登录</h1>
    <form method="post" action="/admin/login" novalidate>
      <div class="form-group">
        <label for="username">用户名</label>
        <input type="text" id="username" name="username" required autocomplete="username" autofocus>
      </div>
      <div class="form-group">
        <label for="password">密码</label>
        <input type="password" id="password" name="password" required autocomplete="current-password">
      </div>
      <div class="form-group">
        <label for="duration">登录有效期</label>
        <select id="duration" name="duration">
          <option value="1">1 天</option>
          <option value="7">7 天</option>
          <option value="30">30 天</option>
          <option value="60">60 天</option>
          <option value="90">90 天</option>
        </select>
      </div>
      ${hasError ? `<div class="error-message">${safeMessage}</div>` : ''}
      <button type="submit">登 录</button>
    </form>
    <a href="/" class="back-link">返回首页</a>
  </div>
  <script>
    const durationSelect = document.getElementById('duration');
    const savedDuration = localStorage.getItem('login_duration');
    if (savedDuration) {
        durationSelect.value = savedDuration;
    }
    document.querySelector('form').addEventListener('submit', function() {
      localStorage.setItem('login_duration', durationSelect.value);
    });
  </script>
</body>
</html>`;

  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    }
  });
}

// GET: 显示登录页面
export async function onRequestGet(context) {
  const { request } = context;
  const url = new URL(request.url);
  const error = url.searchParams.get('error');

  return renderLoginPage(error || '');
}

// POST: 处理登录提交
export async function onRequestPost(context) {
  const { request, env } = context;

  try {
    // 获取客户端 IP
    const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';

    // 暴力破解防护：检查 IP 是否被锁定
    const { locked } = await checkLoginRateLimit(env, ip, MAX_LOGIN_ATTEMPTS, LOCKOUT_SECONDS);
    if (locked) {
      return renderLoginPage('登录尝试过于频繁，请 10 分钟后再试');
    }

    const formData = await request.formData();
    const name = (formData.get('username') || '').trim();
    const password = (formData.get('password') || '').trim();
    const durationDays = parseInt(formData.get('duration') || '1', 10);
    const ttl = durationDays * 86400;

    if (!name || !password) {
      return renderLoginPage('请输入用户名和密码');
    }

    const storedUsername = await env.NAV_AUTH.get('admin_username');
    const storedPassword = await env.NAV_AUTH.get('admin_password');

    if (!storedUsername || !storedPassword) {
      console.error('Admin credentials not found in KV');
      return renderLoginPage('系统配置错误，请联系管理员');
    }

    // 使用恒定时间比较，防止时序攻击
    const isValid = timingSafeEqual(name, storedUsername) && timingSafeEqual(password, storedPassword);

    if (isValid) {
      // 登录成功：清除失败计数
      await clearLoginFailures(env, ip);
      const token = await createAdminSession(env, ttl);

      // 生成 CSRF token 并存入 KV，与 session 使用相同 TTL
      const csrfToken = crypto.randomUUID();
      await env.NAV_AUTH.put(`csrf_${token}`, csrfToken, { expirationTtl: ttl });

      return new Response(null, {
        status: 302,
        headers: {
          'Location': '/admin',
          'Set-Cookie': buildSessionCookie(token, { maxAge: ttl }),
        },
      });
    }

    // 登录失败：记录失败次数
    await recordLoginFailure(env, ip, MAX_LOGIN_ATTEMPTS, LOCKOUT_SECONDS);
    return renderLoginPage('账号或密码错误，请重试');
  } catch (e) {
    console.error('Login error:', e);
    return renderLoginPage('登录处理出错，请稍后重试');
  }
}
