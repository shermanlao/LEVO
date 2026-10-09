# Resource pages

Public footer **Resources** and **Media** sit in the same column grid as Contact Us and Quick Links (bold heading, vertical list). Contact Us is twice as wide as each of the other columns, and its labels and values line up in two vertical columns. Copy and social URLs come from `site_contacts`, not hardcoded page text. Staff edit them at `/admin/settings`. See [admin-site-settings.md](admin-site-settings.md).

## Footer

[`Footer.tsx`](../frontend/src/components/layout/Footer.tsx):

- **Resources** — Warranty → `/warranty`, Certifications → `/certifications`, Technical Underneath → `/technical`
- **Media** — icon links for LinkedIn, Facebook, Instagram, Threads, and Pinterest. A network is hidden when its URL is empty.

Help keys: `catalog.footer.warranty`, `catalog.footer.certifications`, `catalog.footer.technical`, `catalog.footer.linkedin`, `catalog.footer.facebook`, `catalog.footer.instagram`, `catalog.footer.threads`, `catalog.footer.pinterest`.

## Public pages

Shared view: [`ResourcePage.tsx`](../frontend/src/components/layout/ResourcePage.tsx)

| Route | Footer label | Title / body columns |
|-------|--------------|----------------------|
| `/warranty` | Warranty | `resource_warranty_title`, `resource_warranty_body` |
| `/certifications` | Certifications | `resource_certifications_title`, `resource_certifications_body` |
| `/technical` | Technical Underneath | `resource_technical_title`, `resource_technical_body` |

Certifications and Technical show `Home / {title}` (`resourceRouteItems` in [`pageRouteItems.ts`](../frontend/src/components/layout/pageRouteItems.ts)), an `h1` from the stored title, and body with preserved whitespace (same contact-intro panel style).

`/warranty` uses [`WarrantyStatement.tsx`](../frontend/src/components/layout/WarrantyStatement.tsx). The opening line, period tiles, period table, covered / not covered, conditions, remedy, and claim text come from `warranty_schedule` on `GET /api/contact`. That object is parsed from `site_contacts.resource_warranty_schedule` (JSON). The grey **Warranty statement** panel is `resource_warranty_body`, which staff edit at `/admin/settings`. A **Contact Us** button (`catalog.warranty.contact`) opens `/contact`.

`ensureDefaultSiteContact` writes the schedule when the column is empty, and replaces the warranty statement when it is empty or still the previous one-paragraph default. A custom statement is left as saved.

`GET /api/contact` (via `serializeSiteSettings`) returns the fields. Pages revalidate every 120 seconds; saving Site settings also revalidates the `contact` cache tag.
