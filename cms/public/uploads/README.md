# Uploads Directory

This directory is used by Strapi CMS to store uploaded files such as product images.

## Structure

- `images/` - Contains product images
  - `downlights/` - Downlight product images
  - `track-spotlights/` - Track spotlight product images
  - `pendants/` - Pendant light product images

## Notes

- When you upload images through the Strapi admin panel, they will be stored in this directory
- The directory structure may be different depending on your Strapi configuration
- For sample product images, check the `scripts/sample-product-images.html` file

If you delete files from this directory, make sure to also delete the corresponding media entries in the Strapi admin panel. 