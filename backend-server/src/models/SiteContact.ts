import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class SiteContact extends Model {
  declare id: number;
  declare heading: string;
  declare intro: string;
  declare email: string;
  declare phone: string;
  declare address: string;
  declare hours: string;
  declare website: string | null;
  declare datasheet_disclaimer: string | null;
  declare slogan: string | null;
  declare company_name: string | null;
  declare company_short_name: string | null;
  declare logo_header: string | null;
  declare logo_pdf: string | null;
  declare logo_icon: string | null;
  declare hero_title: string | null;
  declare hero_subtitle: string | null;
  declare hero_cta_label: string | null;
  declare hero_cta_href: string | null;
  declare hero_image: string | null;
  declare featured_heading: string | null;
  declare featured_projects_heading: string | null;
  declare why_heading: string | null;
  declare why_cards: string | null;
  declare social_linkedin: string | null;
  declare social_instagram: string | null;
  declare social_facebook: string | null;
  declare social_threads: string | null;
  declare social_pinterest: string | null;
  declare resource_warranty_title: string | null;
  declare resource_warranty_body: string | null;
  declare resource_certifications_title: string | null;
  declare resource_certifications_body: string | null;
  declare resource_technical_title: string | null;
  declare resource_technical_body: string | null;
  declare seo_title: string | null;
  declare seo_description: string | null;
  declare og_image: string | null;
}

SiteContact.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    heading: { type: DataTypes.STRING, allowNull: false },
    intro: { type: DataTypes.TEXT, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING, allowNull: false },
    address: { type: DataTypes.STRING, allowNull: false },
    hours: { type: DataTypes.STRING, allowNull: false },
    website: { type: DataTypes.STRING, allowNull: true },
    datasheet_disclaimer: { type: DataTypes.TEXT, allowNull: true },
    slogan: { type: DataTypes.STRING, allowNull: true },
    company_name: { type: DataTypes.STRING, allowNull: true },
    company_short_name: { type: DataTypes.STRING, allowNull: true },
    logo_header: { type: DataTypes.STRING, allowNull: true },
    logo_pdf: { type: DataTypes.STRING, allowNull: true },
    logo_icon: { type: DataTypes.STRING, allowNull: true },
    hero_title: { type: DataTypes.STRING, allowNull: true },
    hero_subtitle: { type: DataTypes.TEXT, allowNull: true },
    hero_cta_label: { type: DataTypes.STRING, allowNull: true },
    hero_cta_href: { type: DataTypes.STRING, allowNull: true },
    hero_image: { type: DataTypes.STRING, allowNull: true },
    featured_heading: { type: DataTypes.STRING, allowNull: true },
    featured_projects_heading: { type: DataTypes.STRING, allowNull: true },
    why_heading: { type: DataTypes.STRING, allowNull: true },
    why_cards: { type: DataTypes.TEXT, allowNull: true },
    social_linkedin: { type: DataTypes.STRING, allowNull: true },
    social_instagram: { type: DataTypes.STRING, allowNull: true },
    social_facebook: { type: DataTypes.STRING, allowNull: true },
    social_threads: { type: DataTypes.STRING, allowNull: true },
    social_pinterest: { type: DataTypes.STRING, allowNull: true },
    resource_warranty_title: { type: DataTypes.STRING, allowNull: true },
    resource_warranty_body: { type: DataTypes.TEXT, allowNull: true },
    resource_certifications_title: { type: DataTypes.STRING, allowNull: true },
    resource_certifications_body: { type: DataTypes.TEXT, allowNull: true },
    resource_technical_title: { type: DataTypes.STRING, allowNull: true },
    resource_technical_body: { type: DataTypes.TEXT, allowNull: true },
    seo_title: { type: DataTypes.STRING, allowNull: true },
    seo_description: { type: DataTypes.TEXT, allowNull: true },
    og_image: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'SiteContact',
    tableName: 'site_contacts',
    timestamps: false,
  }
);

export default SiteContact;
