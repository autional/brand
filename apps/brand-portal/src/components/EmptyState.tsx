import type { ReactNode } from 'react';

interface EmptyStateProps {
	icon: ReactNode;
	title: string;
	description?: string;
	action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
	return (
		<div className="brand-shell mx-auto flex max-w-lg flex-col items-center px-8 py-12 text-center">
			<div className="flex h-14 w-14 items-center justify-center rounded-md bg-sky-100 text-primary-700 dark:bg-white/10 dark:text-sky-200">
				{icon}
			</div>
			<h2 className="mt-5 text-xl font-semibold text-primary-900 dark:text-white">{title}</h2>
			{description ? (
				<p className="mt-2 text-sm leading-6 text-[var(--color-text-muted)]">
					{description}
				</p>
			) : null}
			{action ? <div className="mt-6">{action}</div> : null}
		</div>
	);
}
