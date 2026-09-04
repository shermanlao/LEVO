import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class VariantOptionCatalog extends Model {}

VariantOptionCatalog.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kind: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    label_image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'VariantOptionCatalog',
    tableName: 'variant_option_catalog',
    timestamps: false,
    indexes: [{ unique: true, fields: ['kind', 'value'] }],
  }
);

export default VariantOptionCatalog;
