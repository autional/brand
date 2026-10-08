# Autional Brand Portal

**域名**：[brand.autional.cn](https://brand.autional.cn)（cn）· [brand.autional.com](https://brand.autional.com)（com）
**技术栈**：Vite + React 19 + TypeScript + Tailwind CSS

租户品牌选择入口站。

## 定位

受租户隔离的门户（`user` / `security` / `admin` / `authenticator` / `auth`）**必须有租户段**：`<门户>.<域>/<tenantSlug>/`。
裸根无会话时统一落到本站，选定品牌后再进入目标门户的登录页：

```
<门户>.<域>/                         裸根，无会话
  └─> brand.<域>/?redirect=https://<门户>.<域>/
        └─(选品牌 acme)
           └─> auth.<域>/acme/login?redirect=https://<门户>.<域>/acme/
                 └─(登录)
                    └─> <门户>.<域>/acme/
```

三条旁路（避免多余摩擦）：

| 场景 | 行为 |
|---|---|
| 门户裸根，已有会话 | 解析出 slug → `/<slug>/` 直达，**不经过本站** |
| 深链已带 slug（`<门户>/acme/`）无会话 | 租户已知 → 直接 `auth.<域>/acme/login` |
| `auth.<域>/` 裸根 | 有会话 → `/<slug>/dashboard`；无会话 → 本站 |

## 与其它站的关系

- 骨架（`packages/{shared,tailwind-preset,tsconfig,ui}`）与各门户**同构**，逐字同源。
- 品牌数据源 = `GET /bff/tenant/api/v1/tenant/public/tenants`（`?featured=true` 精选 / `keyword` 搜索分页 / 无参 legacy 全量）+ 逐租户 `GET .../tenants/{slug}`，均为公开端点。首页默认只展示精选组织（服务端 `featured` 标记 + `featured_sort` 排序，上限 24 个，由 service-tenant 管理端维护），其余组织通过搜索访问；「最近访问」chips 仅存本机 `localStorage`。
- 本站自身 chrome 用 Autional 品牌令牌（`D:\autional\ui`）；**卡片内部**呈现的是**租户自己的**品牌（`logo_url` / `primary_color`）。两层不混。

## 开发

```bash
pnpm install
pnpm dev      # http://localhost:13120（构建前自动生成 env.js/robots.txt）
pnpm build    # 构建产物：apps/brand-portal/dist/
pnpm test     # Vitest 单元测试
```

本地接口代理指向 `localhost:11080`（网关）与 `localhost:11001`（tenant-service），见 `apps/brand-portal/vite.config.ts`。

## 部署（单源双区）

`main` → `brand`（com）自动部署；`main` → `cn-brand`（cn）自动部署。两区**同一份源**，
区域差异全部由 Vercel 项目环境变量在构建期注入（见 `docs/positioning/24`）：

| 变量 | com | cn |
| --- | --- | --- |
| `REGION` | `com` | `cn` |
| `SITE_URL` | `https://brand.autional.com` | `https://brand.autional.cn` |
| `DEFAULT_LANG` / `FALLBACK_LANG` | `en` | `zh` |
| `API_ORIGIN` | `https://api.autional.com` | `https://api.autional.cn` |
| `CDN_HOST` | `https://cdn.autional.com` | `https://cdn.autional.cn` |

- 路由/重写：`vercel.ts`（fail-closed：`API_ORIGIN` 缺失即构建失败）。
- 生成物（勿手改、勿入库）：`apps/brand-portal/public/{env.js,robots.txt}` ← `scripts/gen-env.mjs`；区域文案在 `scripts/region-copy.mjs`。
- 本地无 env 时兜底 cn 值（与迁移前基线一致）。
