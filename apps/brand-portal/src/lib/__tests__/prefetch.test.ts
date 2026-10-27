import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { prefetchDocument } from '../prefetch';

function prefetchLinks(): HTMLLinkElement[] {
	return Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel="prefetch"]'));
}

beforeEach(() => {
	document.head.innerHTML = '';
});

afterEach(() => {
	document.head.innerHTML = '';
	// @ts-expect-error 测试内清理注入的 connection
	delete navigator.connection;
});

describe('prefetchDocument', () => {
	it('为下一跳文档插入一条 rel=prefetch / as=document 的 link', () => {
		prefetchDocument('https://auth.autional.cn/acme/login?redirect=https%3A%2F%2Fuser.autional.cn%2Facme%2F');

		const links = prefetchLinks();
		expect(links).toHaveLength(1);
		expect(links[0].as).toBe('document');
		expect(links[0].getAttribute('crossorigin')).toBeNull();
		expect(links[0].href).toBe(
			'https://auth.autional.cn/acme/login?redirect=https%3A%2F%2Fuser.autional.cn%2Facme%2F',
		);
	});

	it('同一 URL 重复调用只预取一次', () => {
		prefetchDocument('https://auth.autional.cn/acme/login');
		prefetchDocument('https://auth.autional.cn/acme/login');

		expect(prefetchLinks()).toHaveLength(1);
	});

	it('不同 URL 各预取一次', () => {
		prefetchDocument('https://auth.autional.cn/acme/login');
		prefetchDocument('https://auth.autional.cn/other/login');

		expect(prefetchLinks()).toHaveLength(2);
	});

	it('相对地址按当前页解析后再去重', () => {
		prefetchDocument('/acme/login');
		prefetchDocument(`${window.location.origin}/acme/login`);

		const links = prefetchLinks();
		expect(links).toHaveLength(1);
		expect(links[0].href).toBe(`${window.location.origin}/acme/login`);
	});

	it('saveData（省流量）时整体跳过', () => {
		Object.defineProperty(navigator, 'connection', {
			value: { saveData: true },
			configurable: true,
		});

		prefetchDocument('https://auth.autional.cn/acme/login');

		expect(prefetchLinks()).toHaveLength(0);
	});

	it('慢速网络（3g）时整体跳过', () => {
		Object.defineProperty(navigator, 'connection', {
			value: { effectiveType: '3g' },
			configurable: true,
		});

		prefetchDocument('https://auth.autional.cn/acme/login');

		expect(prefetchLinks()).toHaveLength(0);
	});
});
