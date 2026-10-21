import type { Plugin } from 'vite';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { readFileSync } from 'node:fs';
import path from 'path';
import { CDN_PIN, readBuildEnv } from '../../scripts/env.mjs';
import { REGION_COPY } from '../../scripts/region-copy.mjs';

const buildEnv = readBuildEnv();
const copy = REGION_COPY[buildEnv.defaultLang];
const CDN_ASSET_BASE = `${buildEnv.cdnHost}/ui/${CDN_PIN}`;
const ROOT_URL = `https://www.${buildEnv.rootDomain}`;

function normalizeViteBase(p: string | undefined): string {
  if (!p || p === '/') return '/';
  if (p.includes('Program Files')) {
    throw new Error('MSYS2 path corruption detected on BASE_PATH: ' + p + '. Use PowerShell to build.');
  }
  return p.replace(/\/$/, '') + '/';
}

/**
 * index.html 区域占位符（{{TOKEN}}）替换单点——值全部来自 scripts/env.mjs + region-copy.mjs。
 * 未知占位符 fail-closed（防拼写错误静默漏替）。
 */
function regionPlugin(): Plugin {
  const tokens: Record<string, string> = {
    LANG: copy.locale,
    TITLE: copy.title,
    DESCRIPTION: copy.description,
    OG_TITLE: copy.ogTitle,
    OG_DESCRIPTION: copy.ogDescription,
    OG_LOCALE: copy.ogLocale,
    SITE_NAME: copy.siteName,
    OG_IMAGE: `${ROOT_URL}/og-default.png`,
    SITE_URL: buildEnv.siteUrl,
    ROOT_URL,
    CDN_ASSET_BASE,
  };
  return {
    name: 'region-plugin',
    enforce: 'pre',
    transformIndexHtml(html) {
      return html.replace(/\{\{(\w+)\}\}/g, (raw, key: string) => {
        if (!(key in tokens)) {
          throw new Error(`[brand] index.html 未知区域占位符: {{${key}}}`);
        }
        return tokens[key];
      });
    },
  };
}

/**
 * 把 gen-env.mjs 生成的 public/env.js 内联进 index.html：
 * 省掉一次阻塞式外部脚本往返，也避免运行时配置被 SW 预缓存成旧值。
 * 生成物缺失即抛错（fail-closed），防止静默产出没有 __APP_CONFIG__ 的站点。
 */
function inlineEnvPlugin(): Plugin {
  return {
    name: 'inline-env-config',
    enforce: 'pre',
    transformIndexHtml(html) {
      const marker = /[ \t]*<script src="\/env\.js"><\/script>/;
      if (!marker.test(html)) {
        throw new Error('[brand] index.html 缺少 /env.js 脚本标记');
      }
      let envJs: string;
      try {
        envJs = readFileSync(path.resolve(__dirname, 'public/env.js'), 'utf8').trim();
      } catch {
        throw new Error('[brand] 缺少 public/env.js，请先运行 scripts/gen-env.mjs');
      }
      return html.replace(marker, `    <script>\n${envJs}\n    </script>`);
    },
  };
}

const BASE = normalizeViteBase(process.env.BASE_PATH);
const API_PROXY_TARGET = process.env.VITE_API_PROXY_URL || 'http://localhost:11001';

export default defineConfig({
  define: {
    'import.meta.env.VITE_REGION': JSON.stringify(buildEnv.region),
    'import.meta.env.VITE_SITE_URL': JSON.stringify(buildEnv.siteUrl),
    'import.meta.env.VITE_DEFAULT_LANG': JSON.stringify(buildEnv.defaultLang),
    'import.meta.env.VITE_FALLBACK_LANG': JSON.stringify(buildEnv.fallbackLang),
  },
  plugins: [
    react(),
    inlineEnvPlugin(),
    regionPlugin(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'pwa',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        id: BASE,
        name: copy.title,
        short_name: buildEnv.defaultLang === 'zh' ? '品牌入口' : 'Brand',
        description: copy.description,
        lang: copy.locale,
        start_url: BASE,
        scope: BASE,
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#003153',
        icons: [
          {
            src: `${BASE}android-chrome-192x192.png`,
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: `${BASE}android-chrome-512x512.png`,
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          { src: `${BASE}favicon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        ],
      },
      injectManifest: {
        // index.html 是离线壳，必须进预缓存；env.js 已内联进页面，不再作为独立缓存项。
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        globIgnores: ['**/env.js', '**/android-chrome-*.png'],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  worker: {
    format: 'es',
  },
  base: BASE,
  resolve: {
    extensions: ['.mjs', '.tsx', '.ts', '.jsx', '.js', '.json'],
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    include: ['@autional/shared', '@autional/ui', '@autional/tailwind-preset'],
  },
  server: {
    port: 13120,
    watch: {
      usePolling: true,
    },
    proxy: {
      '/api/v1': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/tenant/': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/oauth/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 13120,
    proxy: {
      '/api/v1': {
        target: API_PROXY_TARGET,
        changeOrigin: true,
      },
      '/bff': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
      '/oauth/': {
        target: process.env.VITE_API_PROXY_URL || 'http://localhost:11080',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
});
