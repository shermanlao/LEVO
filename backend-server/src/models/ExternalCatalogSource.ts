import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

export const DEFAULT_LIGHTX_BASE_URL = 'https://lightx.synology.me/api/external/v1';

class ExternalCatalogSource extends Model {
  declare id: number;
  declare name: string;
  declare base_url: string;
  declare api_key: string | null;
  declare api_password: string | null;
  declare is_active: boolean;
}

ExternalCatalogSource.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    base_url: { type: DataTypes.STRING, allowNull: false, defaultValue: DEFAULT_LIGHTX_BASE_URL },
    api_key: { type: DataTypes.STRING, allowNull: true },
    api_password: { type: DataTypes.STRING, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  },
  {
    sequelize,
    modelName: 'ExternalCatalogSource',
    tableName: 'external_catalog_sources',
    timestamps: false,
  }
);

export default ExternalCatalogSource;
