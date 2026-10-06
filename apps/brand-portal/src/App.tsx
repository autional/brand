import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, Inbox, Loader2, Search, X } from 'lucide-react';
import { getPortalUrl } from '@autional/shared';
import { ThemeProvider, ThemeToggle } from '@autional/ui';
import { I18nProvider, useI18n } from '@/lib/i18n';
import {
	MIN_SEARCH_CHARS,
	useFeaturedTenants,
	useRecentTenants,
	useSearchTenants,
	useSingleTenantProbe,
	type TenantBase,
} from '@/lib/tenants';
import { useDebouncedValue } from '@/lib/use-debounce';
import {
	buildBrandLoginUrl,
	resolveIncomingTarget,
	resolveLanding,
	type IncomingTarget,
} from '@/lib/target';
import { BrandGrid } from '@/components/BrandGrid';
import { EmptyState } from '@/components/EmptyState';
import { RecentTenants } from '@/components/RecentTenants';
import { SearchResults } from '@/components/SearchResults';

function LangSwitch() {
	const { lang, setLang, t } = useI18n();
	return (
		<button
			type="button"
			onClick={() => setLang(lang === 'zh-CN' ? 'en-US' : 'zh-CN')}
			aria-label={t('header.langLabel')}
			className="brand-button-secondary !px-4 !py-2 !text-xs"
		>
			{lang === 'zh-CN' ? 'EN' : '中文'}
		</button>
	);
}

function SiteHeader() {
	const { t } = useI18n();
	return (
		<header className="sticky top-0 z-20 border-b border-primary-100 bg-white/80 backdrop-blur-xl dark:border-white/10 dark:bg-primary-900">
			<div className="mx-auto flex h-[var(--layout-header-height)] max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
				<div className="flex items-center gap-3">
					<img src="/logo-mark.svg" alt="" className="h-9 w-9" aria-hidden="true" />
					<div className="leading-tight">
						<p className="text-sm font-semibold text-primary-900 dark:text-white">
							{t('header.brand')}
						</p>
						<p className="text-xs text-neutral-500 dark:text-sky-200">
							{t('header.tagline')}
						</p>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<ThemeToggle
						className="brand-button-secondary !px-3 !py-2"
						iconSize={16}
						labelLight={t('theme.switchToLight')}
						labelDark={t('theme.switchToDark')}
					/>
					<LangSwitch />
				</div>
			</div>
		</header>
	);
}

function SiteFooter() {
	const { t } = useI18n();
	const links = [
		{ label: t('footer.privacy'), href: `${getPortalUrl('auth')}/privacy` },
		{ label: t('footer.terms'), href: `${getPortalUrl('auth')}/terms` },
		{ label: t('footer.trust'), href: getPortalUrl('trust') },
	];
	return (
		<footer className="mt-16 border-t border-primary-100 dark:border-white/10">
			<div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 py-8 text-xs text-neutral-500 sm:flex-row sm:px-6 dark:text-neutral-400">
				<p>© {new Date().getFullYear()} Autional</p>
				<nav className="flex items-center gap-5">
					{links.map((l) => (
						<a
							key={l.label}
							href={l.href}
							className="transition hover:text-primary-700 dark:hover:text-sky-300"
						>
							{l.label}
						</a>
					))}
				</nav>
			</div>
		</footer>
	);
}

/** 加载块（精选首载 / 单租户跳转中共用，零新样式） */
function LoadingBlock({ label }: { label: string }) {
	return (
		<div className="flex flex-col items-center gap-3 py-16 text-neutral-500 dark:text-neutral-400">
			<Loader2 className="h-6 w-6 animate-spin text-primary-600 dark:text-sky-300" aria-hidden="true" />
			<p className="text-sm">{label}</p>
		</div>
	);
}

