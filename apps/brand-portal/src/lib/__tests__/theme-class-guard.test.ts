import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

// 回归锁：禁止源码使用 `text-neutral-*` 文本色工具类。
// 背景（brand 站内容审计 B-01/B-02，2026-10-05）：tokens.css 的 `.dark` 块把 neutral
// 色阶整体反转（neutral-300→#1f3350 深海军蓝、400→#2a4060…），经典 Tailwind 心智的
// `dark:text-neutral-300/400` 在深色主题下实际渲染成深色 → 对比度 1.34:1~1.63:1 失明。
// 文本色一律走语义令牌 `text-[var(--color-text-muted)]`（浅色 #64748d / 深色 #8896a6，
// 双主题均达标）或明确的设计色（dark:text-sky-200 等）。border-/bg-neutral- 不在管辖内。
const BANNED = /text-neutral-\d/;

// vitest 以本包目录为 cwd 运行
const SRC_ROOT = resolve(process.cwd(), 'src');

function collectSourceFiles(dir: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		if (entry.name === '__tests__' || entry.name === 'test') continue;
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			out.push(...collectSourceFiles(full));
		} else if (/\.tsx?$/.test(entry.name)) {
			out.push(full);
		}
	}
	return out;
}

describe('主题文本色回归锁', () => {
	it('源码不使用 text-neutral-*（深色主题下被反转为深色，恒失明）', () => {
		const offenders: string[] = [];
		for (const file of collectSourceFiles(SRC_ROOT)) {
			const content = readFileSync(file, 'utf8');
			if (BANNED.test(content)) {
				offenders.push(file.slice(SRC_ROOT.length));
			}
		}
		expect(offenders).toEqual([]);
	});
});
