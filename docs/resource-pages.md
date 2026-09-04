# Resource pages

Public footer **Resources** and **Media** sit in the same column grid as Contact Us and Quick Links (bold heading, vertical list). Copy and social URLs come from `site_contacts`, not hardcoded page text. Staff edit them at `/admin/settings`. See [admin-site-settings.md](admin-site-settings.md).

## Footer

[`Footer.tsx`](../frontend/src/components/layout/Footer.tsx):

- **Resources** — Warranty → `/warranty`, Certifications → `/certifications`, Technical Underneath → `/technical`
- **Media** — icon links for Facebook, Instagram, Threads, and Pinterest. A network is hidden when its URL is empty. LinkedIn can be stored (`social_linkedin`) but is not shown in this column.

Help keys: `catalog.footer.warranty`, `catalog.footer.certifications`, `catalog.footer.technical`, `catalog.footer.facebook`, `catalog.footer.instagram`, `catalog.footer.threads`, `catalog.footer.pinterest`.

## Public pages

Shared view: [`ResourcePage.tsx`](../frontend/src/components/layout/ResourcePage.tsx)

| Route | Footer label | Title / body columns |
|-------|--------------|----------------------|
| `/warranty` | Warranty | `resource_warranty_title`, `resource_warranty_body` |
| `/certifications` | Certifications | `resource_certifications_title`, `resource_certifications_body` |
| `/technical` | Technical Underneath | `resource_technical_title`, `resource_technical_body` |

Each page shows `Home / {title}` (`resourceRouteItems` in [`pageRouteItems.ts`](../frontend/src/components/layout/pageRouteItems.ts)), an `h1` from the stored title, and body with preserved whitespace (same contact-intro panel style). Seeded placeholder copy is written by `ensureDefaultSiteContact` when those fields are empty.

`GET /api/contact` (via `serializeSiteSettings`) returns the fields. Pages revalidate every 120 seconds; saving Site settings also revalidates the `contact` cache tag.
