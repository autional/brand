import { BrandCard } from './BrandCard';
import type { TenantBase, TenantBranding } from '@/lib/tenants';

interface BrandGridProps {
	tenants: TenantBase[];
	hrefFor: (tenant: TenantBase) => string;
	enterLabel: string;
	onNavigate?: (tenant: TenantBase) => void;
	/** 批量品牌；返回 undefined 表示批量失败，卡片各自回退到单卡查询 */
	brandingFor?: (tenant: TenantBase) => TenantBranding | undefined;
}

export function BrandGrid({ tenants, hrefFor, enterLabel, onNavigate, brandingFor }: BrandGridProps) {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{tenants.map((tenant) => (
				<BrandCard
					key={tenant.id}
					tenant={tenant}
					href={hrefFor(tenant)}
					enterLabel={enterLabel}
					onNavigate={onNavigate}
					branding={brandingFor?.(tenant)}
				/>
			))}
		</div>
	);
}
