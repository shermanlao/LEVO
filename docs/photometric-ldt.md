# Photometric LDT library

LEVO generates **EULUMDAT / LDT** files from a circular and linear beam-angle library, and can render a polar drawing for the datasheet PDF.

## Library

- Circular keys: 8, 10, 12, 15, 20, 24, 30, 36, 40, 45, 50, 60, 80, 90, 100, 110, 120, 140, 160, 180
- Linear / LED strip keys: 10, 12, 15, 20, 24, 30, 36, 40, 45, 50, 60, 80, 90, 120, 140, 160, 180 (empty beam defaults to 120°)
- Table: `photometric_beam_templates`
- Files: `frontend/public/uploads/photometric-library/{circular,linear}/beam-NNN.ldt`
- Seeded on API boot. Re-run does not overwrite a slot whose `source` is `uploaded`.

Admin: **LDT library** (`/admin/ldt-library`) — replace a slot with a measured `.ldt`, download, or restore the calculated cone.

## Public product page

Next to **Datasheet** and **Installation**, visitors always get an **LDT** button (document icon, same primary style as the other two files). It is a direct download of the **stored** `.ldt` file (`GET /api/products/:id/ldt`). Shape, library beam, and the stored `ldt_file` path are not shown on the product page or SKU confirm dialog.

The file is generated when an admin or staff **creates or updates** the product (and on partner import / Save polar options), then written to `frontend/public/uploads/product-ldt/{series-slug}/{id}.ldt` with the path in `products.ldt_file`. Visitors do not stamp a new file on each click. If `ldt_family` / `ldt_beam_degrees` are empty, the recommended library slot from the product specs is used. Generating still needs parseable **source lumen**; a missing value means no stored file and the download returns 400. The download name is the product code (`DL00007.ldt`).

The same **Datasheet** and **LDT** actions appear on each row of the series product list (`ProductList` on `/products/[type]/[series]`). Each row uses the series file URLs (`getSeriesDatasheetUrl` / `getSeriesLdtUrl` in `sqlite-api.ts`) with that combination’s query string. **Installation** is a series-level file (`getSeriesInstallationUrl`) on the title row next to Family Datasheet, not repeated per SKU. Below `lg` the row file buttons wrap under the SKU instead of sitting in a table column.

Selecting wattage, size, CCT, beam, and dimming downloads a **custom** LDT (`GET /api/series/:slug/ldt`) generated on the fly from the series shape (`product_series.ldt_family`), the selected beam (nearest library key), and the selected wattage / lumen / CCT / size. That file is not stored per combination. The download name is the printed SKU (`DL00001-OD-15W-30K-24D.ldt` when Trim and CRI are single-option and omitted). The SKU preview carousel and the datasheet polar drawing use `GET /api/series/:slug/polar` (library cone for the selected beam, scaled to **cd** with that wattage’s source lumen; not a size-pack `photometric_image`). See [series-configurator.md](series-configurator.md).

## Admin product edit

Shape, library beam, **LDT**, and **Save polar options** live on `/admin/products/:id` under Photometric Image.

**Save polar options** (and **Generate from library** → Confirm) writes:

- `ldt_family` and `ldt_beam_degrees` on the product row
- a polar PNG to `frontend/public/images/products/{series-slug}/` (or `general` when the product has no series) and stores the full public path in `photometric_image`
- a stamped `.ldt` to `frontend/public/uploads/product-ldt/{series-slug}/` (or `general`) and stores the path in `ldt_file`

Catalog LDT download then serves that stored file. Admin **LDT** can still preview an unsaved Shape / beam via query params (generated on the fly, not written over the stored file).

## Datasheet PDF

The photometric slot is a **polar diagram** rendered from the LDT library. Downloadable `.ldt` files keep EULUMDAT **cd/klm** intensities. Stamped polar PNGs (SKU datasheet, series `/polar`, family datasheet) multiply those intensities by source lumen/1000 and label the plot **cd**, so each wattage × beam cell is recalculated. A stored `photometric_image` is only a fallback if rendering fails. Admin **Save polar options** still writes a PNG for the product editor preview. The family datasheet prints one stamped polar per **power × beam** pair (`familyPolarCombos`), not every SKU combination. Scaling uses that wattage’s **source lumen**, not system lumen. All plots for the same beam share one candela ring scale so wattages compare by lobe size.

Admin product edit can **Generate from library** or **Save polar options** into `photometric_image` so the same drawing is stored on the product.

The PNG is written to `frontend/public/images/products/{series-slug}/` (or `general` when the product has no series) and SQLite stores the **full public path**, for example `/images/products/eco-pro/2-photometric_image.png`. Admin preview uses that path as-is so it does not guess the folder from product id. Newly written files are served from disk by `frontend/src/app/images/products/[...path]/route.ts`.

## Stamp fields

| LDT header | LEVO field |
|------------|------------|
| Manufacturer | LEVO |
| Catalog / file name | Printed SKU on series files; `product_code` on stored product files |
| Model | `vendor_model` or `name` |
| Lamp flux | `lumen` |
| Watts | `wattage` |
| CCT | `cct` |
| CRI | `cri` |
| Fixture L/W/H | `dimensions` |

## APIs

- `GET /api/products/:id/ldt-options` — saved or recommended shape/beam and whether a file can be generated
- `PUT /api/admin/backend/products/:id/ldt-options` — `{ family, beamDegrees }` (admin session); stores the pair, polar PNG, and stamped LDT file
- `GET /api/products/:id/ldt` — the stored `.ldt` (`ldt_file`). Missing files are generated once and saved. Admin may pass `?family=&beamDegrees=` to preview an unsaved pick without overwriting the stored file
- `GET /api/series/:slug/ldt?...` — custom LDT for a series combination (shape + selected beam / wattage / CCT / size)
- `GET /api/series/:slug/polar?...` — polar PNG for that same combination (datasheet and SKU dialog)
- `GET /api/photometric-library/ldt?family=&beamDegrees=` — raw library template
- `POST /api/admin/photometric-library/polar-image` — `{ svg? \| ldtText? }` → PNG (admin session)
- `GET/POST /api/admin/photometric-library` and `/:id` — list, download, replace, restore
