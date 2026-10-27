import { useCallback, useMemo, useState } from 'react';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { apiClient, extractList } from '@autional/shared';
import {
	tenantPublicTenants,
	tenantPublicTenantsByTenants,
} from '@autional/shared/generated/api';
import { extractBrandingFields } from './branding';
import { createLimiter } from './concurrency';

/* 列表与品牌分两条查询：列表先到先渲染；品牌按 slug 逐条查询，react-query 按 key 去重 + 各自缓存。
   默认视图只展示运营精选（服务端序，Featured）+ 最近访问；其余租户经服务端搜索分页查找。 */

/** 列表项（后端 PublicTenantInfo 直出 snake_case，apiClient 转 camelCase，两种键都兜） */
interface RawTenant {
	id: string;
	name?: string;
	display_name?: string;
	displayName?: string;
	slug?: string;
}

export interface TenantBase {
	id: string;
	/** 即租户 slug —— 后端 GetPublicTenant 走 GetByName(ctx, slug)，故 name 就是 slug */
	slug: string;
	displayName: string;
}

export interface TenantBranding {
	logoUrl: string;
	primaryColor: string;
	secondaryColor: string;
	companyName: string;
}

export const EMPTY_BRANDING: TenantBranding = {
	logoUrl: '',
	primaryColor: '',
	secondaryColor: '',
	companyName: '',
};

const TTL = 6 * 60 * 60 * 1000; // 6h，与 auth 侧 PUBLIC_TENANTS 同口径
export const FT_KEY = 'brand-portal:featured-tenants';
export const RECENT_KEY = 'brand-portal:recent-tenants';
export const RECENT_CAP = 6;
export const SEARCH_PAGE_SIZE = 20;
export const MIN_SEARCH_CHARS = 2;
/** 与服务端 domain.MaxFeaturedTenants 一致（服务端硬上限，前端不切片） */
export const FEATURED_CAP = 24;
const BRANDING_PREFIX = 'brand-portal:branding:';
const PUBLIC_TENANTS_PATH = '/tenant/api/v1/tenant/public/tenants';

// ─── localStorage 缓存（读时同步，首屏零等待） ───

function readCache<T>(key: string): T | null {
	try {
		const raw = localStorage.getItem(key);
		if (!raw) return null;
		const entry = JSON.parse(raw) as { data: T };
		return entry?.data ?? null;
	} catch {
		return null;
	}
}

function writeCache<T>(key: string, data: T): void {
	try {
		localStorage.setItem(key, JSON.stringify({ data, _ts: Date.now() }));
	} catch {
		/* storage full or unavailable */
	}
}

function mapTenant(t: RawTenant): TenantBase {
	const slug = t.name || t.slug || '';
	return { id: t.id, slug, displayName: t.display_name || t.displayName || slug };
}

// ─── 精选（默认视图数据源；服务端序，不做客户端排序） ───

export function useFeaturedTenants() {
	return useQuery<TenantBase[]>({
		queryKey: [FT_KEY],
		queryFn: async () => {
			const res = await apiClient.get(PUBLIC_TENANTS_PATH, { params: { featured: true } });
			const items = extractList<RawTenant>(res.data)
				.map(mapTenant)
				.filter((t) => t.slug);
			writeCache(FT_KEY, items);
			return items;
		},
		staleTime: TTL,
		gcTime: TTL * 2,
		placeholderData: () => readCache<TenantBase[]>(FT_KEY) ?? undefined,
	});
}

// ─── 搜索（服务端分页，纯内存，不落 localStorage） ───

export interface TenantSearchPage {
	items: TenantBase[];
	total: number;
	hasNext: boolean;
	/** 本页页码（1 基），getNextPageParam 依赖 */
	page: number;
}

export async function fetchTenantPage(keyword: string, page: number): Promise<TenantSearchPage> {
	const res = await apiClient.get(PUBLIC_TENANTS_PATH, {
		params: { keyword, page, pageSize: SEARCH_PAGE_SIZE },
	});
	const payload = res.data as Record<string, unknown> | undefined;
	const items = extractList<RawTenant>(payload)
		.map(mapTenant)
		.filter((t) => t.slug);
	const pagination = (payload?.pagination ?? {}) as Record<string, unknown>;
	const total = Number(payload?.total ?? pagination.total ?? items.length) || 0;
	const hasNextRaw =
		pagination.has_next ?? pagination.hasNext ?? payload?.has_next ?? payload?.hasNext;
	const hasNext =
		typeof hasNextRaw === 'boolean' ? hasNextRaw : page * SEARCH_PAGE_SIZE < total;
	return { items, total, hasNext, page };
}

export function useSearchTenants(keyword: string) {
	const kw = keyword.trim();
	return useInfiniteQuery({
		queryKey: ['brand-portal:search-tenants', kw],
		queryFn: ({ pageParam }) => fetchTenantPage(kw, pageParam),
		initialPageParam: 1,
		getNextPageParam: (last) => (last.hasNext ? last.page + 1 : undefined),
		enabled: kw.length >= MIN_SEARCH_CHARS,
		staleTime: 60_000,
	});
}

// ─── 单租户条件探针（featured ≤1 时才启用；不写缓存——跳转判定必须新鲜） ───

export function useSingleTenantProbe(enabled: boolean) {
	return useQuery<TenantBase[]>({
		queryKey: ['brand-portal:single-tenant-probe'],
		queryFn: async () => {
			const res = await tenantPublicTenants();
			return extractList<RawTenant>(res)
				.map(mapTenant)
				.filter((t) => t.slug);
		},
		staleTime: 60_000,
		enabled,
	});
}

