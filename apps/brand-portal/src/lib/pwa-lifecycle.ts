const UPDATE_INTERVAL_MS = 30 * 60 * 1000;
const RELOAD_GUARD_MS = 60 * 1000;
const UPDATE_RELOAD_KEY = 'autional:brand-pwa-update-reload-at';

/** 可承载未提交输入的控件类型；select 恒有值，不参与判断。 */
const TEXT_INPUT_TYPES = new Set([
  'text',
  'search',
  'tel',
  'url',
  'email',
  'password',
  'number',
  'date',
  'datetime-local',
  'month',
  'time',
  'week',
]);

/**
 * PWA 生命周期：
 * - 部署后旧页面可能引用已清理的懒加载 chunk → 捕获 vite:preloadError，最多重载一次。
 * - 前台/每 30 分钟主动检查 SW 更新；新版本经 skipWaiting + clientsClaim 立即接管，
 *   接管后自动整页重载。
 * - 品牌入口不从 URL 消费一次性凭据（?redirect= 重载后原样保留），
 *   但有未提交的搜索输入时不重载。
 */
export function setupPwaLifecycle(reload: () => void = () => window.location.reload()): void {
  if (typeof window === 'undefined') return;
  setupPreloadRecovery(reload);
  setupUpdateReload(reload);
  setupUpdateChecks();
}

/** 有未提交的文本输入时暂不重载：避免清空用户正在输入的租户搜索。 */
function hasUnsavedTextInput(): boolean {
  for (const el of document.querySelectorAll('input, textarea, [contenteditable="true"]')) {
    if (el instanceof HTMLInputElement) {
      if (!el.disabled && !el.readOnly && TEXT_INPUT_TYPES.has(el.type) && el.value !== '') {
        return true;
      }
    } else if (el instanceof HTMLTextAreaElement) {
      if (!el.disabled && !el.readOnly && el.value !== '') return true;
    } else if (el instanceof HTMLElement && el.isContentEditable && el.textContent?.trim()) {
      return true;
    }
  }
  return false;
}

function setupUpdateReload(reload: () => void): void {
  if (!('serviceWorker' in navigator)) return;

  // 首访页面未受控：clientsClaim 带来的第一次 controllerchange 是首次接管，不是版本更新。
  let sawController = Boolean(navigator.serviceWorker.controller);

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!sawController) {
      sawController = true;
      return;
    }
    if (hasUnsavedTextInput()) return;
    try {
      const lastReloadAt = Number(window.sessionStorage.getItem(UPDATE_RELOAD_KEY) ?? 0);
      if (Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < RELOAD_GUARD_MS) return;
      window.sessionStorage.setItem(UPDATE_RELOAD_KEY, String(Date.now()));
    } catch {
      // 存储不可用：宁可保留旧页，也不冒重载循环的风险。
      return;
    }
    reload();
  });
}

function setupPreloadRecovery(reload: () => void): void {
  const storageKey = 'autional:brand-pwa-preload-reload-at';
  window.addEventListener('vite:preloadError', (event) => {
    event.preventDefault();
    try {
      const lastReloadAt = Number(window.sessionStorage.getItem(storageKey) ?? 0);
      if (Number.isFinite(lastReloadAt) && Date.now() - lastReloadAt < RELOAD_GUARD_MS) return;
      window.sessionStorage.setItem(storageKey, String(Date.now()));
    } catch {
      // 存储不可用：宁可保留错误，也不冒重载循环的风险。
      return;
    }
    reload();
  });
}

function setupUpdateChecks(): void {
  if (!('serviceWorker' in navigator)) return;

  let checking = false;
  const check = () => {
    if (checking || document.visibilityState !== 'visible') return;
    checking = true;
    navigator.serviceWorker
      .getRegistration()
      .then((registration) => registration?.update())
      .catch(() => {
        // 离线或注册尚未就绪：下一轮再试。
      })
      .finally(() => {
        checking = false;
      });
  };

  window.addEventListener('focus', check);
  window.addEventListener('online', check);
  document.addEventListener('visibilitychange', check);
  window.setInterval(check, UPDATE_INTERVAL_MS);
  navigator.serviceWorker.ready.then(check).catch(() => {});
}
