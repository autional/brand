import { useI18n } from '@/lib/i18n';
import { prefetchDocument } from '@/lib/prefetch';
import type { RecentTenant, TenantBase } from '@/lib/tenants';

interface RecentTenantsProps {
	recent: RecentTenant[];
	hrefFor: (tenant: TenantBase) => string;
	onNavigate: (tenant: TenantBase) => void;
}

/** 最近访问 chips（有记录才渲染；monogram 恒用，无 branding 请求）。 */
export function RecentTenants({ recent, hrefFor, onNavigate }: RecentTenantsProps) {
	const { t } = useI18n();

	return (
		<section className="mb-10" aria-labelledby="recent-heading">
			<h2
				id="recent-heading"
				className="mb-4 text-lg font-semibold text-primary-900 dark:text-white"
			>
				{t('section.recent')}
			</h2>
			<div className="flex flex-wrap gap-2">
				{recent.map((r) => {
					const tenant: TenantBase = { id: r.slug, slug: r.slug, displayName: r.displayName };
					const initial = (r.displayName || r.slug).trim().charAt(0).toUpperCase() || '?';
					return (
						<a
							key={r.slug}
							href={hrefFor(tenant)}
							onClick={() => onNavigate(tenant)}
							onPointerEnter={() => prefetchDocument(hrefFor(tenant))}
							onFocus={() => prefetchDocument(hrefFor(tenant))}
							className="group inline-flex min-h-[44px] items-center gap-2 rounded-full border border-primary-100 bg-white/90 py-1.5 pl-1.5 pr-4 shadow-soft transition duration-150 hover:border-primary-300 hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10"
						>
							<span
								className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-primary-700 dark:bg-white/10 dark:text-sky-200"
								aria-hidden="true"
							>
								{initial}
							</span>
							<span className="text-sm font-medium text-primary-900 dark:text-white">
								{r.displayName}
							</span>
						</a>
					);
				})}
			</div>
		</section>
	);
}