function BrandPortal() {
	const { t } = useI18n();
	const [keyword, setKeyword] = useState('');
	const inputRef = useRef<HTMLInputElement>(null);

	// 输入驱动 UI（提示/清除）；查询走防抖值。清除立即回默认视图（不发请求）。
	const debouncedKeyword = useDebouncedValue(keyword, 300);
	const trimmed = keyword.trim();
	const searchKw = (trimmed === '' ? '' : debouncedKeyword).trim();
	const searchActive = searchKw.length >= MIN_SEARCH_CHARS;

	// 入口目标只解析一次（?redirect= 在当前会话内不变）
	const incoming: IncomingTarget = useMemo(() => resolveIncomingTarget(window.location.search), []);

	const hrefFor = useMemo(
		() => (tenant: TenantBase) =>
			buildBrandLoginUrl(tenant.slug, resolveLanding(incoming, tenant.slug)),
		[incoming],
	);

	const { recent, recordRecent } = useRecentTenants();

	const featuredQuery = useFeaturedTenants();
	const featured = featuredQuery.data ?? [];

	// 单租户条件探针：featured 已加载且 ≤1 时才拉一次全量（常规路径零额外请求）
	const probeEnabled = !featuredQuery.isLoading && !featuredQuery.isError && featured.length <= 1;
	const probeQuery = useSingleTenantProbe(probeEnabled);
	const probeTenants = probeQuery.data ?? [];

	// 单租户自动跳过（与 auth 侧 SelectTenantPage 同口径）
	useEffect(() => {
		if (probeEnabled && probeTenants.length === 1) {
			window.location.replace(hrefFor(probeTenants[0]));
		}
	}, [probeEnabled, probeTenants, hrefFor]);

	const singleTenantName =
		probeTenants.length === 1
			? probeTenants[0].displayName
			: featured.length === 1
				? featured[0].displayName
				: '';

	const searchQuery = useSearchTenants(searchKw);
	const searchItems = useMemo(
		() => searchQuery.data?.pages.flatMap((p) => p.items) ?? [],
		[searchQuery.data],
	);
	const searchTotal = searchQuery.data?.pages[0]?.total ?? 0;

	const clearSearch = () => {
		setKeyword('');
		inputRef.current?.focus();
	};

	return (
		<div className="relative min-h-screen">
			<div className="brand-grid pointer-events-none absolute inset-x-0 top-0 h-72 opacity-60" aria-hidden="true" />
			<div className="relative flex min-h-screen flex-col">
				<SiteHeader />

				<main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-10 sm:px-6 sm:pt-14">
					<div className="mb-8 text-center">
						<span className="brand-kicker">{t('hero.kicker')}</span>
						<h1 className="mt-5 text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl dark:text-white">
							{t('hero.title')}
						</h1>
						<p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-neutral-600 sm:text-base dark:text-neutral-300">
							{t('hero.subtitle')}
						</p>
					</div>

					<div className="mx-auto mb-10 max-w-xl">
						<div className="relative">
							<Search
								className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400"
								aria-hidden="true"
							/>
							<input
								ref={inputRef}
								type="search"
								value={keyword}
								onChange={(e) => setKeyword(e.target.value)}
								placeholder={t('search.placeholder')}
								aria-label={t('search.placeholder')}
								className="w-full rounded-full border border-primary-200 bg-white/90 py-3.5 pl-11 pr-12 text-base text-primary-900 shadow-soft outline-none transition duration-150 placeholder:text-neutral-400 focus:border-primary-400 focus:ring-2 focus:ring-primary-200 sm:text-sm dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:border-sky-400"
							/>
							{keyword !== '' ? (
								<button
									type="button"
									onClick={clearSearch}
									aria-label={t('search.clear')}
									className="absolute right-2 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-neutral-400 transition duration-150 hover:bg-sky-50 hover:text-primary-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:hover:bg-white/10 dark:hover:text-sky-300"
								>
									<X className="h-4 w-4" aria-hidden="true" />
								</button>
							) : null}
						</div>
						{trimmed !== '' && trimmed.length < MIN_SEARCH_CHARS ? (
							<p className="mt-3 text-center text-xs text-neutral-500 dark:text-neutral-400">
								{t('search.minChars', { min: MIN_SEARCH_CHARS })}
							</p>
						) : null}
					</div>

					{searchActive ? (
						<SearchResults
							items={searchItems}
							total={searchTotal}
							isPending={searchQuery.isPending}
							isFetching={searchQuery.isFetching}
							isError={searchQuery.isError}
							hasNext={searchQuery.hasNextPage ?? false}
							isFetchingNextPage={searchQuery.isFetchingNextPage}
							onLoadMore={() => searchQuery.fetchNextPage()}
							onRetry={() => searchQuery.refetch()}
							hrefFor={hrefFor}
							onNavigate={recordRecent}
						/>
					) : featuredQuery.isLoading && featured.length === 0 ? (
						<LoadingBlock label={t('state.loading')} />
					) : featuredQuery.isError ? (
						<EmptyState
							icon={<AlertCircle className="h-7 w-7" aria-hidden="true" />}
							title={t('state.errorTitle')}
							description={t('state.errorDesc')}
							action={
								<button type="button" className="brand-button-primary" onClick={() => featuredQuery.refetch()}>
									{t('state.retry')}
								</button>
							}
						/>
					) : probeEnabled && probeQuery.isLoading ? (
						<LoadingBlock
							label={
								featured.length === 1
									? t('state.singleTenant', { name: singleTenantName })
									: t('state.loading')
							}
						/>
					) : probeEnabled && probeQuery.isSuccess && probeTenants.length === 0 ? (
						<EmptyState
							icon={<Inbox className="h-7 w-7" aria-hidden="true" />}
							title={t('state.emptyTitle')}
							description={t('state.emptyDesc')}
						/>
					) : probeEnabled && probeTenants.length === 1 ? (
						<LoadingBlock label={t('state.singleTenant', { name: singleTenantName })} />
					) : (
						<>
							{recent.length > 0 ? (
								<RecentTenants recent={recent} hrefFor={hrefFor} onNavigate={recordRecent} />
							) : null}

							<section aria-labelledby="featured-heading">
								<div className="mb-4 flex items-baseline justify-between">
									<h2
										id="featured-heading"
										className="text-lg font-semibold text-primary-900 dark:text-white"
									>
										{t('section.featured')}
									</h2>
								</div>
								{featured.length === 0 ? (
									<EmptyState
										icon={<Inbox className="h-7 w-7" aria-hidden="true" />}
										title={t('state.featuredEmptyTitle')}
										description={t('state.featuredEmptyDesc')}
									/>
								) : (
									<BrandGrid
										tenants={featured}
										hrefFor={hrefFor}
										enterLabel={t('card.enter')}
										fallbackTag={t('card.fallbackTag')}
										onNavigate={recordRecent}
									/>
								)}
							</section>
						</>
					)}
				</main>

				<SiteFooter />
			</div>
		</div>
	);
}

export default function App() {
	return (
		<I18nProvider>
			<ThemeProvider storageKey="brand-portal-theme">
				<BrandPortal />
			</ThemeProvider>
		</I18nProvider>
	);
}
