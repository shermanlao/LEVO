import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ProductSeries extends Model {}

ProductSeries.init({
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  specifications: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  product_type_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  featured_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  featured_image_source: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  featured_image_page: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  featured_image_datasheet: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  ldt_family: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  product_code: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  is_featured: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
  },
  datasheet_labels: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  description_phrase: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: true,
  },
}, {
  sequelize,
  modelName: 'ProductSeries',
  tableName: 'product_series',
  timestamps: false,
});

export default ProductSeries; 