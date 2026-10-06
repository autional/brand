# Autional Brand Portal

`https://brand.autional.cn` —— 租户品牌选择入口站。

## 定位

受租户隔离的门户（`user` / `security` / `admin` / `authenticator` / `auth`）**必须有租户段**：`<门户>.autional.cn/<tenantSlug>/`。
裸根无会话时统一落到本站，选定品牌后再进入目标门户的登录页：

```
<门户>.autional.cn/                      裸根，无会话
  └─> brand.autional.cn/?redirect=https://<门户>.autional.cn/
        └─(选品牌 acme)
           └─> auth.autional.cn/acme/login?redirect=https://<门户>.autional.cn/acme/
                 └─(登录)
                    └─> <门户>.autional.cn/acme/
```

三条旁路（避免多余摩擦）：

| 场景 | 行为 |
|---|---|
| 门户裸根，已有会话 | 解析出 slug → `/<slug>/` 直达，**不经过本站** |
| 深链已带 slug（`<门户>/acme/`）无会话 | 租户已知 → 直接 `auth.autional.cn/acme/login` |
| `auth.autional.cn/` 裸根 | 有会话 → `/<slug>/dashboard`；无会话 → 本站 |

## 与其它站的关系

- 骨架（`packages/{shared,tailwind-preset,tsconfig,ui}`）与各门户**同构**，逐字同源。
- 品牌数据源 = `GET /bff/tenant/api/v1/tenant/public/tenants`（`?featured=true` 精选 / `keyword` 搜索分页 / 无参 legacy 全量）+ 逐租户 `GET .../tenants/{slug}`，均为公开端点。首页默认只展示精选组织（服务端 `featured` 标记 + `featured_sort` 排序，上限 24 个，由 service-tenant 管理端维护），其余组织通过搜索访问；「最近访问」chips 仅存本机 `localStorage`。
- 本站自身 chrome 用 Autional 品牌令牌（`D:\autional\ui`）；**卡片内部**呈现的是**租户自己的**品牌（`logo_url` / `primary_color`）。两层不混。

## 开发

```bash
pnpm install
pnpm --filter @autional/brand-portal dev      # http://localhost:13120
pnpm --filter @autional/brand-portal typecheck
pnpm --filter @autional/brand-portal test
pnpm --filter @autional/brand-portal build
```

本地接口代理指向 `localhost:11080`（网关）与 `localhost:11001`（tenant-service），见 `apps/brand-portal/vite.config.ts`。

## 部署

Vercel 项目 `cn-brand`，关联本仓；域 `brand.autional.cn`（DNSPod 逐子域 CNAME，禁通配符）。push `main` 自动重建。
