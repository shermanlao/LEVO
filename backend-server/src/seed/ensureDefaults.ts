import ProductType from '../models/ProductType';
import Product from '../models/Product';
import ProductSeries from '../models/ProductSeries';
import HelpTip from '../models/HelpTip';
import SiteContact from '../models/SiteContact';
import AdminUser from '../models/AdminUser';
import ExternalCatalogSource, {
  DEFAULT_LIGHTX_BASE_URL,
} from '../models/ExternalCatalogSource';
import sequelize from '../database';
import { DataTypes } from 'sequelize';
import { dropIndexIfExists, ensureIndex, ensureTable, integerId } from '../lib/dbSchema';
import { hashPassword } from '../lib/adminPassword';
import {
  fallbackStaffEmail,
  isValidEmail,
  normalizeEmail,
  resolveSeedAdminEmail,
} from '../lib/adminUserFields';
import { migrateStoredRole } from '../lib/shared/admin-roles';
import { ensureDefaultRolePages } from '../lib/adminPageAccess';
import {
  allocateNextProductCode,
  isLevoSku,
  levoDisplayName,
  productCodePrefix,
} from '../lib/productCode';
import { rewriteLegacyLumenPlaceholders } from '../lib/shared/description-phrase';
import { backfillProductSeriesSortOrder, backfillProductTypeSortOrder } from '../lib/catalogSortOrder';
import AiProviderSettings from '../models/AiProviderSettings';
import { AI_PROVIDER_SETTINGS_ID } from '../lib/ai/aiConstants';
import { isLegacyProductPhotoStylePrompt } from '../lib/ai/productPhotoStylePrompts';
import {
  DEFAULT_COMPANY_NAME,
  DEFAULT_COMPANY_SHORT_NAME,
  DEFAULT_FEATURED_HEADING,
  DEFAULT_FEATURED_PROJECTS_HEADING,
  DEFAULT_HERO_CTA_HREF,
  DEFAULT_HERO_CTA_LABEL,
  DEFAULT_HERO_SUBTITLE,
  DEFAULT_HERO_TITLE,
  DEFAULT_RESOURCE_CERTIFICATIONS_BODY,
  DEFAULT_RESOURCE_CERTIFICATIONS_TITLE,
  DEFAULT_RESOURCE_TECHNICAL_BODY,
  DEFAULT_RESOURCE_TECHNICAL_TITLE,
  DEFAULT_RESOURCE_WARRANTY_BODY,
  DEFAULT_RESOURCE_WARRANTY_TITLE,
  DEFAULT_ABOUT_BODY,
  DEFAULT_ABOUT_TITLE,
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
  PREVIOUS_SEO_DESCRIPTION,
  PREVIOUS_SEO_TITLE,
  DEFAULT_WHY_CARDS,
  DEFAULT_WHY_HEADING,
  ensureSiteSettingsColumns,
} from '../lib/siteSettings';

/** Matches frontend `SERVER_FALLBACK_CATEGORIES` / navigation slugs */
export const DEFAULT_PRODUCT_TYPES = [
  {
    name: 'Downlights',
    slug: 'downlights',
    description:
      'Recessed lighting fixtures that are installed into a hollow opening in a ceiling.',
    featured_image: '/images/downlights.jpg',
  },
  {
    name: 'Linear Lighting',
    slug: 'linear-lighting',
    description: 'Sleek profile linear fixtures for modern architectural applications.',
    featured_image: '/images/linear-lighting.jpg',
  },
  {
    name: 'Track Lighting',
    slug: 'track-lighting',
    description: 'Versatile track-mounted spotlights for retail and gallery spaces.',
    featured_image: '/images/track-lighting.jpg',
  },
  {
    name: 'Spotlights',
    slug: 'spotlights',
    description: 'Directional light fixtures that emit a concentrated beam of light.',
    featured_image: '/images/spotlights.jpg',
  },
];