// ─── 最近访问（localStorage，无 TTL，容量即淘汰） ───

export interface RecentTenant {
	slug: string;
	displayName: string;
	ts: number;
}

/** 新→旧、按 slug 去重提前、上限 RECENT_CAP（纯函数，便于测试） */
export function mergeRecent(
	prev: RecentTenant[],
	tenant: { slug: string; displayName: string },
	ts = Date.now(),
): RecentTenant[] {
	return [
		{ slug: tenant.slug, displayName: tenant.displayName, ts },
		...prev.filter((r) => r.slug !== tenant.slug),
	].slice(0, RECENT_CAP);
}

export function useRecentTenants() {
	const [recent, setRecent] = useState<RecentTenant[]>(
		() => readCache<RecentTenant[]>(RECENT_KEY) ?? [],
	);
	const recordRecent = useCallback((tenant: { slug: string; displayName: string }) => {
		setRecent((prev) => {
			const next = mergeRecent(prev, tenant);
			writeCache(RECENT_KEY, next);
			return next;
		});
	}, []);
	return { recent, recordRecent };
}

// ─── 品牌（仅精选卡与最近访问触发；零改动） ───

const limitBranding = createLimiter(8);

/** 品牌拉取失败不影响整表：回落空品牌（卡片退化为首字母色块） */
async function fetchBrandingSafe(slug: string): Promise<TenantBranding> {
	try {
		const res = await tenantPublicTenantsByTenants(slug);
		const b = extractBrandingFields(res);
		return {
			logoUrl: b?.logoUrl ?? '',
			primaryColor: b?.primaryColor ?? '',
			secondaryColor: b?.secondaryColor ?? '',
			companyName: b?.companyName ?? '',
		};
	} catch {
		return EMPTY_BRANDING;
	}
}

export function useTenantBranding(slug: string, options: { enabled?: boolean } = {}) {
	const cacheKey = `${BRANDING_PREFIX}${slug}`;
	return useQuery<TenantBranding>({
		queryKey: ['tenant-branding', slug],
		queryFn: async () => {
			const data = await limitBranding(() => fetchBrandingSafe(slug));
			writeCache(cacheKey, data);
			return data;
		},
		staleTime: TTL,
		gcTime: TTL * 2,
		// 批量接口已给出品牌时（enabled:false）不再逐卡请求；批量失败才退回这里。
		enabled: Boolean(slug) && options.enabled !== false,
		placeholderData: () => readCache<TenantBranding>(cacheKey) ?? undefined,
	});
}

// ─── 批量品牌（首屏一次请求；服务端支持 featured=true 与 slugs=a,b,c 并集） ───

/** 与服务端 publicBrandingMaxSlugs 对齐 */
const BRANDING_BATCH_MAX = 50;
const BRANDING_BATCH_PATH = '/tenant/api/v1/tenant/public/tenants/branding';

/** 批量入参规范化：去空、去重、排序（保证同一集合命中同一查询键）、截断到服务端上限。 */
export function normalizeBrandingSlugs(slugs: string[]): string[] {
	return Array.from(new Set(slugs.filter(Boolean)))
		.sort()
		.slice(0, BRANDING_BATCH_MAX);
}

interface RawBranding {
	slug?: string;
	name?: string;
	logo_url?: string;
	logoUrl?: string;
	primary_color?: string;
	primaryColor?: string;
	secondary_color?: string;
	secondaryColor?: string;
	company_name?: string;
	companyName?: string;
}

/** 后端 snake_case / 中间层 camelCase 两种键都兜（与列表解析口径一致）。 */
export function mapBranding(raw: RawBranding): TenantBranding {
	return {
		logoUrl: raw.logo_url || raw.logoUrl || '',
		primaryColor: raw.primary_color || raw.primaryColor || '',
		secondaryColor: raw.secondary_color || raw.secondaryColor || '',
		companyName: raw.company_name || raw.companyName || '',
	};
}

/**
 * 一次取回多租户品牌（替代首屏「每卡一次 /tenants/{slug}」）。
 * 命中服务端 300s HTTP 缓存；浏览器侧 staleTime 6h，并把每条结果写回单租户缓存，
 * 供逐卡回退路径复用。
 */
export function useTenantBrandings(slugs: string[]) {
	const key = useMemo(() => normalizeBrandingSlugs(slugs).join(','), [slugs]);
	return useQuery<Record<string, TenantBranding>>({
		queryKey: ['tenant-branding-batch', key],
		queryFn: async () => {
			const res = await apiClient.get(BRANDING_BATCH_PATH, { params: { slugs: key } });
			const out: Record<string, TenantBranding> = {};
			for (const raw of extractList<RawBranding>(res.data)) {
				const slug = raw.slug || raw.name || '';
				if (!slug) continue;
				const branding = mapBranding(raw);
				out[slug] = branding;
				writeCache(`${BRANDING_PREFIX}${slug}`, branding);
			}
			return out;
		},
		staleTime: TTL,
		gcTime: TTL * 2,
		enabled: key.length > 0,
		// retry 策略由 main.tsx 的 QueryClient 默认（isRetryableError）单点决定；
		// 此处不得写 per-query 覆盖（会把 4xx 也纳入重试，见 2026-10-14 事故）。
	});
}
