/**
 * 下一跳文档预取（品牌选择 → auth 登录是**整页跨站导航**）。
 *
 * 为什么只预取文档、不预取 JS：跳转目标 `auth.<域>/<slug>/login?redirect=…` 的资源哈希
 * 只有 auth 自己知道，品牌站无权假设；预取 HTML 已能把那次导航的 TTFB 抹掉
 * （实测 auth HTML TTFB 0.33–0.56s），连接的 DNS+TCP+TLS 由 index.html 的 preconnect 预热。
 *
 * 纪律：
 * - **同 URL 只预取一次**（按 DOM 里已有的 prefetch link 去重，不用模块级全局状态）。
 * - 省流量场景（`saveData` 或 2G/3G）整体跳过：预取是锦上添花，不该抢用户的流量。
 * - 不设 `crossorigin`：跟随浏览器默认凭据语义，避免预取到的响应在导航时因凭据不匹配而作废。
 */

const SLOW_TYPES = new Set(['slow-2g', '2g', '3g']);

function shouldSkip(): boolean {
	const connection = (navigator as Navigator & {
		connection?: { saveData?: boolean; effectiveType?: string };
	}).connection;
	if (connection?.saveData) return true;
	return Boolean(connection?.effectiveType && SLOW_TYPES.has(connection.effectiveType));
}

function alreadyPrefetched(absoluteHref: string): boolean {
	for (const link of document.querySelectorAll<HTMLLinkElement>('link[rel="prefetch"]')) {
		if (link.href === absoluteHref) return true;
	}
	return false;
}

/** 预取一个文档地址（hover / focus 时调用）；任何异常都静默，绝不影响点击本身。 */
export function prefetchDocument(href: string): void {
	if (typeof document === 'undefined' || !href) return;
	let absolute: string;
	try {
		absolute = new URL(href, window.location.href).href;
	} catch {
		return;
	}
	if (!absolute.startsWith('http')) return;
	if (shouldSkip() || alreadyPrefetched(absolute)) return;
	const link = document.createElement('link');
	link.rel = 'prefetch';
	link.as = 'document';
	link.href = absolute;
	document.head.appendChild(link);
}