export const DEFAULT_HELP_TIPS = [
  {
    helpKey: 'admin.login',
    title: 'Sign in',
    body: 'Sign in with your staff email and password to open the dashboard.',
  },
  {
    helpKey: 'admin.logout',
    title: 'Log out',
    body: 'End the staff session. The header login icon comes back so you can sign in again.',
  },
  {
    helpKey: 'admin.users.open',
    title: 'User management',
    body: 'Open the staff directory. System and admin can create, edit, or remove accounts and set page access.',
  },
  {
    helpKey: 'admin.users.add',
    title: 'Add user',
    body: 'Create a staff account. Email is the login. Username is the short display name. Choose system, admin, or operation.',
  },
  {
    helpKey: 'admin.users.save',
    title: 'Save user',
    body: 'Save profile fields, role, active state, or a new password for this account.',
  },
  {
    helpKey: 'admin.users.cancel',
    title: 'Cancel',
    body: 'Close the form without saving.',
  },
  {
    helpKey: 'admin.users.delete',
    title: 'Delete user',
    body: 'Remove this login. The last remaining system or admin user cannot be deleted.',
  },
  {
    helpKey: 'admin.users.access',
    title: 'Page access',
    body: 'Open the role × page matrix. Grant or remove admin pages for system, admin, and operation.',
  },
  {
    helpKey: 'admin.users.access.save',
    title: 'Save page access',
    body: 'Write the role page matrix. System always keeps Users and Page access. Operation cannot receive those pages.',
  },
  {
    helpKey: 'admin.users.access.reset',
    title: 'Reset page access',
    body: 'Restore the default page matrix: system and admin get every page; operation gets catalog, projects, and related tools.',
  },
  {
    helpKey: 'admin.users.access.toggle',
    title: 'Toggle page',
    body: 'Allow or deny this admin page for the role. Locked cells cannot be changed.',
  },
  {
    helpKey: 'admin.dash.stat.products',
    title: 'Size packs',
    body: 'How many size-photo records exist under series. Open product series to add sizes and photos.',
  },
  {
    helpKey: 'admin.dash.stat.types',
    title: 'Product types',
    body: 'How many top-level categories exist. Open product types.',
  },
  {
    helpKey: 'admin.dash.stat.series',
    title: 'Series',
    body: 'How many product series exist. Open product series.',
  },
  {
    helpKey: 'admin.dash.stat.projects',
    title: 'Projects',
    body: 'How many project pages exist. Open project management.',
  },
  {
    helpKey: 'admin.dash.stat.inquiries',
    title: 'Inquiries',
    body: 'Contact form submissions in the last 7 days. Open the inquiry list to read them.',
  },
  {
    helpKey: 'admin.dash.stat.visitors',
    title: 'Unique visitors',
    body: 'Distinct anonymous visitors on public pages in the last 7 days. Admin and staff logins are not counted.',
  },
  {
    helpKey: 'admin.dash.stat.views',
    title: 'Page views',
    body: 'Public page views in the last 7 days. Admin and staff browsing is not counted.',
  },
  {
    helpKey: 'admin.dash.stat.featured',
    title: 'Featured series',
    body: 'Series marked featured for the homepage. Open a series variants page to change this.',
  },
  {
    helpKey: 'admin.dash.link.types',
    title: 'Product Types',
    body: 'Create and edit catalog categories.',
  },
  {
    helpKey: 'admin.dash.link.series',
    title: 'Product Series',
    body: 'Create and edit series under a product type.',
  },
  {
    helpKey: 'admin.dash.link.products',
    title: 'Products',
    body: 'SKU product pages are retired. Manage variants and size photos on each series.',
  },
  {
    helpKey: 'admin.dash.link.lightx',
    title: 'Partner catalog',
    body: 'Save LightX credentials and test the partner API.',
  },
  {
    helpKey: 'admin.dash.link.ldt',
    title: 'LDT library',
    body: 'Photometric beam templates for Dialux and Relux.',
  },
  {
    helpKey: 'admin.dash.link.ai',
    title: 'AI settings',
    body: 'Open /admin/ai for provider keys, catalog photo style, and usage. Image features need a usable xAI or Google key — Saved is not enough if the stored key cannot be decrypted.',
  },
  {
    helpKey: 'admin.dash.link.variant_options',
    title: 'Variant',
    body: 'Open the variant page to add option labels and SKU codes. Series pages add those options as tags.',
  },
  {
    helpKey: 'admin.dash.link.settings',
    title: 'Site settings',
    body: 'Company name, logos, homepage copy, contact details, social links, and SEO.',
  },
  {
    helpKey: 'admin.dash.link.deploy',
    title: 'Git versions',
    body: 'See the running git version, fetch GitHub, and deploy or roll back a commit. System and admin only.',
  },
  {
    helpKey: 'admin.settings.save',
    title: 'Save site settings',
    body: 'Store brand, homepage, contact, and SEO fields. Uploaded logos are saved immediately.',
  },
  {
    helpKey: 'admin.settings.website',
    title: 'Website',
    body: 'Public catalog origin used in datasheet QR codes (https://www.example.com). Leave empty while developing so QR codes stay on localhost.',
  },
  {
    helpKey: 'admin.settings.under_construction',
    title: 'UNDER CONSTRUCTION for visitors',
    body: 'When checked, signed-out visitors only see the header, footer, and UNDER CONSTRUCTION. Sign in to preview the real catalog. Uncheck this when the public site goes live.',
  },
  {
    helpKey: 'admin.settings.logo_header_upload',
    title: 'Upload header logo',
    body: 'Wordmark shown in the public header and reused in the footer. PNG with a transparent background works best. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device.',
  },
  {
    helpKey: 'admin.settings.logo_header_remove',
    title: 'Use default header logo',
    body: 'Remove the uploaded header logo and use the built-in LEVO wordmark.',
  },
  {
    helpKey: 'admin.settings.logo_pdf_upload',
    title: 'Upload PDF logo',
    body: 'Wordmark drawn on datasheet, installation, and label PDFs. Falls back to the header logo if empty. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device.',
  },
  {
    helpKey: 'admin.settings.logo_pdf_remove',
    title: 'Use default PDF logo',
    body: 'Remove the uploaded PDF logo so datasheets and labels use the header logo or the built-in wordmark.',
  },
  {
    helpKey: 'admin.settings.logo_icon_upload',
    title: 'Upload tab icon',
    body: 'Square icon for the browser tab. Falls back to the built-in L mark if empty. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device.',
  },
  {
    helpKey: 'admin.settings.logo_icon_remove',
    title: 'Use default tab icon',
    body: 'Remove the uploaded tab icon and use the built-in LEVO L mark.',
  },
  {
    helpKey: 'admin.settings.hero_image_upload',
    title: 'Upload hero image',
    body: 'Photo on the homepage hero. The crop board uses the same 3:2 frame as the homepage. Falls back to the built-in hero image if empty. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device.',
  },
  {
    helpKey: 'admin.settings.hero_image_remove',
    title: 'Use default hero image',
    body: 'Remove the uploaded hero photo and use the built-in homepage image.',
  },
  {
    helpKey: 'admin.settings.og_image_upload',
    title: 'Upload Open Graph image',
    body: 'Image used when the site is shared on social networks. Optional. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device.',
  },
  {
    helpKey: 'admin.settings.og_image_remove',
    title: 'Remove Open Graph image',
    body: 'Clear the social share image. Pages then share without a custom preview photo.',
  },
  {
    helpKey: 'admin.projects.featured',
    title: 'Featured project',
    body: 'Show this project in the Featured Projects section on the homepage.',
  },
  {
    helpKey: 'admin.dash.link.projects',
    title: 'Manage Projects',
    body: 'Create and edit project pages.',
  },
  {
    helpKey: 'admin.dash.link.inquiries',
    title: 'Contact inquiries',
    body: 'Open messages sent from the public Contact Us form.',
  },
  {
    helpKey: 'admin.dash.attention.no_series',
    title: 'Series with no featured image',
    body: 'These series have no featured image. Open product series to add one.',
  },
  {
    helpKey: 'admin.dash.attention.no_photo',
    title: 'Series with no appearance photos',
    body: 'These series have no tagged product photos. Open the series variants page and upload photos in Appearance photos.',
  },
  {
    helpKey: 'admin.dash.attention.inquiries',
    title: 'Contact inquiries',
    body: 'Open the inquiry list and read messages from the last 7 days.',
  },
  {
    helpKey: 'admin.inquiries.view',
    title: 'View inquiry',
    body: 'Open the full name, email, and message for this contact form submission.',
  },
  {
    helpKey: 'admin.inquiries.email',
    title: 'Email sender',
    body: 'Open your mail app with this visitor’s email address.',
  },
  {
    helpKey: 'admin.404.inquiries',
    title: 'Back to inquiries',
    body: 'Return to the contact inquiry list.',
  },
  {
    helpKey: 'admin.external_catalog.save',
    title: 'Save partner API',
    body: 'Save the LightX base URL, API key, and password. The password is stored for server-side catalog fetches and is not shown again.',
  },
  {
    helpKey: 'admin.external_catalog.test',
    title: 'Test connection',
    body: 'Call LightX with the saved credentials and confirm the catalog is reachable.',
  },
  {
    helpKey: 'admin.products.partner_search',
    title: 'Search partner catalog',
    body: 'Search LightX products by keyword. Tick the rows you want, then import them into LEVO.',
  },
  {
    helpKey: 'admin.products.partner_import',
    title: 'Import selected',
    body: 'Choose a LEVO category and series first, then create or update products from the ticked partner rows. Existing LightX imports are updated in place. LEVO assigns a SKU such as DL00007; the partner article is stored as vendor code.',
  },
  {
    helpKey: 'admin.products.partner_import_type',
    title: 'Import category',
    body: 'Required. Imported products are added to this existing LEVO category. LightX category names are not used.',
  },
  {
    helpKey: 'admin.products.partner_import_series',
    title: 'Import series',
    body: 'Required. Pick an existing LEVO series under the chosen category. Partner brand names are never used as a series.',
  },
  {
    helpKey: 'admin.product_series.series_photo',
    title: 'Series photo',
    body: 'Upload the photo used on the series page and on datasheets. Drop a photo onto the placeholder, paste from the clipboard, or choose a file. The file keeps its own shape. Click the photo to edit it with AI. Adjust crop lets you cut each edge on its own.',
  },
  {
    helpKey: 'admin.product_series.series_photo_adjust',
    title: 'Adjust series photo',
    body: 'Drag one edge at a time to cut that side of the series photo. The other three edges stay put. Apply crop saves the new shape.',
  },
  {
    helpKey: 'admin.product_series.card_extend',
    title: 'Extend to 16:9',
    body: 'Build the homepage and category-card photo from the series photo. The fixture stays the same height. Only the left and right background is extended until the file is 16:9. The original photo is blended into that background so there is no box at the join. Side strips take this photo’s ceiling colour (fallback #D6D6D4). Fixture, trim, and lamp light stay.',
  },
  {
    helpKey: 'admin.product_series.featured_image',
    title: 'Series photo',
    body: 'Upload the photo used on the series page and on datasheets. The card photo is a separate 16:9 frame made with Extend to 16:9.',
  },
  {
    helpKey: 'admin.product_series.featured_catalog',
    title: 'Card photo',
    body: 'The 16:9 card is built with Extend to 16:9 from the series photo. Homepage featured series and category cards use that file. Click the photo to edit it with AI.',
  },
  {
    helpKey: 'admin.product_series.featured_page',
    title: 'Series photo',
    body: 'The series page and datasheets use the series photo at its own ratio. Adjust crop zooms inside that file.',
  },
  {
    helpKey: 'admin.product_series.featured_datasheet',
    title: 'Datasheet photo',
    body: 'Datasheet heroes and option thumbs use the series photo, the same file as the series page.',
  },
  {
    helpKey: 'admin.product_series.featured_replace',
    title: 'Upload or replace this photo',
    body: 'Choose a different file for this frame only — catalog, series page, or datasheet. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or click the empty placeholder to choose a file. The shared source photo stays the same. After you pick a file, crop it to this slot.',
  },
  {
    helpKey: 'admin.product_series.featured_different',
    title: 'Use a different image',
    body: 'Crop a different file for the current frame only. The shared source photo is not replaced. Use this when that frame still does not fit the source.',
  },
  {
    helpKey: 'admin.product_series.featured_delete',
    title: 'Delete this photo',
    body: 'Remove the saved photo for this slot (or the shared source). On an existing series the clear is saved immediately. Public pages then fall back to the source or catalog crop when a slot is empty.',
  },
  {
    helpKey: 'admin.product_series.photo_enhance',
    title: 'Edit with AI',
    body: 'Click the series photo, the card photo, or an appearance photo to open this chat. Describe the change (lighter background, less glare, sharper fixture) and Send. Upscale raises resolution without changing the product. Apply saves the preview into this slot. Reset or Close keeps the current file.',
  },
  {
    helpKey: 'admin.product_series.photo_enhance_send',
    title: 'Send edit',
    body: 'Send the instruction to the image model. The preview updates in place. Send again to refine the latest preview.',
  },
  {
    helpKey: 'admin.product_series.photo_enhance_apply',
    title: 'Apply AI photo',
    body: 'Save the latest preview into this slot. On a series featured image or an appearance photo the file is stored immediately. Close or Reset keeps the previous file.',
  },
  {
    helpKey: 'admin.product_series.photo_enhance_upscale',
    title: 'Upscale',
    body: 'Ask the model to increase resolution while keeping the same product and composition. Apply still saves the preview.',
  },
  {
    helpKey: 'admin.product_series.photo_extend_sides',
    title: 'Extend sides',
    body: 'On the series-page photo only. Fills the 4:5 placeholder by continuing the background, without stretching the fixture. When the photo is narrower than 4:5, blank canvas is added on the left and right and the model paints the ceiling or wall into those sides. When the photo is already wider than 4:5, the same button extends the background above and below so the file still matches the placeholder. Apply saves that frame.',
  },
  {
    helpKey: 'admin.product_types.featured_image',
    title: 'Category photo',
    body: 'Upload the original type photo, then Extend to 16:9 for the /products card. Drop a photo onto the placeholder, paste from the clipboard, or choose a file. Click a filled photo to edit it with AI.',
  },
  {
    helpKey: 'admin.product_types.type_photo',
    title: 'Type photo',
    body: 'Upload the original category photo. Drop a photo onto the placeholder, paste from the clipboard, or choose a file. The file keeps its own shape. Click the photo to edit it with AI. Adjust crop lets you cut each edge on its own.',
  },
  {
    helpKey: 'admin.product_types.type_photo_adjust',
    title: 'Adjust type photo',
    body: 'Drag one edge at a time to cut that side of the type photo. The other three edges stay put. Apply crop saves the new shape.',
  },
  {
    helpKey: 'admin.product_types.card_extend',
    title: 'Extend to 16:9',
    body: 'Build the /products category-card photo from the type photo. The fixture stays the same height. Only the left and right background is extended until the file is 16:9. The original photo is blended into that background so there is no box at the join. Side strips take this photo’s ceiling colour (fallback #D6D6D4). Fixture, trim, and lamp light stay.',
  },
  {
    helpKey: 'admin.product_types.featured_delete',
    title: 'Delete this photo',
    body: 'Remove the saved photo for this slot. On an existing type the clear is saved immediately. Public /products uses the 16:9 card; if that card is empty the category shows a placeholder.',
  },
  {
    helpKey: 'admin.image_cutboard.apply',
    title: 'Apply crop',
    body: 'Save the visible framed area as the uploaded image. The board starts with the whole photo visible. Zoom in and drag so the fixture fills the placeholder. Empty bars mean that frame is not filled yet.',
  },
  {
    helpKey: 'admin.image_cutboard.cancel',
    title: 'Cancel crop',
    body: 'Close the crop board without uploading. The original file is not saved.',
  },
  {
    helpKey: 'admin.products.partner_page',
    title: 'Partner catalog pages',
    body: 'Move through LightX search results with First, Previous, page numbers, Next, Last, or Go to a page number.',
  },
  {
    helpKey: 'admin.products.list_page',
    title: 'Product list pages',
    body: 'The LEVO products table shows 20 rows at a time. Use First, Previous, page numbers, Next, Last, or Go to open another page.',
  },
  {
    helpKey: 'admin.products.open_edit',
    title: 'Open product',
    body: 'Click the product slug to open that product’s editor at /admin/products/[id].',
  },
  {
    helpKey: 'contact.submit',
    title: 'Send message',
    body: 'Send your message to LEVO Lighting. Inquiries are stored in the database.',
  },
  {
    helpKey: 'contact.submit_another',
    title: 'Send another message',
    body: 'Open the contact form again to send another inquiry.',
  },
  {
    helpKey: 'catalog.datasheet.download',
    title: 'Download datasheet',
    body: "Download a LEVO datasheet PDF generated from this product's specifications, or from the selected series variants. Partner identity is not included. Also on the series product list.",
  },
  {
    helpKey: 'catalog.family_datasheet.download',
    title: 'Download family datasheet',
    body: 'Download a LEVO family datasheet PDF for this series: key facts, Physical/Technical ranges, SKU coding, size drawings with power and lumen, Finish/Trim/Reflector chips, appearance photos, and power × beam polars in candela. Installation is a separate file. Page filters are ignored.',
  },
  {
    helpKey: 'catalog.ldt.download',
    title: 'Download LDT',
    body: 'Download the EULUMDAT / LDT file stored for this product, or a custom LDT generated from the selected series variants. Also on the series product list.',
  },
  {
    helpKey: 'catalog.installation.download',
    title: 'Installation',
    body: 'Open the series installation PDF (mounting, sizes, cut-outs, IP, and wiring). The same guide applies to every SKU in this series. On the series page it sits next to Family Datasheet.',
  },
  {
    helpKey: 'admin.ldt_library.replace',
    title: 'Replace LDT',
    body: 'Upload a measured .ldt file into this beam slot. Restore later to regenerate the calculated cone.',
  },
  {
    helpKey: 'admin.products.size_ai',
    title: 'Generate size drawing',
    body: 'Create a 2D size drawing from Main A, Size Dimensions, and the series Description plus filled Phrase template. Recessed fixtures also need Cut Hole Size. On the series size pack, use Generate by AI. Configure AI keys under Admin → AI settings.',
  },
  {
    helpKey: 'admin.products.photo_ai',
    title: 'Match catalog style',
    body: 'Optional. After Main A or Main B is saved, Match catalog style restyles that photo to the catalog style on /admin/ai. Upload still saves the original. Close the preview without Apply to keep it.',
  },
  {
    helpKey: 'admin.products.photometric_library',
    title: 'Generate photometric',
    body: 'Render a polar diagram from the LDT library, save Shape and Library beam on the product, and use that pair for catalog LDT downloads.',
  },
  {
    helpKey: 'admin.products.ldt_shape',
    title: 'LDT shape',
    body: 'Choose circular (spot / downlight) or linear (strip / batten). Save polar options to store this for catalog LDT download and the photometric PNG.',
  },
  {
    helpKey: 'admin.products.ldt_beam',
    title: 'Library beam',
    body: 'Pick a library beam angle. Save polar options to store this for catalog LDT download and the photometric PNG.',
  },
  {
    helpKey: 'admin.products.ldt_save',
    title: 'Save polar options',
    body: 'Store Shape and Library beam on this product, regenerate the polar PNG and stored LDT file, and use that pair for visitor LDT downloads.',
  },
  {
    helpKey: 'admin.products.ldt_download',
    title: 'LDT',
    body: 'Download an EULUMDAT / LDT preview stamped from the selected shape and library beam. Saving the product or polar options stores that file for catalog visitors.',
  },
  {
    helpKey: 'admin.ai.save',
    title: 'Save AI settings',
    body: 'Save provider, model, API keys, feature routing, parsing hints, and size-drawing prompts. Keys are stored encrypted and are never shown again.',
  },
  {
    helpKey: 'admin.ai.test',
    title: 'Test AI connection',
    body: 'Saves the key currently in the form, then calls the default provider. Paste the xAI or Google key first — Test does not work on an empty saved key.',
  },
  {
    helpKey: 'admin.ai.size_drawing_prompt',
    title: 'Size drawing prompt',
    body: 'Template sent when generating a size drawing. A 2D elevation lock is always prepended so the 3D product photo is not copied as an isometric sketch. The series Description and filled Phrase template are always injected. Placeholders: {{size}}, {{cuthole_line}}, {{description_line}}, {{phrase_line}}, {{hints_line}}.',
  },
  {
    helpKey: 'admin.ai.size_drawing_refine_prompt',
    title: 'Size drawing refine prompt',
    body: 'Template sent when refining a size drawing from chat. If the current drawing is 3D, refine flattens it to a 2D elevation. The series Description and filled Phrase template are always injected. Placeholders: {{instruction}}, {{size}}, {{cuthole_line}}, {{description_line}}, {{phrase_line}}, {{hints_line}}.',
  },
  {
    helpKey: 'admin.ai.size_drawing_prompt_reset',
    title: 'Reset size drawing prompt',
    body: 'Replace the generate prompt with the built-in default. Click Save to store it.',
  },
  {
    helpKey: 'admin.ai.size_drawing_refine_prompt_reset',
    title: 'Reset size drawing refine prompt',
    body: 'Replace the refine prompt with the built-in default. Click Save to store it.',
  },
  {
    helpKey: 'admin.ai.size_drawing_style_upload',
    title: 'Upload style reference',
    body: 'Upload a 2D size drawing to copy line style, dimension arrows, and white background when generating size photos. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device. The product crop still supplies the fixture outline.',
  },
  {
    helpKey: 'admin.ai.size_drawing_style_remove',
    title: 'Remove style reference',
    body: 'Clear the size-drawing style photo. Generate by AI then uses the text prompt only.',
  },
  {
    helpKey: 'admin.ai.product_photo_style_upload',
    title: 'Upload catalog photo style',
    body: 'Upload one finished catalog photo. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device. Match catalog style on an appearance photo copies its lighting, background, and color grade. Upload of vendor photos still saves the original.',
  },
  {
    helpKey: 'admin.ai.product_photo_style_remove',
    title: 'Remove catalog photo style',
    body: 'Clear the catalog photo style. Match catalog style is then hidden on appearance photos.',
  },
  {
    helpKey: 'admin.ai.product_photo_style_prompt',
    title: 'Catalog photo style prompt',
    body: 'Template sent when matching catalog style on an appearance photo. The model first describes the original photo, then follows cutout / polish / place-in-scene steps. A lock is always prepended so the style photo is look-only. The filled series phrase and that photo description are always sent. Placeholder: {{hints_line}}.',
  },
  {
    helpKey: 'admin.ai.product_photo_style_prompt_reset',
    title: 'Reset catalog photo style prompt',
    body: 'Replace the catalog style prompt with the built-in default. Click Save to store it.',
  },
  {
    helpKey: 'admin.product_series.photo_style_match',
    title: 'Match catalog style',
    body: 'Optional. Restyle this saved appearance photo to the catalog style on /admin/ai. The model first describes the original photo, then cutout / polish / place it in the reference scene. Sends the filled Phrase template as the fixture’s physical description. After the preview appears, use Refine chat to adjust the photo, then Apply. Close keeps the original. If no catalog style photo is stored, open /admin/ai and upload one first.',
  },
  {
    helpKey: 'admin.product_series.photo_style_refine',
    title: 'Refine styled photo',
    body: 'After Match catalog style generates a preview, type an edit instruction (for example warmer light or tighter crop) and Refine. Uses the same product-photo edit path as Edit photo with AI. Apply still saves the latest preview; Reset restores the original upload.',
  },
  {
    helpKey: 'admin.product_series.photo_style_open',
    title: 'Style with AI',
    body: 'Restyle the uploaded photo to the catalog style on /admin/ai. Chat to refine the preview, then save it on this placeholder or apply it into a location. If no catalog style photo is stored, upload one on /admin/ai first.',
  },
  {
    helpKey: 'admin.product_series.photo_apply_location',
    title: 'Apply to this frame',
    body: 'Place the style photo into this location. The fixture stays the same size. The background is extended to the frame: left and right when the photo is narrower, above and below when it is wider. Catalog is 16:9, the series page is 4:5, and the family datasheet and size photos are 1:1.',
  },
  {
    helpKey: 'admin.product_series.photo_style_apply',
    title: 'Save styled photo',
    body: 'On the style photo, save the preview back to that placeholder. On an appearance photo match, replace that library photo. Close or Reset keeps the previous file.',
  },
  {
    helpKey: 'admin.products.size_drawing_ai',
    title: 'Generate by AI',
    body: 'Crop the main photo, then generate a 2D size drawing. Apply stores the image and marks it Generated by AI. Edit the prompt on AI settings.',
  },
  {
    helpKey: 'catalog.logo',
    title: 'LEVO',
    body: 'Return to the homepage. The wordmark and slogan come from Site settings.',
  },
  {
    helpKey: 'catalog.header.login',
    title: 'Login',
    body: 'Open the staff login page. After you sign in, this control becomes a logout icon and an Admin tag.',
  },
  {
    helpKey: 'catalog.header.admin',
    title: 'Admin',
    body: 'Open the admin dashboard. This tag stays in the header while you are signed in.',
  },
  {
    helpKey: 'catalog.breadcrumb.products',
    title: 'Products',
    body: 'Browse all lighting categories in the LEVO catalog.',
  },
  {
    helpKey: 'catalog.breadcrumb.category',
    title: 'Product category',
    body: 'Open this lighting category in the product catalog.',
  },
  {
    helpKey: 'catalog.breadcrumb.series',
    title: 'Product series',
    body: 'Open this product series in the catalog.',
  },
  {
    helpKey: 'catalog.breadcrumb.projects',
    title: 'Projects',
    body: 'Browse LEVO lighting projects.',
  },
  {
    helpKey: 'catalog.breadcrumb.home',
    title: 'Home',
    body: 'Return to the LEVO homepage.',
  },
  {
    helpKey: 'catalog.footer.warranty',
    title: 'Warranty',
    body: 'Read the LEVO product warranty statement.',
  },
  {
    helpKey: 'catalog.footer.certifications',
    title: 'Certifications',
    body: 'See company and product certification information.',
  },
  {
    helpKey: 'catalog.footer.technical',
    title: 'Technical Underneath',
    body: 'Find datasheets, installation guides, and photometric files.',
  },
  {
    helpKey: 'catalog.footer.facebook',
    title: 'Facebook',
    body: 'Open the LEVO Facebook page in a new tab.',
  },
  {
    helpKey: 'catalog.footer.instagram',
    title: 'Instagram',
    body: 'Open the LEVO Instagram profile in a new tab.',
  },
  {
    helpKey: 'catalog.footer.threads',
    title: 'Threads',
    body: 'Open the LEVO Threads profile in a new tab.',
  },
  {
    helpKey: 'catalog.footer.pinterest',
    title: 'Pinterest',
    body: 'Open the LEVO Pinterest board in a new tab.',
  },
  {
    helpKey: 'catalog.footer.linkedin',
    title: 'LinkedIn',
    body: 'Open the LEVO LinkedIn company page in a new tab.',
  },
  {
    helpKey: 'catalog.about.products',
    title: 'Explore Products',
    body: 'Open the public product category grid from the About page.',
  },
  {
    helpKey: 'catalog.about.contact',
    title: 'Contact Us',
    body: 'Open the Contact page from About for inquiries and partnership questions.',
  },
  {
    helpKey: 'catalog.series.inquire',
    title: 'Inquire',
    body: 'Opens Contact with this series name filled into the message so you can request datasheets, LDT files, or a quote.',
  },
  {
    helpKey: 'admin.product_types.seo_title',
    title: 'SEO title',
    body: 'Optional browser and search title for this category. Leave empty to use the category name.',
  },
  {
    helpKey: 'admin.product_types.seo_description',
    title: 'SEO description',
    body: 'Optional search snippet for this category. Leave empty to use the category description.',
  },
  {
    helpKey: 'admin.product_types.seo_ai',
    title: 'Generate SEO',
    body: 'Fill the SEO title and description from this category’s name and description. Review the text, then save. Requires a text AI key on /admin/ai.',
  },
  {
    helpKey: 'admin.product_series.seo_title',
    title: 'SEO title',
    body: 'Optional browser and search title for this series. Leave empty to use the series name (and type when available).',
  },
  {
    helpKey: 'admin.product_series.seo_description',
    title: 'SEO description',
    body: 'Optional search snippet for this series. Leave empty to use the series description.',
  },
  {
    helpKey: 'admin.product_series.seo_ai',
    title: 'Generate SEO',
    body: 'Fill the SEO title and description from this series name, category, and description. Review the text, then save variants. Requires a text AI key on /admin/ai.',
  },
  {
    helpKey: 'admin.projects.seo_title',
    title: 'SEO title',
    body: 'Optional browser and search title for this project. Leave empty to use the project title.',
  },
  {
    helpKey: 'admin.projects.seo_description',
    title: 'SEO description',
    body: 'Optional search snippet for this project. Leave empty to use the project description.',
  },
  {
    helpKey: 'admin.projects.seo_ai',
    title: 'Generate SEO',
    body: 'Fill the SEO title and description from this project’s title, location, and description. Review the text, then save. Requires a text AI key on /admin/ai.',
  },
  {
    helpKey: 'admin.settings.seo_ai',
    title: 'Generate SEO',
    body: 'Fill the default site title and description from the company name, slogan, homepage, and About copy. Review the text, then save settings. Requires a text AI key on /admin/ai.',
  },
  {
    helpKey: 'catalog.404.home',
    title: 'Home',
    body: 'Return to the LEVO Lighting homepage.',
  },
  {
    helpKey: 'catalog.404.products',
    title: 'Browse products',
    body: 'Open the product catalog and browse lighting categories.',
  },
  {
    helpKey: 'catalog.404.projects',
    title: 'Projects',
    body: 'Open the LEVO project gallery.',
  },
  {
    helpKey: 'catalog.404.contact',
    title: 'Contact us',
    body: 'Open the Contact Us page to send a message to LEVO Lighting.',
  },
  {
    helpKey: 'catalog.404.category',
    title: 'Product category',
    body: 'Open this lighting category in the LEVO catalog.',
  },
  {
    helpKey: 'admin.404.products',
    title: 'Back to products',
    body: 'Return to the admin product list.',
  },
  {
    helpKey: 'admin.404.projects',
    title: 'Back to projects',
    body: 'Return to the admin project list.',
  },
  {
    helpKey: 'admin.404.dashboard',
    title: 'Dashboard',
    body: 'Return to the admin dashboard.',
  },
  {
    helpKey: 'catalog.error.retry',
    title: 'Try again',
    body: 'Reload this page after a temporary error.',
  },
  {
    helpKey: 'catalog.error.home',
    title: 'Home',
    body: 'Return to the LEVO Lighting homepage.',
  },
  {
    helpKey: 'admin.nav.back',
    title: 'Back to Admin',
    body: 'Return to the admin dashboard.',
  },
  {
    helpKey: 'admin.nav.home',
    title: 'Back to Homepage',
    body: 'Leave admin and open the public LEVO site.',
  },
  {
    helpKey: 'admin.nav.catalog',
    title: 'Catalog',
    body: 'Product types, series, variants, partner catalog, and LDT library.',
  },
  {
    helpKey: 'admin.nav.projects',
    title: 'Projects',
    body: 'Manage project pages and contact inquiries.',
  },
  {
    helpKey: 'admin.nav.settings',
    title: 'Settings',
    body: 'Brand, homepage, contact, and SEO for the public site.',
  },
  {
    helpKey: 'admin.nav.ai',
    title: 'AI',
    body: 'Open AI settings for provider keys, catalog photo style, and usage.',
  },
  {
    helpKey: 'admin.nav.users',
    title: 'Users',
    body: 'Open the staff directory and page-access settings. System and admin can manage accounts.',
  },
  {
    helpKey: 'admin.deploy.refresh',
    title: 'Refresh',
    body: 'Reload the current git SHA, recent commits, and the last deploy log.',
  },
  {
    helpKey: 'admin.deploy.fetch',
    title: 'Fetch from GitHub',
    body: 'Download new commits from GitHub without changing the running site. Deploy a SHA from the list when you want it live.',
  },
  {
    helpKey: 'admin.deploy.live_admin',
    title: 'Live admin',
    body: 'Open the production admin dashboard at https://levolight.com/admin in a new tab.',
  },
  {
    helpKey: 'admin.deploy.redeploy',
    title: 'Redeploy current version',
    body: 'Rebuild and restart production on the SHA that is already checked out.',
  },
  {
    helpKey: 'admin.deploy.deploy',
    title: 'Deploy',
    body: 'Check out this commit on the VPS, rebuild the API and site, and restart production.',
  },
  {
    helpKey: 'admin.deploy.confirm',
    title: 'Deploy',
    body: 'Confirm. The public site may be briefly unavailable while the VPS rebuilds.',
  },
  {
    helpKey: 'admin.deploy.cancel',
    title: 'Cancel',
    body: 'Close the dialog without starting a deploy.',
  },
  {
    helpKey: 'admin.product_types.add',
    title: 'Add product type',
    body: 'Open or close the form to create a new catalog category.',
  },
  {
    helpKey: 'admin.product_series.add',
    title: 'Add product series',
    body: 'Open or close the form to create a new series under a product type.',
  },
  {
    helpKey: 'admin.products.add',
    title: 'Add product',
    body: 'Open or close the form to create a new product.',
  },
  {
    helpKey: 'admin.products.label_general',
    title: 'General label',
    body: 'Open a printable A4 sheet of brand-only LEVO stickers (no SKU or electrical specs), including a 50 × 20 mm logo die with no contact. Print at 100% and cut on the crop marks.',
  },
  {
    helpKey: 'admin.products.duplicate',
    title: 'Duplicate product',
    body: 'Copy this product into a new row with a unique slug.',
  },
  {
    helpKey: 'admin.products.delete',
    title: 'Delete product',
    body: 'Permanently remove this product from the catalog.',
  },
  {
    helpKey: 'admin.projects.add',
    title: 'Add project',
    body: 'Open or close the form to create a new project.',
  },
  {
    helpKey: 'admin.external_catalog.import_link',
    title: 'Import on Products',
    body: 'Open the products page to search LightX and import into a series.',
  },
  {
    helpKey: 'catalog.home.explore',
    title: 'Explore Products',
    body: 'Browse lighting categories on the public catalog.',
  },
  {
    helpKey: 'catalog.search.submit',
    title: 'Search',
    body: 'Search products by name or keyword.',
  },
  {
    helpKey: 'admin.product_series.spec_add',
    title: 'Add specification',
    body: 'Add a key/value specification row for this series.',
  },
  {
    helpKey: 'admin.product_series.spec_remove',
    title: 'Remove specification',
    body: 'Remove this specification row.',
  },
  {
    helpKey: 'admin.products.spec_add',
    title: 'Add specification',
    body: 'Add a key/value specification row for this product.',
  },
  {
    helpKey: 'admin.products.spec_remove',
    title: 'Remove specification',
    body: 'Remove this specification row.',
  },
  {
    helpKey: 'admin.products.create',
    title: 'Create product',
    body: 'Save the new product to the catalog.',
  },
  {
    helpKey: 'admin.products.update',
    title: 'Update product',
    body: 'Save changes to this product.',
  },
  {
    helpKey: 'admin.products.cancel_edit',
    title: 'Cancel',
    body: 'Discard the in-progress product form.',
  },
  {
    helpKey: 'admin.products.generate_slug',
    title: 'Generate slug',
    body: 'Build a unique URL slug from the product name.',
  },
  {
    helpKey: 'admin.products.edit',
    title: 'Edit product',
    body: 'Open the product fields for editing.',
  },
  {
    helpKey: 'admin.products.label',
    title: 'Product label',
    body: 'Open a printable A4 sheet of this product’s stickers (SKU and specs from the catalog). Print at 100% and cut on the crop marks. Empty fields are omitted.',
  },
  {
    helpKey: 'admin.products.refresh',
    title: 'Refresh',
    body: 'Reload this product from the server.',
  },
  {
    helpKey: 'admin.products.save',
    title: 'Save changes',
    body: 'Write the edited product fields to the catalog.',
  },
  {
    helpKey: 'admin.products.back_list',
    title: 'Back to products',
    body: 'Return to the products list.',
  },
  {
    helpKey: 'admin.product_types.create',
    title: 'Create product type',
    body: 'Save a new catalog category.',
  },
  {
    helpKey: 'admin.product_types.update',
    title: 'Update product type',
    body: 'Save changes to this category.',
  },
  {
    helpKey: 'admin.product_types.edit',
    title: 'Edit product type',
    body: 'Open this category on its own edit page.',
  },
  {
    helpKey: 'admin.product_types.move_up',
    title: 'Move up',
    body: 'Move this category one place earlier on /products. The first row stays at the top.',
  },
  {
    helpKey: 'admin.product_types.move_down',
    title: 'Move down',
    body: 'Move this category one place later on /products. The last row stays at the bottom.',
  },
  {
    helpKey: 'admin.product_types.cancel_edit',
    title: 'Cancel',
    body: 'Return to the product type list without saving.',
  },
  {
    helpKey: 'admin.product_types.back_list',
    title: 'Back to product types',
    body: 'Return to the product type list.',
  },
  {
    helpKey: 'admin.product_types.datasheet_labels',
    title: 'Datasheet labels',
    body: 'Squares that were previously stored on this category. Extra datasheet icons are now created on Variant and picked on each series.',
  },
  {
    helpKey: 'admin.product_types.label_upload',
    title: 'Upload label',
    body: 'Upload a PNG or JPEG for this product-type datasheet square. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device.',
  },
  {
    helpKey: 'admin.product_types.label_ai',
    title: 'Generate by AI',
    body: 'Generate datasheet badge artwork for this product type. Requires an image AI key on /admin/ai.',
  },
  {
    helpKey: 'admin.product_types.label_clear',
    title: 'Clear label image',
    body: 'Remove the uploaded or AI image so this type square uses the auto-drawn text again.',
  },
  {
    helpKey: 'admin.product_types.label_add',
    title: 'Add type label',
    body: 'Add a datasheet square for every series in this category (for example CE). Then upload artwork or generate by AI.',
  },
  {
    helpKey: 'admin.product_types.label_remove',
    title: 'Remove type label',
    body: 'Delete this extra datasheet square from the product type. Series extras are unchanged.',
  },
  {
    helpKey: 'admin.product_series.create',
    title: 'Create series',
    body: 'Save a new product series.',
  },
  {
    helpKey: 'admin.product_series.update',
    title: 'Update series',
    body: 'Save changes to this series.',
  },
  {
    helpKey: 'admin.product_series.cancel_edit',
    title: 'Cancel',
    body: 'Return to the series list without saving.',
  },
  {
    helpKey: 'admin.product_series.retry',
    title: 'Retry connection',
    body: 'Try loading product series from the API again.',
  },
  {
    helpKey: 'admin.product_series.edit',
    title: 'Edit series',
    body: 'Open this series on its own edit page.',
  },
  {
    helpKey: 'admin.product_series.move_up',
    title: 'Move up',
    body: 'Move this series one place earlier in its category on /products/{type}. Hidden series keep their slot. The first row in the group stays at the top.',
  },
  {
    helpKey: 'admin.product_series.move_down',
    title: 'Move down',
    body: 'Move this series one place later in its category on /products/{type}. Hidden series keep their slot. The last row in the group stays at the bottom.',
  },
  {
    helpKey: 'admin.product_series.view_product',
    title: 'View product',
    body: 'Open this series on the public catalog (/products/{type}/{series}) in a new tab. The address uses the saved type slug and the slug on this form.',
  },
  {
    helpKey: 'admin.product_series.delete',
    title: 'Delete series',
    body: 'Permanently remove this series and every product in it. Only system and admin accounts see this button.',
  },
  {
    helpKey: 'admin.product_series.delete_confirm',
    title: 'Confirm delete',
    body: 'Remove this series and every product in it. This cannot be undone.',
  },
  {
    helpKey: 'admin.product_series.delete_cancel',
    title: 'Cancel delete',
    body: 'Close this dialog and keep the series.',
  },
  {
    helpKey: 'admin.projects.create',
    title: 'Create project',
    body: 'Save a new project to the list.',
  },
  {
    helpKey: 'admin.projects.edit',
    title: 'Edit project',
    body: 'Open the project fields for editing.',
  },
  {
    helpKey: 'admin.projects.save',
    title: 'Save project',
    body: 'Write project changes to the database.',
  },
  {
    helpKey: 'admin.projects.cancel_edit',
    title: 'Cancel',
    body: 'Discard in-progress project edits.',
  },
  {
    helpKey: 'admin.projects.back_list',
    title: 'Back to projects',
    body: 'Return to the projects list.',
  },
  {
    helpKey: 'admin.projects.thumbnail_upload',
    title: 'Upload project thumbnail',
    body: 'Listing photo for this project. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device. The crop board uses the same 16:9 frame as the public cards.',
  },
  {
    helpKey: 'admin.projects.section_image_upload',
    title: 'Upload section image',
    body: 'Gallery photo for this project section. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device. The crop board uses the same 3:2 frame as the public gallery.',
  },
  {
    helpKey: 'admin.products.image_upload',
    title: 'Upload product image',
    body: 'Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device. The crop board uses the same square frame as the public product photo.',
  },
  {
    helpKey: 'admin.image_upload.placeholder',
    title: 'Add a photo',
    body: 'Every image placeholder accepts a photo three ways: drop a file onto the box, paste from the clipboard while the box is hovered or focused, or choose a file from this device. The crop board then matches the public frame.',
  },
  {
    helpKey: 'catalog.category.filter_toggle',
    title: 'Filter products',
    body: 'Open wattage, size, CCT, beam angle, and dimming filters on this category. Matching products are listed; with no filter, series cards stay visible. On phones this is the funnel icon on the breadcrumb row.',
  },
  {
    helpKey: 'catalog.category.filter_clear',
    title: 'Clear filters',
    body: 'Remove all active product filters and return to the series cards for this category.',
  },
  {
    helpKey: 'catalog.series.filter_toggle',
    title: 'Configure products',
    body: 'Open variant selectors for this series. On phones this is the funnel icon on the breadcrumb row; tap to expand the panel. From tablet size up, selectors stay visible beside the gallery.',
  },
  {
    helpKey: 'catalog.series.filter_clear',
    title: 'Clear filters',
    body: 'Remove all active product filters on this category page.',
  },
  {
    helpKey: 'catalog.series.wattage',
    title: 'Wattage',
    body: 'Choose a wattage for this series. The product list filters to matching SKUs. Pick every visible option to generate a custom datasheet and LDT. Installation is shared for the series and sits next to Family Datasheet.',
  },
  {
    helpKey: 'catalog.series.size',
    title: 'Size',
    body: 'Choose a fixture size (dimensions and cut-out). The product list filters to matching SKUs, and custom files use this size.',
  },
  {
    helpKey: 'catalog.series.cct',
    title: 'Color temperature',
    body: 'Choose a CCT for this series. The product list filters to matching SKUs.',
  },
  {
    helpKey: 'catalog.series.beam',
    title: 'Beam angle',
    body: 'Choose a beam angle for this series. The product list filters to matching SKUs. Custom LDT uses this beam from the photometric library.',
  },
  {
    helpKey: 'catalog.series.dimming',
    title: 'Dimming',
    body: 'Choose a dimming / control method for this series. The product list filters to matching SKUs.',
  },
  {
    helpKey: 'catalog.series.colour',
    title: 'Finish',
    body: 'Choose a housing finish. The gallery photo updates when this series has appearance photos.',
  },
  {
    helpKey: 'catalog.series.trim_color',
    title: 'Trim',
    body: 'Choose a trim / bezel colour. The gallery photo updates when this series has appearance photos.',
  },
  {
    helpKey: 'catalog.series.reflector_finish',
    title: 'Reflector',
    body: 'Choose a reflector finish. The gallery photo updates when this series has appearance photos.',
  },
  {
    helpKey: 'catalog.series.clear',
    title: 'Clear selection',
    body: 'Clear variant selectors and show every listed product in this series.',
  },
  {
    helpKey: 'catalog.series.sku_preview',
    title: 'Product details',
    body: 'Open this listed SKU’s full details without leaving the series page.',
  },
  {
    helpKey: 'catalog.series.sku_close',
    title: 'Close',
    body: 'Close the product details dialog and return to the series list.',
  },
  {
    helpKey: 'catalog.image.zoom_close',
    title: 'Close image',
    body: 'Close the enlarged photo. You can also tap the dark area around the image.',
  },
  {
    helpKey: 'admin.product_series.variants',
    title: 'Variants',
    body: 'Open this series on its own variants page for wattage, size, CCT, beam, dimming, and other spec option lists.',
  },
  {
    helpKey: 'admin.product_series.option_add',
    title: 'Add option',
    body: 'Add a value to this variant list. Visitors can pick it on the series page.',
  },
  {
    helpKey: 'admin.product_series.size_add',
    title: 'Add size',
    body: 'Add a size row with Label, Dimensions, Cutout, and Size drawing. Product photos live in Appearance photos, tagged with this size. The drawing stays on this form until you click Save variants.',
  },
  {
    helpKey: 'admin.product_series.size_duplicate',
    title: 'Duplicate size',
    body: 'Insert a copy of this size row below it, including dimensions, cutout, and the size drawing. Appearance photos tagged with this size are copied onto the new size label. The label gets “ (copy)” so Save variants creates a new size pack instead of merging with the original. Edit the copy, then click Save variants.',
  },
  {
    helpKey: 'admin.product_series.option_remove',
    title: 'Remove option',
    body: 'Remove this option from the series. Listed products are not deleted. On the variants page, click the selected chip under the menu, or click the option again in the menu.',
  },
  {
    helpKey: 'admin.product_series.save_variants',
    title: 'Save variants',
    body: 'Write the option lists, size text, size-pack photos, and LDT shape for this series.',
  },
  {
    helpKey: 'admin.product_series.ldt_family',
    title: 'LDT shape',
    body: 'Circular (spot / downlight) or linear (strip / batten) for custom series LDT files when no listed SKU matches.',
  },
  {
    helpKey: 'admin.product_series.back_list',
    title: 'Back to series',
    body: 'Return to the product series list.',
  },
  {
    helpKey: 'admin.product_series.option_menu',
    title: 'Select options',
    body: 'Open the list for this variant and click one or more catalog options. The menu stays open while you pick. Selected options appear under the menu. Click Save variants to store them.',
  },
  {
    helpKey: 'admin.product_series.option_pick',
    title: 'Add option',
    body: 'Add this catalog option to the series. On the variants page, open Select options and click the row. You can pick more than one before closing the menu.',
  },
  {
    helpKey: 'admin.product_series.option_new',
    title: 'Add new option',
    body: 'Create a new option and SKU code on the Variant page, then choose it from Select options on this series.',
  },
  {
    helpKey: 'admin.product_series.featured',
    title: 'Featured series',
    body: 'Show this series in the homepage featured section.',
  },
  {
    helpKey: 'admin.product_series.show_on_site',
    title: 'Show on site',
    body: 'When on, this series appears on the public catalog, search, sitemap, and homepage featured list. Turn it off to hide the series from visitors. Existing series stay on until you switch this off.',
  },
  {
    helpKey: 'admin.product_series.size_photo_a',
    title: 'Size main photo A',
    body: 'Main photo for this series size. Used on the public option table and datasheet. Click an empty placeholder, drop a photo onto the slot, or paste from the clipboard while it is hovered. After a photo is saved, click it to enlarge. The crop board uses the same square frame as the product photo slots. Click Save variants to store it on the size pack.',
  },
  {
    helpKey: 'admin.product_series.size_photo_b',
    title: 'Size main photo B',
    body: 'Optional second photo for this series size. Click an empty placeholder, drop a photo onto the slot, or paste from the clipboard while it is hovered. After a photo is saved, click it to enlarge. Click Save variants to store it on the size pack.',
  },
  {
    helpKey: 'admin.product_series.size_drawing',
    title: 'Size drawing',
    body: 'Dimension drawing for this series size. Click an empty placeholder, drop a photo onto the slot, or paste from the clipboard while it is hovered. You can also Generate by AI from a product photo tagged with this size. Click Save variants to store it on the size pack. Used on datasheets and the option preview.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai',
    title: 'Generate by AI',
    body: 'Create a 2D size drawing from a product photo tagged with this size (or any appearance photo, or the series photo), Dimensions, Cutout when the series is recessed, plus the series Description and filled Phrase template. Crop the fixture, then Apply to save. Configure AI keys under Admin → AI settings.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai_focus',
    title: 'Continue',
    body: 'Crop the fixture on the product photo, then generate the size drawing.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai_cancel',
    title: 'Cancel',
    body: 'Close the crop step without generating a size drawing.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai_refine',
    title: 'Refine drawing',
    body: 'Send a follow-up instruction to adjust the generated size drawing, then Apply to save it on this size pack.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai_apply',
    title: 'Apply drawing',
    body: 'Put the generated size drawing on this size row. Click Save variants to store it on the size pack. Used on datasheets and the option preview.',
  },
  {
    helpKey: 'admin.product_series.appearance_photos',
    title: 'Appearance photos',
    body: 'Upload as many product photos as you need. Tag each with Finish, Trim, Reflector, and/or Size. A variant uses the photo whose tags all match and that has the most tags, then the next, down to an untagged photo, then the series photo.',
  },
  {
    helpKey: 'admin.product_series.appearance_add',
    title: 'Add appearance photo',
    body: 'Upload another product photo. The crop board uses the same square frame as the catalog slot. Tag it after it saves so the right variants pick it up.',
  },
  {
    helpKey: 'admin.product_series.appearance_tag',
    title: 'Appearance photo tag',
    body: 'Click a Finish, Trim, Reflector, or Size value to tag this photo. Click again to clear. Empty tags mean any value. A tagged value must match the variant or this photo is skipped.',
  },
  {
    helpKey: 'admin.product_series.appearance_generate',
    title: 'Generate by AI',
    body: 'Edit this library photo with AI using its Finish, Trim, and Reflector tags when they are set. If this slot is empty, another library photo or the series photo is used as the source. Size is not sent to the model. The preview stays pending until you Confirm. Discard keeps the previous saved photo.',
  },
  {
    helpKey: 'admin.product_series.appearance_generate_missing',
    title: 'Generate missing',
    body: 'Create previews for every Finish × Trim × Reflector combination that still has no saved image and no pending preview. Confirm each photo (or Confirm all) to store it. Does not overwrite saved photos.',
  },
  {
    helpKey: 'admin.product_series.appearance_generate_all',
    title: 'Generate all',
    body: 'Generate a pending preview for every Finish × Trim × Reflector combination from a library photo. Regenerates AI photos. Does not overwrite photos you uploaded yourself. Confirm to save.',
  },
  {
    helpKey: 'admin.product_series.appearance_confirm',
    title: 'Confirm appearance photo',
    body: 'Save this AI preview to the series. Until you confirm, the family datasheet and catalog keep the previous photo (or none).',
  },
  {
    helpKey: 'admin.product_series.appearance_discard',
    title: 'Discard appearance preview',
    body: 'Throw away this unsaved AI preview. The previous uploaded or generated photo stays in place.',
  },
  {
    helpKey: 'admin.product_series.appearance_confirm_all',
    title: 'Confirm all appearance photos',
    body: 'Save every pending AI preview on this series.',
  },
  {
    helpKey: 'admin.product_series.appearance_discard_all',
    title: 'Discard all appearance previews',
    body: 'Clear every unsaved AI preview. Saved photos are not removed.',
  },
  {
    helpKey: 'admin.product_series.appearance_upload',
    title: 'Upload appearance photo',
    body: 'Replace this photo. Click an empty placeholder, drop a photo onto the slot, or paste from the clipboard while it is hovered. The crop board uses the same square frame as the catalog slot. Tags on this photo stay in place.',
  },
  {
    helpKey: 'admin.product_series.appearance_remove',
    title: 'Remove appearance photo',
    body: 'Delete this photo from the series. Variants that used it pick the next most specific tagged photo, or the series photo.',
  },
  {
    helpKey: 'admin.product_series.appearance_cancel',
    title: 'Cancel generate',
    body: 'Stop generating further appearance previews. Already generated previews stay pending until you Confirm or Discard them. Nothing new is saved.',
  },
  {
    helpKey: 'admin.product_series.appearance_unused',
    title: 'Unused appearance photos',
    body: 'Photos left over from Finish, Trim, or Reflector tags that are no longer selected. They do not print on the family datasheet. Remove them, or restore those tags to use them again.',
  },
  {
    helpKey: 'admin.product_series.appearance_unused_remove',
    title: 'Remove unused appearance photo',
    body: 'Delete this leftover combination photo from the series. It is already hidden from the family datasheet.',
  },
  {
    helpKey: 'admin.product_series.appearance_na',
    title: 'N/A',
    body: 'This series has no Finish, Trim, or Reflector part (for example an LED strip). N/A hides the visitor dropdown, skips SKU coding, and skips appearance photos for that part.',
  },
  {
    helpKey: 'admin.product_series.datasheet_labels',
    title: 'Datasheet labels',
    body: 'IP, warranty, and voltage squares come from Variant options for this series. Extra icons (CE, DALI) are created on Variant, then clicked on here as tags.',
  },
  {
    helpKey: 'admin.product_series.label_upload',
    title: 'Upload label',
    body: 'Upload a PNG or JPEG for this series datasheet square.',
  },
  {
    helpKey: 'admin.product_series.label_ai',
    title: 'Generate by AI',
    body: 'Generate datasheet badge artwork for this series. Requires an image AI key on /admin/ai.',
  },
  {
    helpKey: 'admin.product_series.label_ai_refine',
    title: 'Refine label',
    body: 'Send a follow-up instruction to adjust the generated badge, then Apply to save it on the variant option.',
  },
  {
    helpKey: 'admin.product_series.label_ai_apply',
    title: 'Apply label',
    body: 'Save the generated badge on this series and show it on the datasheet.',
  },
  {
    helpKey: 'admin.product_series.label_clear',
    title: 'Clear label image',
    body: 'Remove the uploaded or AI image so this series square uses the auto-drawn text again.',
  },
  {
    helpKey: 'admin.product_series.label_add',
    title: 'Add custom label',
    body: 'Click a Variant catalog tag to add that extra datasheet square to this series. Create new icons on Variant first.',
  },
  {
    helpKey: 'admin.product_series.label_remove',
    title: 'Remove custom label',
    body: 'Click a filled tag to remove that extra datasheet square from this series. The catalog icon on Variant is unchanged.',
  },
  {
    helpKey: 'admin.product_series.description_phrase',
    title: 'Phrase template',
    body: 'Datasheet and SKU-dialog sentence for this series. Use blanks such as {{cct}}, {{wattage}}, and {{source_lumen}}; the selected variant fills them. {{system_lumen}} stays system lumen.',
  },
  {
    helpKey: 'admin.product_series.phrase_token',
    title: 'Insert phrase blank',
    body: 'Insert a spec placeholder into the phrase template. The catalog fills it from the selected variant.',
  },
  {
    helpKey: 'admin.product_series.phrase_ai',
    title: 'Generate phrase by AI',
    body: 'Turn guide words into a full semicolon-separated phrase with {{spec}} blanks. Requires a text AI key on /admin/ai. Save variants to keep the result.',
  },
  {
    helpKey: 'admin.variant_options.save',
    title: 'Save variant options',
    body: 'Store option labels, SKU codes, and datasheet badge artwork for every spec kind. Datasheet SKUs use these codes.',
  },
  {
    helpKey: 'admin.variant_options.option_add',
    title: 'Add option',
    body: 'Add a label and short SKU code for this spec (for example 3000K and 30K).',
  },
  {
    helpKey: 'admin.variant_options.option_remove',
    title: 'Remove option',
    body: 'Remove this option from the global catalog. Series lists that already use it keep the value.',
  },
  {
    helpKey: 'admin.variant_options.back',
    title: 'Back to Admin',
    body: 'Return to the admin dashboard.',
  },
  {
    helpKey: 'admin.variant_options.datasheet_labels',
    title: 'Datasheet labels',
    body: 'Artwork for IP, warranty, and voltage option values, plus extra icons (CE, DALI). Series pages pick those extras as tags. Product Types do not add labels.',
  },
  {
    helpKey: 'admin.variant_options.label_upload',
    title: 'Upload label',
    body: 'Replace this datasheet square with a PNG or JPEG. Drop a photo onto the placeholder, paste from the clipboard while it is hovered, or choose a file from this device. Used on the PDF and the series preview dialog.',
  },
  {
    helpKey: 'admin.variant_options.label_ai',
    title: 'Generate by AI',
    body: 'Create a black square badge with white text from this option. Requires an image AI key on /admin/ai.',
  },
  {
    helpKey: 'admin.variant_options.label_clear',
    title: 'Clear label image',
    body: 'Remove the uploaded or AI image so this option uses the auto-drawn text square again.',
  },
  {
    helpKey: 'admin.variant_options.label_add',
    title: 'Add label option',
    body: 'Add another IP, warranty, or voltage option, or a custom icon (CE, DALI). Series pages then pick extras as tags.',
  },
  {
    helpKey: 'admin.variant_options.label_remove',
    title: 'Remove custom label',
    body: 'Delete this extra custom datasheet square from the variant catalog.',
  },
];

