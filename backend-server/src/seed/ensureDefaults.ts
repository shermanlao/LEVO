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
import { ensureIndex, ensureTable, integerId } from '../lib/dbSchema';
import { hashPassword } from '../lib/adminPassword';
import {
  allocateNextProductCode,
  isLevoSku,
  levoDisplayName,
  productCodePrefix,
} from '../lib/productCode';
import { rewriteLegacyLumenPlaceholders } from '../lib/shared/description-phrase';
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
  DEFAULT_SEO_DESCRIPTION,
  DEFAULT_SEO_TITLE,
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
    body: 'Sign in with a staff ID and password to open the dashboard.',
  },
  {
    helpKey: 'admin.logout',
    title: 'Log out',
    body: 'End the admin session and return to the login page.',
  },
  {
    helpKey: 'admin.users.open',
    title: 'User management',
    body: 'Open the staff directory. Only the admin role can create, edit, or remove accounts.',
  },
  {
    helpKey: 'admin.users.add',
    title: 'Add user',
    body: 'Create a login with a username (used at sign-in). The numeric ID is assigned automatically. Staff can manage the catalog; only admin can manage users.',
  },
  {
    helpKey: 'admin.users.save',
    title: 'Save user',
    body: 'Save role, active state, or a new password for this account.',
  },
  {
    helpKey: 'admin.users.cancel',
    title: 'Cancel',
    body: 'Close the form without saving.',
  },
  {
    helpKey: 'admin.users.delete',
    title: 'Delete user',
    body: 'Remove this login. The last remaining admin cannot be deleted.',
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
    body: 'Provider keys, routing, and usage for size drawings and photo edit.',
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
    helpKey: 'admin.settings.logo_header_upload',
    title: 'Upload header logo',
    body: 'Wordmark shown in the public header and reused in the footer. PNG with a transparent background works best.',
  },
  {
    helpKey: 'admin.settings.logo_header_remove',
    title: 'Use default header logo',
    body: 'Remove the uploaded header logo and use the built-in LEVO wordmark.',
  },
  {
    helpKey: 'admin.settings.logo_pdf_upload',
    title: 'Upload PDF logo',
    body: 'Wordmark drawn on datasheet, installation, and label PDFs. Falls back to the header logo if empty.',
  },
  {
    helpKey: 'admin.settings.logo_pdf_remove',
    title: 'Use default PDF logo',
    body: 'Remove the uploaded PDF logo so datasheets and labels use the header logo or the built-in wordmark.',
  },
  {
    helpKey: 'admin.settings.logo_icon_upload',
    title: 'Upload tab icon',
    body: 'Square icon for the browser tab. Falls back to the built-in L mark if empty.',
  },
  {
    helpKey: 'admin.settings.logo_icon_remove',
    title: 'Use default tab icon',
    body: 'Remove the uploaded tab icon and use the built-in LEVO L mark.',
  },
  {
    helpKey: 'admin.settings.hero_image_upload',
    title: 'Upload hero image',
    body: 'Photo on the homepage hero. The crop board uses the same 3:2 frame as the homepage. Falls back to the built-in hero image if empty.',
  },
  {
    helpKey: 'admin.settings.hero_image_remove',
    title: 'Use default hero image',
    body: 'Remove the uploaded hero photo and use the built-in homepage image.',
  },
  {
    helpKey: 'admin.settings.og_image_upload',
    title: 'Upload Open Graph image',
    body: 'Image used when the site is shared on social networks. Optional.',
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
    title: 'Size packs with no main photo',
    body: 'These size records have no main photo. Open the series variants page to upload one.',
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
    helpKey: 'admin.product_series.featured_image',
    title: 'Series source photo',
    body: 'Upload the full series photo. The crop board then walks through three frames from that source: catalog 16:9, series page 4:5, and family datasheet 1:1. Replacing the source starts those three crops again. Any slot can also Upload / Replace photo with a different file. This is not a product photo.',
  },
  {
    helpKey: 'admin.product_series.featured_catalog',
    title: 'Catalog card crop',
    body: 'Reopen the 16:9 crop used on category pages such as Downlights. Zoom and drag until the fixture fills the card. Empty bars mean the frame is not filled yet.',
  },
  {
    helpKey: 'admin.product_series.featured_page',
    title: 'Series page crop',
    body: 'Reopen the 4:5 crop used as the main gallery photo on the series page. Zoom and drag until the fixture fills that taller frame.',
  },
  {
    helpKey: 'admin.product_series.featured_datasheet',
    title: 'Family datasheet crop',
    body: 'Reopen the 1:1 crop used on the family datasheet hero and the option-list / SKU-dialog thumbs. Zoom and drag until the fixture fills the square.',
  },
  {
    helpKey: 'admin.product_series.featured_replace',
    title: 'Upload or replace this photo',
    body: 'Choose a different file for this frame only — catalog, series page, or datasheet. The shared source photo stays the same. After you pick a file, crop it to this slot.',
  },
  {
    helpKey: 'admin.product_series.featured_different',
    title: 'Use a different image',
    body: 'Crop a different file for the current frame only. The shared source photo is not replaced. Use this when that frame still does not fit the source.',
  },
  {
    helpKey: 'admin.product_types.featured_image',
    title: 'Category photo',
    body: 'Upload the category card image used on /products. The crop board uses the same 16:9 frame as the public category cards.',
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
    body: 'Create a 2D size drawing from Main A and Size Dimensions. Recessed fixtures also need Cut Hole Size. On the series size pack, use Generate by AI. Configure AI keys under Admin → AI settings.',
  },
  {
    helpKey: 'admin.products.photo_ai',
    title: 'Edit photo with AI',
    body: 'Click a filled Main Image A thumbnail in edit mode to chat-edit the photo, then Apply to replace the slot.',
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
    body: 'Template sent when generating a size drawing. A 2D elevation lock is always prepended so the 3D product photo is not copied as an isometric sketch. Placeholders: {{size}}, {{cuthole_line}}, {{hints_line}}.',
  },
  {
    helpKey: 'admin.ai.size_drawing_refine_prompt',
    title: 'Size drawing refine prompt',
    body: 'Template sent when refining a size drawing from chat. If the current drawing is 3D, refine flattens it to a 2D elevation. Placeholders: {{instruction}}, {{size}}, {{cuthole_line}}, {{hints_line}}.',
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
    body: 'Upload a 2D size drawing to copy line style, dimension arrows, and white background when generating size photos. The product crop still supplies the fixture outline.',
  },
  {
    helpKey: 'admin.ai.size_drawing_style_remove',
    title: 'Remove style reference',
    body: 'Clear the size-drawing style photo. Generate by AI then uses the text prompt only.',
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
    body: 'Product types, series, variants, partner catalog, LDT library, and AI settings.',
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
    helpKey: 'admin.nav.users',
    title: 'Users',
    body: 'Open the staff directory. Only the admin role can manage accounts.',
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
    helpKey: 'admin.product_types.datasheet_labels',
    title: 'Datasheet labels',
    body: 'Squares that were previously stored on this category. Extra datasheet icons are now created on Variant and picked on each series.',
  },
  {
    helpKey: 'admin.product_types.label_upload',
    title: 'Upload label',
    body: 'Upload a PNG or JPEG for this product-type datasheet square.',
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
    body: 'Close the series editor without saving.',
  },
  {
    helpKey: 'admin.product_series.retry',
    title: 'Retry connection',
    body: 'Try loading product series from the API again.',
  },
  {
    helpKey: 'admin.product_series.edit',
    title: 'Edit series',
    body: 'Open this series in the editor.',
  },
  {
    helpKey: 'admin.product_series.delete',
    title: 'Delete series',
    body: 'Permanently remove this series.',
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
    body: 'Open the series editor to add wattage, size, CCT, beam, dimming, and other spec option lists.',
  },
  {
    helpKey: 'admin.product_series.option_add',
    title: 'Add option',
    body: 'Add a value to this variant list. Visitors can pick it on the series page.',
  },
  {
    helpKey: 'admin.product_series.option_remove',
    title: 'Remove tag',
    body: 'Click a selected tag to remove it from this series. Listed products are not deleted.',
  },
  {
    helpKey: 'admin.product_series.save_variants',
    title: 'Save variants',
    body: 'Write the option lists and LDT shape for this series.',
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
    helpKey: 'admin.product_series.option_pick',
    title: 'Add tag',
    body: 'Click a tag to add this catalog option to the series.',
  },
  {
    helpKey: 'admin.product_series.option_new',
    title: 'Add new option',
    body: 'Create a new option and SKU code on the Variant page, then click its tag on this series.',
  },
  {
    helpKey: 'admin.product_series.featured',
    title: 'Featured series',
    body: 'Show this series in the homepage featured section.',
  },
  {
    helpKey: 'admin.product_series.size_photo_a',
    title: 'Size main photo A',
    body: 'Main photo for this series size. Used on the public option table and datasheet. The crop board uses the same square frame as the product photo slots.',
  },
  {
    helpKey: 'admin.product_series.size_photo_b',
    title: 'Size main photo B',
    body: 'Optional second photo for this series size.',
  },
  {
    helpKey: 'admin.product_series.size_drawing',
    title: 'Size drawing',
    body: 'Dimension drawing for this series size. Upload a file or Generate by AI from Main A. Used on datasheets and the option preview.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai',
    title: 'Generate by AI',
    body: 'Create a 2D size drawing from Main A, Dimensions, and Cutout when the series is recessed. Crop the fixture, then Apply to save. Configure AI keys under Admin → AI settings.',
  },
  {
    helpKey: 'admin.product_series.size_drawing_ai_focus',
    title: 'Continue',
    body: 'Crop the fixture on the main photo, then generate the size drawing.',
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
    body: 'Save the generated size drawing onto this size pack. Used on datasheets and the option preview.',
  },
  {
    helpKey: 'admin.product_series.appearance_photos',
    title: 'Appearance photos',
    body: 'Product photos for Finish, Trim, and Reflector combinations. Generate from size Main A, then Confirm to save. Visitors and datasheets only see confirmed photos.',
  },
  {
    helpKey: 'admin.product_series.appearance_generate',
    title: 'Generate by AI',
    body: 'Recolor the size Main A photo for this Finish / Trim / Reflector combination. The preview stays pending until you Confirm. Discard keeps the previous saved photo.',
  },
  {
    helpKey: 'admin.product_series.appearance_generate_missing',
    title: 'Generate missing',
    body: 'Create previews for every Finish × Trim × Reflector combination that still has no saved image and no pending preview. Confirm each photo (or Confirm all) to store it. Does not overwrite saved photos.',
  },
  {
    helpKey: 'admin.product_series.appearance_generate_all',
    title: 'Generate all',
    body: 'Generate a pending preview for every Finish × Trim × Reflector combination from size Main A. Regenerates AI photos. Does not overwrite photos you uploaded yourself. Confirm to save.',
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
    body: 'Save every pending AI preview on this series. Use after Generate missing or Generate all.',
  },
  {
    helpKey: 'admin.product_series.appearance_discard_all',
    title: 'Discard all appearance previews',
    body: 'Clear every unsaved AI preview. Saved photos are not removed.',
  },
  {
    helpKey: 'admin.product_series.appearance_upload',
    title: 'Upload appearance photo',
    body: 'Replace this combination with a real product photo. The crop board uses the same square frame as the appearance slot. Staff uploads are not overwritten by Generate missing or Generate all.',
  },
  {
    helpKey: 'admin.product_series.appearance_remove',
    title: 'Remove appearance photo',
    body: 'Clear this combination photo. The catalog falls back to the size Main A photo.',
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
    body: 'Replace this datasheet square with a PNG or JPEG. Used on the PDF and the series preview dialog.',
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
  for (const row of DEFAULT_PRODUCT_TYPES) {
    await ProductType.findOrCreate({
      where: { slug: row.slug },
      defaults: { ...row },
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
  if (!String(row.get('seo_title') || '').trim()) patch.seo_title = DEFAULT_SEO_TITLE;
  if (!String(row.get('seo_description') || '').trim()) patch.seo_description = DEFAULT_SEO_DESCRIPTION;
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

export async function ensureDefaultAdminUser(): Promise<void> {
  const count = await AdminUser.count();
  if (count > 0) return;
  const username = (process.env.ADMIN_USERNAME || 'admin').trim() || 'admin';
  const password = process.env.ADMIN_PASSWORD || 'abc4321';
  await AdminUser.create({
    username,
    password_hash: hashPassword(password),
    role: 'admin',
    active: true,
  });
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
  await ensureIndex(
    `CREATE UNIQUE INDEX IF NOT EXISTS product_series_product_code_unique
     ON product_series (product_code)
     WHERE product_code IS NOT NULL AND product_code <> ''`
  );
  await rewriteSeriesPhraseLumenPlaceholders();
  await backfillSeriesCatalogFields();
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
    main_image_A: { type: DataTypes.STRING, allowNull: false, defaultValue: '' },
    source_product_id: { type: DataTypes.INTEGER, allowNull: true },
    generated_by_ai: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  });
  await ensureIndex(
    'CREATE UNIQUE INDEX IF NOT EXISTS series_appearance_photos_combo ON series_appearance_photos (series_id, colour, trim_color, reflector_finish)'
  );
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
