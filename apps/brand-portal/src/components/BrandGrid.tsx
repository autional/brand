import { BrandCard } from './BrandCard';
import type { TenantBase } from '@/lib/tenants';

interface BrandGridProps {
	tenants: TenantBase[];
	hrefFor: (tenant: TenantBase) => string;
	enterLabel: string;
	onNavigate?: (tenant: TenantBase) => void;
}

export function BrandGrid({ tenants, hrefFor, enterLabel, onNavigate }: BrandGridProps) {
	return (
		<div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
			{tenants.map((tenant) => (
				<BrandCard
					key={tenant.id}
					tenant={tenant}
					href={hrefFor(tenant)}
					enterLabel={enterLabel}
					onNavigate={onNavigate}
				/>
			))}
		</div>
	);
}
