import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { pickOnColor } from '@/lib/brand-color';
import { EMPTY_BRANDING, useTenantBranding, type TenantBase } from '@/lib/tenants';

interface BrandCardProps {
	tenant: TenantBase;
	href: string;
	enterLabel: string;
	/** 点击进入时回调（导航前同步执行，用于记录最近访问；不传时行为与现状一致） */
	onNavigate?: (tenant: TenantBase) => void;
}

/** 卡片内部呈现「租户自己的」品牌（logo / primary_color）；卡片外壳仍是 Autional 品牌。 */
export function BrandCard({ tenant, href, enterLabel, onNavigate }: BrandCardProps) {
	const [logoFailed, setLogoFailed] = useState(false);
	const { data } = useTenantBranding(tenant.slug);
	const branding = data ?? EMPTY_BRANDING;

	const accent = branding.primaryColor || undefined;
	const initial = (tenant.displayName || tenant.slug).trim().charAt(0).toUpperCase() || '?';
	const showLogo = Boolean(branding.logoUrl) && !logoFailed;

	return (
		<a
			href={href}
			onClick={() => onNavigate?.(tenant)}
			aria-label={`${enterLabel} ${tenant.displayName}`}
			className="brand-card group relative flex flex-col overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-primary-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
			style={accent ? ({ '--card-accent': accent } as React.CSSProperties) : undefined}
		>
			<span className="brand-card-accent block h-1 w-full" aria-hidden="true" />

			<div className="flex flex-1 items-start gap-4 p-6">
				<div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white shadow-soft">
					{showLogo ? (
						<img
							src={branding.logoUrl}
							alt={tenant.displayName}
							className="h-full w-full object-contain p-1.5"
							loading="lazy"
							onError={() => setLogoFailed(true)}
						/>
					) : (
						<span
							className="flex h-full w-full items-center justify-center text-xl font-bold"
							style={{
								backgroundColor: accent || 'var(--color-primary-700)',
								color: pickOnColor(accent || 'var(--color-primary-700)'),
							}}
						>
							{initial}
						</span>
					)}
				</div>

				<div className="min-w-0 flex-1">
					<h3 className="truncate text-lg font-semibold text-primary-900 dark:text-white">
						{tenant.displayName}
					</h3>
					<p className="mt-0.5 truncate font-mono text-xs text-[var(--color-text-muted)] dark:text-sky-200">
						{tenant.slug}
					</p>
					{branding.companyName ? (
						<p className="mt-2 truncate text-sm text-[var(--color-text-muted)]">
							{branding.companyName}
						</p>
					) : null}
				</div>

				<ArrowRight
					className="mt-1 h-5 w-5 shrink-0 text-[var(--color-text-muted)] transition duration-200 group-hover:translate-x-1 group-hover:text-primary-700 dark:group-hover:text-sky-300"
					aria-hidden="true"
				/>
			</div>
		</a>
	);
}
