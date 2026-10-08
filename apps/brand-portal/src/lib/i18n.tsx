import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import '@/i18n/config';

type Lang = 'zh-CN' | 'en-US';

export const defaultLang: Lang = 'zh-CN';

function syncHtmlLang(lng: string) {
	document.documentElement.lang = lng === 'en-US' ? 'en' : 'zh-CN';
}

function syncDocumentTitle(title: string) {
	if (title) document.title = title;
}

function syncDocumentMetaDescription(description: string) {
	if (description) {
		document.querySelector('meta[name="description"]')?.setAttribute('content', description);
	}
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
	const { i18n } = useTranslation();

	useEffect(() => {
		syncHtmlLang(i18n.language);
		syncDocumentTitle(i18n.t('meta.title'));
		syncDocumentMetaDescription(i18n.t('meta.description'));

		const onLanguageChanged = (lng: string) => {
			syncHtmlLang(lng);
			syncDocumentTitle(i18n.t('meta.title'));
			syncDocumentMetaDescription(i18n.t('meta.description'));
		};
		i18n.on('languageChanged', onLanguageChanged);

		const stored = localStorage.getItem('lang') as Lang | null;
		if (stored && stored !== i18n.language) {
			i18n.changeLanguage(stored);
		}

		return () => {
			i18n.off('languageChanged', onLanguageChanged);
		};
	}, []);

	return <>{children}</>;
}

export function useI18n() {
	const { t, i18n } = useTranslation();

	return {
		lang: i18n.language as Lang,
		t: (key: string, options?: Record<string, unknown> | string) =>
			t(key, typeof options === 'string' ? { defaultValue: options } : options),
		setLang: (lang: Lang) => {
			i18n.changeLanguage(lang);
			localStorage.setItem('lang', lang);
		},
	};
}
