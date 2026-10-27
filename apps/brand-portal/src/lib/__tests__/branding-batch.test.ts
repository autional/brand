import { describe, it, expect } from 'vitest';
import { mapBranding, normalizeBrandingSlugs } from '../tenants';

describe('normalizeBrandingSlugs', () => {
	it('去空、去重、排序（同一集合命中同一查询键）', () => {
		expect(normalizeBrandingSlugs(['demo', '', 'acme', 'demo'])).toEqual(['acme', 'demo']);
	});

	it('截断到服务端上限 50', () => {
		const many = Array.from({ length: 60 }, (_, i) => `t${i.toString().padStart(2, '0')}`);
		expect(normalizeBrandingSlugs(many)).toHaveLength(50);
	});
});

describe('mapBranding', () => {
	it('解析 snake_case（后端直出）', () => {
		expect(
			mapBranding({
				slug: 'acme',
				logo_url: 'https://cdn/logo.png',
				primary_color: '#123456',
				secondary_color: '#654321',
				company_name: 'ACME Inc.',
			}),
		).toEqual({
			logoUrl: 'https://cdn/logo.png',
			primaryColor: '#123456',
			secondaryColor: '#654321',
			companyName: 'ACME Inc.',
		});
	});

	it('解析 camelCase（apiClient 转换后）', () => {
		expect(mapBranding({ logoUrl: 'https://cdn/x.png', primaryColor: '#abcdef' })).toEqual({
			logoUrl: 'https://cdn/x.png',
			primaryColor: '#abcdef',
			secondaryColor: '',
			companyName: '',
		});
	});

	it('缺字段回落空串（卡片退化为首字母色块）', () => {
		expect(mapBranding({})).toEqual({
			logoUrl: '',
			primaryColor: '',
			secondaryColor: '',
			companyName: '',
		});
	});
});
