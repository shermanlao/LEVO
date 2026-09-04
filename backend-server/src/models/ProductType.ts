import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ProductType extends Model {}

ProductType.init({
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
  featured_image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  datasheet_labels: {
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
  modelName: 'ProductType',
  tableName: 'product_types',
  timestamps: false,
});

export default ProductType; 