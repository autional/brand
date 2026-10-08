import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import zhCN from './locales/zh-CN.json';
import enUS from './locales/en-US.json';
import { FALLBACK_LANG, localeOf } from '@/lib/site-env';

// 语言契约（B3 §1.5）：首访语言 = 区域默认（cn→zh-CN / com→en-US）——由 fallbackLng 承接；
// 探测链只保留显式用户输入（querystring ?lang= 与 localStorage 'lang'），关 navigator
// （避免区域默认被浏览器语言覆盖）。手动切换经 localStorage 持久，跨访问保留。
i18n
	.use(LanguageDetector)
	.use(initReactI18next)
	.init({
		resources: {
			'zh-CN': { translation: zhCN },
			'en-US': { translation: enUS },
		},
		fallbackLng: localeOf(FALLBACK_LANG),
		supportedLngs: ['zh-CN', 'en-US'],
		interpolation: { escapeValue: false },
		detection: {
			order: ['querystring', 'localStorage'],
			caches: ['localStorage'],
			lookupQuerystring: 'lang',
			lookupLocalStorage: 'lang',
		},
	});

export default i18n;
