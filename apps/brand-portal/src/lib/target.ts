/**
 * `?redirect=` 解析 / 校验 / 落地 URL 组装。
 *
 * 流程：<门户>.autional.cn/ 裸根（无会话） → 本站（带 ?redirect=https://<门户>.autional.cn/）
 *       → 选品牌 → auth.autional.cn/<slug>/login?redirect=https://<门户>.autional.cn/<slug>/
 *
 * 校验复用 `isValidRedirect`（packages/shared/src/config/index.ts:339），
 * 白名单 = 门户表展开的 origin 集合 ⇒ 各门户 URL 天然合法，无需额外登记。
 */

import { getPortalUrl, isValidRedirect } from '@autional/shared';

/** auth 门户裸根（缺省目标）—— 选定 slug 后落到 <slug>/dashboard */
function defaultTarget(): string {
	return `${getPortalUrl('auth')}/`;
}

export interface IncomingTarget {
	/** 校验通过的原样目标，或 auth 门户缺省 */
	url: string;
	/** true = 来自 ?redirect=；false = 缺省 */
	explicit: boolean;
}

export function resolveIncomingTarget(search: string): IncomingTarget {
	const raw = new URLSearchParams(search).get('redirect');
	if (raw && isValidRedirect(raw)) return { url: raw, explicit: true };
	return { url: defaultTarget(), explicit: false };
}

/**
 * 裸根补 slug：`https://user.autional.cn/` → `https://user.autional.cn/demo/`。
 * 非裸根路径（已带 slug 的深链 / 无 slug 的门户深链）一律原样保留 ——
 * 后者按「无 slug 路径保持 404」口径处理，不做静默漏斗。
 *
 * 相对路径（`isValidRedirect` 允许的站内形式，如交棒链带过来的 `/oauth/...`）
 * 无 origin 可解析，仅裸根补 slug，其余原样返回；绝不抛异常（本函数在点击
 * 处理路径上，抛错即白屏）。
 */
export function withSlug(targetUrl: string, slug: string): string {
	if (targetUrl === '' || targetUrl === '/') return `/${slug}/`;
	if (targetUrl.startsWith('/')) return targetUrl;
	try {
		const u = new URL(targetUrl);
		if (u.pathname === '' || u.pathname === '/') {
			u.pathname = `/${slug}/`;
		}
		return u.href;
	} catch {
		return targetUrl;
	}
}

/** 登录完成后的落地 URL */
export function resolveLanding(incoming: IncomingTarget, slug: string): string {
	if (!incoming.explicit) return `${getPortalUrl('auth', slug)}/dashboard`;
	return withSlug(incoming.url, slug);
}

/** 目标门户的展示名（用于卡片副标题，缺省回落到主机名） */
export function describeTarget(incoming: IncomingTarget): string {
	try {
		return new URL(incoming.url).hostname;
	} catch {
		return incoming.url;
	}
}

/** 组装 auth 登录页 URL */
export function buildBrandLoginUrl(slug: string, landing: string): string {
	return `${getPortalUrl('auth', slug)}/login?redirect=${encodeURIComponent(landing)}`;
}
