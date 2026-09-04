import sequelize from '../database';
import { ensureDefaultProductTypes, ensureDefaultHelpTips, ensureDefaultCatalogSource, ensureDefaultSiteContact, ensureDefaultAdminUser, ensureProductExternalColumns, ensureProductTypeColumns, ensureSeriesFeaturedImageColumn, ensureSeriesOptions, ensureSeriesAppearancePhotos, ensureVariantOptionCatalog, ensureAiSettingsColumns, ensureProjectFeaturedColumn, backfillLightxProductCodes } from '../seed/ensureDefaults';
import AdminUser from './AdminUser';
import { ensurePhotometricBeamLibrary } from '../lib/photometric/beamLibraryServer';
import { backfillMissingProductLdtFiles } from '../lib/photometric/persistProductLdt';
import Project from './Project';
import ProjectSection from './ProjectSection';
import ProjectSectionImage from './ProjectSectionImage';
import ProjectProduct from './ProjectProduct';
import ProjectParagraph from './ProjectParagraph';
import Product from './Product';
import ProductType from './ProductType';
import ProductSeries from './ProductSeries';
import SeriesOption from './SeriesOption';
import SeriesAppearancePhoto from './SeriesAppearancePhoto';
import VariantOptionCatalog from './VariantOptionCatalog';
import ExternalCatalogSource from './ExternalCatalogSource';
import HelpTip from './HelpTip';
import SiteContact from './SiteContact';
import ContactInquiry from './ContactInquiry';
import PhotometricBeamTemplate from './PhotometricBeamTemplate';
import AiProviderSettings from './AiProviderSettings';
import AiTokenUsageLog from './AiTokenUsageLog';
import VisitorEvent from './VisitorEvent';
import { pruneOldVisitorEvents } from '../controllers/dashboardController';

// Project has many paragraphs
Project.hasMany(ProjectParagraph, { foreignKey: 'project_id', as: 'paragraphs', onDelete: 'CASCADE' });
ProjectParagraph.belongsTo(Project, { foreignKey: 'project_id' });

// Sections, products, section images (single place — avoids duplicate Sequelize aliases)
Project.hasMany(ProjectSection, { foreignKey: 'project_id', as: 'sections', onDelete: 'CASCADE' });
ProjectSection.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

Project.hasMany(ProjectProduct, { foreignKey: 'project_id', as: 'products', onDelete: 'CASCADE' });
ProjectProduct.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

ProjectSection.hasMany(ProjectSectionImage, { foreignKey: 'section_id', as: 'images', onDelete: 'CASCADE' });
ProjectSectionImage.belongsTo(ProjectSection, { foreignKey: 'section_id', as: 'section' });

// Product associations
Product.belongsTo(ProductSeries, { foreignKey: 'series_id', as: 'series' });
Product.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'type' });
ProductSeries.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'type' });
ProductSeries.hasMany(Product, { foreignKey: 'series_id', as: 'products' });
ProductSeries.hasMany(SeriesOption, { foreignKey: 'series_id', as: 'options', onDelete: 'CASCADE' });
SeriesOption.belongsTo(ProductSeries, { foreignKey: 'series_id', as: 'series' });
ProductSeries.hasMany(SeriesAppearancePhoto, { foreignKey: 'series_id', as: 'appearance_photos', onDelete: 'CASCADE' });
SeriesAppearancePhoto.belongsTo(ProductSeries, { foreignKey: 'series_id', as: 'series' });

async function syncDatabase() {
  try {
    await sequelize.sync();
    await ensureProductExternalColumns();
    await ensureProductTypeColumns();
    await ensureSeriesFeaturedImageColumn();
    await ensureSeriesOptions();
    await ensureSeriesAppearancePhotos();
    await ensureVariantOptionCatalog();
    await ensureAiSettingsColumns();
    await ensureProjectFeaturedColumn();
    await ensureDefaultProductTypes();
    await ensureDefaultHelpTips();
    await ensureDefaultCatalogSource();
    await ensureDefaultSiteContact();
    await ensureDefaultAdminUser();
    await backfillLightxProductCodes();
    await ensurePhotometricBeamLibrary();
    await backfillMissingProductLdtFiles();
    await pruneOldVisitorEvents();
    console.log('All models were synchronized successfully.');
  } catch (error) {
    console.error('Failed to synchronize models:', error);
  }
}

syncDatabase();

export {
  Project,
  ProjectSection,
  ProjectSectionImage,
  ProjectProduct,
  ProjectParagraph,
  Product,
  ProductType,
  ProductSeries,
  SeriesOption,
  SeriesAppearancePhoto,
  VariantOptionCatalog,
  ExternalCatalogSource,
  HelpTip,
  SiteContact,
  ContactInquiry,
  PhotometricBeamTemplate,
  AiProviderSettings,
  AiTokenUsageLog,
  AdminUser,
  VisitorEvent,
};
