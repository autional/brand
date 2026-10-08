import { AlertCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import type { TenantBase } from '@/lib/tenants';
import { EmptyState } from './EmptyState';

interface SearchResultsProps {
	items: TenantBase[];
	total: number;
	/** 首屏搜索请求进行中（无既有数据） */
	isPending: boolean;
	isFetching: boolean;
	isError: boolean;
	hasNext: boolean;
	isFetchingNextPage: boolean;
	onLoadMore: () => void;
	onRetry: () => void;
	hrefFor: (tenant: TenantBase) => string;
	onNavigate: (tenant: TenantBase) => void;
}

const SKELETON_ROWS = 5;

/** 搜索态结果列表（紧凑行，零图片请求：monogram 恒用）。 */
export function SearchResults({
	items,
	total,
	isPending,
	isFetching,
	isError,
	hasNext,
	isFetchingNextPage,
	onLoadMore,
	onRetry,
	hrefFor,
	onNavigate,
}: SearchResultsProps) {
	const { t } = useI18n();

	// 首屏失败（无既有数据）→ 整块错误态；已有数据时的翻页失败留在列表下方由计数行体现
	if (isError && items.length === 0) {
		return (
			<EmptyState
				icon={<AlertCircle className="h-7 w-7" aria-hidden="true" />}
				title={t('search.errorTitle')}
				description={t('state.errorDesc')}
				action={
					<button type="button" className="brand-button-primary" onClick={onRetry}>
						{t('state.retry')}
					</button>
				}
			/>
		);
	}

	// 首屏骨架
	if (isPending && items.length === 0) {
		return (
			<div className="mx-auto max-w-3xl" role="status" aria-live="polite">
				<span className="sr-only">{t('search.searching')}</span>
				<div className="overflow-hidden rounded-md border border-primary-100 bg-white/90 shadow-soft dark:border-white/10 dark:bg-white/5">
					{Array.from({ length: SKELETON_ROWS }).map((_, i) => (
						<div
							key={i}
							className="flex min-h-[56px] animate-pulse items-center gap-3 border-b border-primary-100/70 px-4 last:border-b-0 dark:border-white/10"
							aria-hidden="true"
						>
							<span className="h-10 w-10 rounded-xl bg-neutral-200/70 dark:bg-white/10" />
							<span className="flex-1 space-y-2">
								<span className="block h-3.5 w-40 rounded-xs bg-neutral-200/70 dark:bg-white/10" />
								<span className="block h-3 w-24 rounded-xs bg-neutral-200/70 dark:bg-white/10" />
							</span>
						</div>
					))}
				</div>
			</div>
		);
	}

	// 空结果
	if (items.length === 0) {
		return (
			<p className="py-12 text-center text-sm text-[var(--color-text-muted)]">
				{t('search.noResult')}
			</p>
		);
	}

	return (
		<>
			<p
				role="status"
				aria-live="polite"
				className="mb-3 text-sm text-[var(--color-text-muted)]"
			>
				{isFetching && items.length === 0
					? t('search.searching')
					: t('search.resultCount', { total })}
			</p>

			<div className="mx-auto max-w-3xl overflow-hidden rounded-md border border-primary-100 bg-white/90 shadow-soft dark:border-white/10 dark:bg-white/5">
				<ul className="divide-y divide-primary-100/70 dark:divide-white/10">
					{items.map((r) => {
						const initial = (r.displayName || r.slug).trim().charAt(0).toUpperCase() || '?';
						return (
							<li key={r.id}>
								<a
									href={hrefFor(r)}
									onClick={() => onNavigate(r)}
									className="group flex min-h-[56px] items-center gap-3 px-4 py-2.5 transition duration-150 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500 dark:hover:bg-white/5"
								>
									<span
										className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sm font-bold text-primary-700 dark:bg-white/10 dark:text-sky-200"
										aria-hidden="true"
									>
										{initial}
									</span>
									<span className="min-w-0 flex-1">
										<span className="block truncate text-sm font-medium text-primary-900 dark:text-white">
											{r.displayName}
										</span>
										<span className="block truncate font-mono text-xs text-[var(--color-text-muted)] dark:text-sky-200">
											{r.slug}
										</span>
									</span>
									<ArrowRight
										className="h-4 w-4 shrink-0 text-[var(--color-text-muted)] transition duration-200 group-hover:translate-x-0.5 group-hover:text-primary-700 dark:group-hover:text-sky-300"
										aria-hidden="true"
									/>
								</a>
							</li>
						);
					})}
				</ul>
			</div>

			{hasNext ? (
				<div className="mt-6 flex justify-center">
					<button
						type="button"
						onClick={onLoadMore}
						disabled={isFetchingNextPage}
						aria-busy={isFetchingNextPage}
						className="inline-flex min-h-[44px] items-center gap-2 brand-button-secondary px-6 disabled:opacity-60"
					>
						{isFetchingNextPage ? (
							<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
						) : null}
						{isFetchingNextPage ? t('search.loadingMore') : t('search.loadMore')}
					</button>
				</div>
			) : total > 0 ? (
				<p className="mt-6 text-center text-xs text-[var(--color-text-muted)]">
					{t('search.endOfResults', { total })}
				</p>
			) : null}
		</>
	);
}