/** Ensures category rows exist so `/api/product-types/by-slug/:slug` does not 404 on empty DB */
export async function ensureDefaultProductTypes(): Promise<void> {
  for (const [index, row] of DEFAULT_PRODUCT_TYPES.entries()) {
    await ProductType.findOrCreate({
      where: { slug: row.slug },
      defaults: { ...row, sort_order: index },
    });
  }
}

export async function ensureDefaultHelpTips(): Promise<void> {
  const extra: { helpKey: string; title: string; body: string }[] = [];
  try {
    const { variantSpecFields, ALWAYS_VISIBLE_KINDS } = await import('../lib/shared/series-options');
    const always = new Set<string>(ALWAYS_VISIBLE_KINDS as unknown as string[]);
    for (const field of variantSpecFields()) {
      if (always.has(field.key) || field.key === 'beam_angle' || field.key === 'dimming') continue;
      extra.push({
        helpKey: `catalog.series.${field.key}`,
        title: field.label,
        body: `Choose ${field.label.toLowerCase()} for this series. The option table filters to matching combinations when this is set.`,
      });
    }
  } catch {
    /* shared module unavailable during a partial boot */
  }
  for (const tip of [...DEFAULT_HELP_TIPS, ...extra]) {
    const existing = await HelpTip.findOne({ where: { helpKey: tip.helpKey } });
    if (existing) {
      await existing.update({ title: tip.title, body: tip.body });
    } else {
      await HelpTip.create(tip);
    }
  }
}

