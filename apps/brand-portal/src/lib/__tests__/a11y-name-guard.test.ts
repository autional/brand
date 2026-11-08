import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// 回归锁：可访问名必须包含可见文本（WCAG 2.5.3 Label in Name）。
// 背景（2026-11-08 系统测试 F-002）：Lighthouse `label-content-name-mismatch` 命中 13 个节点——
// 语言按钮 aria-label="语言" 而可见文本是 "EN"；12 张卡 aria-label 只含展示名，
// 可见文本还含 slug 与公司名。屏幕阅读器用户按语音控制说可见文本时无法命中。
// 本锁为静态源码断言（与 theme-class-guard 同风格），不依赖渲染环境。
const SRC = resolve(process.cwd(), 'src');
const app = readFileSync(resolve(SRC, 'App.tsx'), 'utf8');
const card = readFileSync(resolve(SRC, 'components/BrandCard.tsx'), 'utf8');

describe('可访问名回归锁（WCAG 2.5.3）', () => {
	it('语言切换钮：可访问名包含可见的目标语言本名', () => {
		expect(app).toContain("const endonym = lang === 'zh-CN' ? 'EN' : '中文'");
		expect(app).toContain("aria-label={`${t('header.langLabel')} ${endonym}`}");
	});

	it('品牌卡：可访问名包含首字母 / 展示名 / slug / 公司名', () => {
		expect(card).toContain('[initial, enterLabel, tenant.displayName, tenant.slug, resolved.companyName]');
		expect(card).toContain('aria-label={accessibleName}');
	});

	it('首字母头像为装饰性内容（不参与朗读）', () => {
		expect(card).toContain('aria-hidden="true"');
	});

	it('搜索框具备 id 与 name（自动填充与 axe form-field 规则）', () => {
		expect(app).toContain('id="tenant-search"');
		expect(app).toContain('name="tenant-search"');
	});
});