export const DEFAULT_DATASHEET_DISCLAIMER =
  'The technical data represent rated values for an ambient temperature of 25°C. The data values for the luminous flux are initially subject to a tolerance of +/- 10%, those for the electrical connected load are initially subject to a tolerance of +/- 10%, and those for the colour temperature are initially subject to a tolerance of +/- 150 K. No liability is assumed for typographical or printing errors.';
const PREVIOUS_DATASHEET_DISCLAIMER =
  'LEVO Lighting reserves the right to change product specifications without prior notice. Confirm data before specification or installation.';

export const DEFAULT_SITE_SLOGAN = 'LIGHT EVOLUTION';
const PREVIOUS_SITE_SLOGAN = 'LIGHTX EVOLUTION';

export async function ensureDefaultSiteContact(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('site_contacts');
  if (!table.website) {
    await qi.addColumn('site_contacts', 'website', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.datasheet_disclaimer) {
    await qi.addColumn('site_contacts', 'datasheet_disclaimer', { type: DataTypes.TEXT, allowNull: true });
  }
  if (!table.slogan) {
    await qi.addColumn('site_contacts', 'slogan', { type: DataTypes.STRING, allowNull: true });
  }
  await ensureSiteSettingsColumns();

  const count = await SiteContact.count();
  if (count === 0) {
    await SiteContact.create({
      heading: 'Contact Us',
      intro:
        'Reach LEVO Lighting for product questions, project support, or partnership inquiries. Our team will respond as soon as we can.',
      email: 'info@levo-lighting.com',
      phone: '+1 234 567 890',
      address: '123 Lighting Way, Suite 100',
      hours: 'Monday–Friday, 9:00–18:00',
      website: '',
      datasheet_disclaimer: DEFAULT_DATASHEET_DISCLAIMER,
      slogan: DEFAULT_SITE_SLOGAN,
      company_name: DEFAULT_COMPANY_NAME,
      company_short_name: DEFAULT_COMPANY_SHORT_NAME,
      hero_title: DEFAULT_HERO_TITLE,
      hero_subtitle: DEFAULT_HERO_SUBTITLE,
      hero_cta_label: DEFAULT_HERO_CTA_LABEL,
      hero_cta_href: DEFAULT_HERO_CTA_HREF,
      featured_heading: DEFAULT_FEATURED_HEADING,
      featured_projects_heading: DEFAULT_FEATURED_PROJECTS_HEADING,
      why_heading: DEFAULT_WHY_HEADING,
      why_cards: JSON.stringify(DEFAULT_WHY_CARDS),
      resource_warranty_title: DEFAULT_RESOURCE_WARRANTY_TITLE,
      resource_warranty_body: DEFAULT_RESOURCE_WARRANTY_BODY,
      resource_certifications_title: DEFAULT_RESOURCE_CERTIFICATIONS_TITLE,
      resource_certifications_body: DEFAULT_RESOURCE_CERTIFICATIONS_BODY,
      resource_technical_title: DEFAULT_RESOURCE_TECHNICAL_TITLE,
      resource_technical_body: DEFAULT_RESOURCE_TECHNICAL_BODY,
      about_title: DEFAULT_ABOUT_TITLE,
      about_body: DEFAULT_ABOUT_BODY,
      seo_title: DEFAULT_SEO_TITLE,
      seo_description: DEFAULT_SEO_DESCRIPTION,
    });
    return;
  }

  const row = await SiteContact.findOne({ order: [['id', 'ASC']] });
  if (!row) return;
  const patch: Record<string, string> = {};
  const disclaimer = String(row.get('datasheet_disclaimer') || '').trim();
  if (!disclaimer || disclaimer === PREVIOUS_DATASHEET_DISCLAIMER) {
    patch.datasheet_disclaimer = DEFAULT_DATASHEET_DISCLAIMER;
  }
  const slogan = String(row.get('slogan') || '').trim();
  if (!slogan || slogan === PREVIOUS_SITE_SLOGAN) {
    patch.slogan = DEFAULT_SITE_SLOGAN;
  }
  if (!String(row.get('company_name') || '').trim()) patch.company_name = DEFAULT_COMPANY_NAME;
  if (!String(row.get('company_short_name') || '').trim()) patch.company_short_name = DEFAULT_COMPANY_SHORT_NAME;
  if (!String(row.get('hero_title') || '').trim()) patch.hero_title = DEFAULT_HERO_TITLE;
  if (!String(row.get('hero_subtitle') || '').trim()) patch.hero_subtitle = DEFAULT_HERO_SUBTITLE;
  if (!String(row.get('hero_cta_label') || '').trim()) patch.hero_cta_label = DEFAULT_HERO_CTA_LABEL;
  if (!String(row.get('hero_cta_href') || '').trim()) patch.hero_cta_href = DEFAULT_HERO_CTA_HREF;
  if (!String(row.get('featured_heading') || '').trim()) patch.featured_heading = DEFAULT_FEATURED_HEADING;
  if (!String(row.get('featured_projects_heading') || '').trim()) {
    patch.featured_projects_heading = DEFAULT_FEATURED_PROJECTS_HEADING;
  }
  if (!String(row.get('why_heading') || '').trim()) patch.why_heading = DEFAULT_WHY_HEADING;
  if (!String(row.get('why_cards') || '').trim()) patch.why_cards = JSON.stringify(DEFAULT_WHY_CARDS);
  const seoTitle = String(row.get('seo_title') || '').trim();
  if (!seoTitle || seoTitle === PREVIOUS_SEO_TITLE) patch.seo_title = DEFAULT_SEO_TITLE;
  const seoDescription = String(row.get('seo_description') || '').trim();
  if (!seoDescription || seoDescription === PREVIOUS_SEO_DESCRIPTION) {
    patch.seo_description = DEFAULT_SEO_DESCRIPTION;
  }
  if (!String(row.get('about_title') || '').trim()) patch.about_title = DEFAULT_ABOUT_TITLE;
  if (!String(row.get('about_body') || '').trim()) patch.about_body = DEFAULT_ABOUT_BODY;
  if (!String(row.get('resource_warranty_title') || '').trim()) {
    patch.resource_warranty_title = DEFAULT_RESOURCE_WARRANTY_TITLE;
  }
  if (!String(row.get('resource_warranty_body') || '').trim()) {
    patch.resource_warranty_body = DEFAULT_RESOURCE_WARRANTY_BODY;
  }
  if (!String(row.get('resource_certifications_title') || '').trim()) {
    patch.resource_certifications_title = DEFAULT_RESOURCE_CERTIFICATIONS_TITLE;
  }
  if (!String(row.get('resource_certifications_body') || '').trim()) {
    patch.resource_certifications_body = DEFAULT_RESOURCE_CERTIFICATIONS_BODY;
  }
  if (!String(row.get('resource_technical_title') || '').trim()) {
    patch.resource_technical_title = DEFAULT_RESOURCE_TECHNICAL_TITLE;
  }
  if (!String(row.get('resource_technical_body') || '').trim()) {
    patch.resource_technical_body = DEFAULT_RESOURCE_TECHNICAL_BODY;
  }
  if (Object.keys(patch).length) {
    await row.update(patch);
  }
}

export async function ensureProjectFeaturedColumn(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  let table: Record<string, unknown>;
  try {
    table = await qi.describeTable('projects');
  } catch {
    return;
  }
  if (!table.is_featured) {
    await qi.addColumn('projects', 'is_featured', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  }
  if (!table.seo_title) {
    await qi.addColumn('projects', 'seo_title', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.seo_description) {
    await qi.addColumn('projects', 'seo_description', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  await ensureIndex('CREATE INDEX IF NOT EXISTS projects_is_featured ON projects (is_featured)');
}

export async function ensureDefaultCatalogSource(): Promise<void> {
  const count = await ExternalCatalogSource.count();
  if (count > 0) return;
  await ExternalCatalogSource.create({
    name: 'LightX',
    base_url: DEFAULT_LIGHTX_BASE_URL,
    is_active: true,
  });
}

export async function ensureAdminUserColumns(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  let table: Record<string, unknown>;
  try {
    table = await qi.describeTable('admin_users');
  } catch {
    return;
  }
  if (!table.session_epoch) {
    await qi.addColumn('admin_users', 'session_epoch', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }
  if (!table.email) {
    await qi.addColumn('admin_users', 'email', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.full_name) {
    await qi.addColumn('admin_users', 'full_name', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.tel) {
    await qi.addColumn('admin_users', 'tel', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.position) {
    await qi.addColumn('admin_users', 'position', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.division) {
    await qi.addColumn('admin_users', 'division', { type: DataTypes.STRING, allowNull: true });
  }

  const seedUsername = (process.env.ADMIN_USERNAME || 'admin').trim() || 'admin';
  const adminEmail = normalizeEmail(process.env.ADMIN_EMAIL);
  const users = await AdminUser.findAll();
  for (const user of users) {
    const current = normalizeEmail(user.email);
    if (current && isValidEmail(current)) {
      if (current !== user.email) await user.update({ email: current });
      continue;
    }
    const nextEmail =
      user.username === seedUsername && adminEmail && isValidEmail(adminEmail)
        ? adminEmail
        : fallbackStaffEmail(user.username);
    await user.update({ email: nextEmail });
  }
  await ensureIndex(
    'CREATE UNIQUE INDEX IF NOT EXISTS admin_users_email_unique ON admin_users (email)'
  );

  for (const user of users) {
    const nextRole = migrateStoredRole(user.role);
    if (nextRole !== user.role) {
      await user.update({
        role: nextRole,
        session_epoch: (Number(user.session_epoch) || 0) + 1,
      });
    }
  }
}

export async function ensureDefaultAdminUser(): Promise<void> {
  const count = await AdminUser.count();
  if (count > 0) return;
  const username = (process.env.ADMIN_USERNAME || 'admin').trim() || 'admin';
  const password = process.env.ADMIN_PASSWORD?.trim();
  const email = normalizeEmail(process.env.ADMIN_EMAIL);
  if (email && !isValidEmail(email)) {
    throw new Error('ADMIN_EMAIL must be a valid email address');
  }
  if (process.env.NODE_ENV === 'production') {
    if (!password) {
      throw new Error('ADMIN_PASSWORD must be set before the first production API start');
    }
    if (!email) {
      throw new Error('ADMIN_EMAIL must be set before the first production API start');
    }
  }
  await AdminUser.create({
    username,
    email: email && isValidEmail(email) ? email : resolveSeedAdminEmail(),
    password_hash: hashPassword(password || 'abc4321'),
    role: 'system',
    active: true,
    session_epoch: 0,
  });
}

export async function ensureAdminRolePermissions(): Promise<void> {
  await ensureTable('admin_role_permissions', {
    id: integerId,
    role: { type: DataTypes.STRING, allowNull: false },
    page_key: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: true },
  });
  await ensureIndex(
    'CREATE UNIQUE INDEX IF NOT EXISTS admin_role_permissions_role_page ON admin_role_permissions (role, page_key)'
  );
  await ensureDefaultRolePages();
}

export async function ensureProductExternalColumns(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('products');
  if (!table.external_id) {
    await qi.addColumn('products', 'external_id', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.external_source) {
    await qi.addColumn('products', 'external_source', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.vendor_code) {
    await qi.addColumn('products', 'vendor_code', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.vendor_model) {
    await qi.addColumn('products', 'vendor_model', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.ldt_family) {
    await qi.addColumn('products', 'ldt_family', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.ldt_beam_degrees) {
    await qi.addColumn('products', 'ldt_beam_degrees', { type: DataTypes.INTEGER, allowNull: true });
  }
  if (!table.ldt_file) {
    await qi.addColumn('products', 'ldt_file', { type: DataTypes.STRING, allowNull: true });
  }
  if (!table.size_image_ai) {
    await qi.addColumn('products', 'size_image_ai', { type: DataTypes.BOOLEAN, allowNull: true });
  }
  await ensureTable('product_code_sequences', {
    prefix: { type: DataTypes.STRING, primaryKey: true },
    last_n: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  });
  await ensureIndex(
    'CREATE UNIQUE INDEX IF NOT EXISTS products_external_source_id ON products (external_source, external_id)'
  );
  await ensureIndex(
    `CREATE UNIQUE INDEX IF NOT EXISTS products_product_code_unique
     ON products (product_code)
     WHERE product_code IS NOT NULL AND product_code <> ''`
  );
  const listIndexes = [
    ['products_series_id', 'series_id'],
    ['products_product_type_id', 'product_type_id'],
    ['products_is_featured', 'is_featured'],
  ] as const;
  for (const [name, column] of listIndexes) {
    await ensureIndex(`CREATE INDEX IF NOT EXISTS ${name} ON products (${column})`);
  }
}

export async function ensureProductTypeColumns(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  let table: Record<string, unknown>;
  try {
    table = await qi.describeTable('product_types');
  } catch {
    return;
  }
  if (!table.datasheet_labels) {
    await qi.addColumn('product_types', 'datasheet_labels', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.seo_title) {
    await qi.addColumn('product_types', 'seo_title', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.seo_description) {
    await qi.addColumn('product_types', 'seo_description', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.featured_image_source) {
    await qi.addColumn('product_types', 'featured_image_source', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.sort_order) {
    await qi.addColumn('product_types', 'sort_order', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }
  await backfillProductTypeSortOrder();
  const types = await ProductType.findAll();
  for (const row of types) {
    const source = String(row.get('featured_image_source') || '').trim();
    const card = String(row.get('featured_image') || '').trim();
    if (source || !card) continue;
    await row.update({ featured_image_source: card });
  }
}

export async function ensureSeriesFeaturedImageColumn(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  let table: Record<string, unknown>;
  try {
    table = await qi.describeTable('product_series');
  } catch {
    return;
  }
  if (!table.featured_image) {
    await qi.addColumn('product_series', 'featured_image', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.featured_image_source) {
    await qi.addColumn('product_series', 'featured_image_source', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.featured_image_page) {
    await qi.addColumn('product_series', 'featured_image_page', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.featured_image_datasheet) {
    await qi.addColumn('product_series', 'featured_image_datasheet', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.ldt_family) {
    await qi.addColumn('product_series', 'ldt_family', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.product_code) {
    await qi.addColumn('product_series', 'product_code', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.is_featured) {
    await qi.addColumn('product_series', 'is_featured', {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    });
  }
  await ensureIndex('CREATE INDEX IF NOT EXISTS product_series_product_type_id ON product_series (product_type_id)');
  await ensureIndex('CREATE INDEX IF NOT EXISTS product_series_is_featured ON product_series (is_featured)');
  if (!table.show_on_site) {
    await qi.addColumn('product_series', 'show_on_site', {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
  }
  await ensureIndex('CREATE INDEX IF NOT EXISTS product_series_show_on_site ON product_series (show_on_site)');
  if (!table.datasheet_labels) {
    await qi.addColumn('product_series', 'datasheet_labels', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.description_phrase) {
    await qi.addColumn('product_series', 'description_phrase', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.seo_title) {
    await qi.addColumn('product_series', 'seo_title', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.seo_description) {
    await qi.addColumn('product_series', 'seo_description', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.sort_order) {
    await qi.addColumn('product_series', 'sort_order', {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    });
  }
  await backfillProductSeriesSortOrder();
  await ensureIndex(
    `CREATE UNIQUE INDEX IF NOT EXISTS product_series_product_code_unique
     ON product_series (product_code)
     WHERE product_code IS NOT NULL AND product_code <> ''`
  );
  await rewriteSeriesPhraseLumenPlaceholders();
  await backfillSeriesCatalogFields();
  await backfillSeriesPhotoFromCard();
}

async function rewriteSeriesPhraseLumenPlaceholders(): Promise<void> {
  const seriesList = await ProductSeries.findAll();
  for (const series of seriesList) {
    const current = String(series.get('description_phrase') || '');
    const next = rewriteLegacyLumenPlaceholders(current);
    if (next !== current) await series.update({ description_phrase: next });
  }
}

async function backfillSeriesCatalogFields(): Promise<void> {
  const seriesList = await ProductSeries.findAll({
    include: [{ model: ProductType, as: 'type' }],
  });
  for (const series of seriesList) {
    const seriesId = Number(series.get('id'));
    if (!seriesId) continue;
    const products = await Product.findAll({ where: { series_id: seriesId } });
    const patch: Record<string, unknown> = {};
    if (!optionText(series.get('product_code'))) {
      const withCode = products.find((row) => isLevoSku(row.get('product_code')));
      if (withCode) {
        patch.product_code = String(withCode.get('product_code')).trim();
      } else {
        const plain = series.get({ plain: true }) as { type?: { slug?: string } };
        const typeSlug = String(plain.type?.slug || '');
        patch.product_code = await allocateNextProductCode(productCodePrefix(typeSlug));
      }
    }
    if (!series.get('is_featured') && products.some((row) => Boolean(row.get('is_featured')))) {
      patch.is_featured = true;
    }
    if (Object.keys(patch).length) await series.update(patch);
  }
}

/** Series photo was added later. Copy the existing card file into it so staff do not upload again. */
async function backfillSeriesPhotoFromCard(): Promise<void> {
  const seriesList = await ProductSeries.findAll();
  for (const series of seriesList) {
    const page = optionText(series.get('featured_image_page'));
    const card = optionText(series.get('featured_image'));
    if (page || !card) continue;
    await series.update({ featured_image_page: card });
  }
}

function optionText(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

export async function ensureSeriesOptions(): Promise<void> {
  await ensureTable('series_options', {
    id: { ...integerId },
    series_id: { type: DataTypes.INTEGER, allowNull: false },
    kind: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.STRING, allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    lumen: { type: DataTypes.FLOAT, allowNull: true },
    system_lumen: { type: DataTypes.FLOAT, allowNull: true },
    dimensions: { type: DataTypes.STRING, allowNull: true },
    cutout_size: { type: DataTypes.STRING, allowNull: true },
  });
  await ensureIndex(
    'CREATE INDEX IF NOT EXISTS series_options_series_kind ON series_options (series_id, kind)'
  );
  const { backfillSeriesOptionsFromProducts } = await import('../lib/seriesConfig');
  await backfillSeriesOptionsFromProducts();
}

export async function ensureSeriesAppearancePhotos(): Promise<void> {
  await ensureTable('series_appearance_photos', {
    id: { ...integerId },
    series_id: { type: DataTypes.INTEGER, allowNull: false },
    colour: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    trim_color: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    reflector_finish: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    size: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    main_image_A: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    source_product_id: { type: DataTypes.INTEGER, allowNull: true },
    generated_by_ai: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  });
  const qi = sequelize.getQueryInterface();
  const table = await qi.describeTable('series_appearance_photos');
  if (!table.size) {
    await qi.addColumn('series_appearance_photos', 'size', {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    });
  }
  await dropIndexIfExists('series_appearance_photos_combo');
  const { migrateSizePackMainPhotosToAppearance } = await import('../lib/seriesConfig');
  await migrateSizePackMainPhotosToAppearance();
}

export async function ensureVariantOptionCatalog(): Promise<void> {
  await ensureTable('variant_option_catalog', {
    id: { ...integerId },
    kind: { type: DataTypes.STRING, allowNull: false },
    value: { type: DataTypes.STRING, allowNull: false },
    code: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    label_image: { type: DataTypes.STRING, allowNull: true },
  });
  await ensureIndex(
    'CREATE UNIQUE INDEX IF NOT EXISTS variant_option_catalog_kind_value ON variant_option_catalog (kind, value)'
  );
  const qi = sequelize.getQueryInterface();
  try {
    const table = await qi.describeTable('variant_option_catalog');
    if (!table.label_image) {
      await qi.addColumn('variant_option_catalog', 'label_image', {
        type: DataTypes.STRING,
        allowNull: true,
      });
    }
  } catch (error) {
    console.warn('Could not ensure variant_option_catalog.label_image:', error);
  }
  const { backfillVariantCatalog } = await import('../lib/variantCatalog');
  await backfillVariantCatalog();
  await migrateSeriesDatasheetLabelsToCatalog();
}

async function migrateSeriesDatasheetLabelsToCatalog(): Promise<void> {
  const { upsertCatalogOption } = await import('../lib/variantCatalog');
  const {
    parseDatasheetLabels,
    DATASHEET_LABEL_SLOTS,
    CUSTOM_DATASHEET_LABEL_KIND,
  } = await import('../lib/shared/datasheet-labels');
  const slotKeys = new Set<string>(DATASHEET_LABEL_SLOTS.map((slot) => slot.key));
  const rows = await ProductSeries.findAll();
  for (const row of rows) {
    const labels = parseDatasheetLabels(row.get('datasheet_labels'));
    for (const label of labels) {
      const text = String(label.text || '').trim();
      if (!text) continue;
      const kind = slotKeys.has(label.key) ? label.key : CUSTOM_DATASHEET_LABEL_KIND;
      await upsertCatalogOption(kind, text, undefined, label.image || undefined);
    }
  }
}

export async function ensureAiSettingsColumns(): Promise<void> {
  const qi = sequelize.getQueryInterface();
  let table: Record<string, unknown>;
  try {
    table = await qi.describeTable('ai_provider_settings');
  } catch {
    return;
  }
  if (!table.size_drawing_prompt) {
    await qi.addColumn('ai_provider_settings', 'size_drawing_prompt', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.size_drawing_refine_prompt) {
    await qi.addColumn('ai_provider_settings', 'size_drawing_refine_prompt', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  if (!table.size_drawing_style_image) {
    await qi.addColumn('ai_provider_settings', 'size_drawing_style_image', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.product_photo_style_image) {
    await qi.addColumn('ai_provider_settings', 'product_photo_style_image', {
      type: DataTypes.STRING,
      allowNull: true,
    });
  }
  if (!table.product_photo_style_prompt) {
    await qi.addColumn('ai_provider_settings', 'product_photo_style_prompt', {
      type: DataTypes.TEXT,
      allowNull: true,
    });
  }
  const row = await AiProviderSettings.findByPk(AI_PROVIDER_SETTINGS_ID);
  if (row && isLegacyProductPhotoStylePrompt(String(row.get('product_photo_style_prompt') || ''))) {
    await row.update({ product_photo_style_prompt: '' });
  }
}

export async function backfillLightxProductCodes(): Promise<void> {
  const rows = await Product.findAll({
    where: { external_source: 'lightx' },
    include: [
      { model: ProductType, as: 'type' },
      { model: ProductSeries, as: 'series', include: [{ model: ProductType, as: 'type' }] },
    ],
  });

  for (const row of rows) {
    const currentCode = String(row.get('product_code') || '').trim();
    const currentName = String(row.get('name') || '').trim();
    const alreadyHasVendor = Boolean(String(row.get('vendor_code') || '').trim());
    if (isLevoSku(currentCode) && alreadyHasVendor) continue;

    const plain = row.get({ plain: true }) as {
      type?: { name?: string; slug?: string };
      series?: { type?: { name?: string; slug?: string } };
      wattage?: number | null;
    };
    const type = plain.type || plain.series?.type || {};
    const typeName = String(type.name || 'Light');
    const typeSlug = String(type.slug || '');
    const wattage = plain.wattage ?? (row.get('wattage') as number | null);
    const patch: Record<string, unknown> = {};

    if (!String(row.get('vendor_code') || '').trim() && currentCode && !isLevoSku(currentCode)) {
      patch.vendor_code = currentCode;
    }
    if (!String(row.get('vendor_model') || '').trim() && currentName) {
      patch.vendor_model = currentName;
    }
    if (!isLevoSku(currentCode)) {
      patch.product_code = await allocateNextProductCode(productCodePrefix(typeSlug));
    }
    patch.name = levoDisplayName(typeName, wattage, typeSlug);
    patch.description = '';

    await row.update(patch);
  }
}
