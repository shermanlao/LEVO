import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';
import type { CookieChoice } from '../lib/cookieConsent';

class CookieConsent extends Model {
  declare id: number;
  declare ip_hash: string;
  declare choice: CookieChoice;
}

CookieConsent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    ip_hash: { type: DataTypes.STRING(64), allowNull: false, unique: true },
    choice: { type: DataTypes.STRING(16), allowNull: false },
  },
  {
    sequelize,
    modelName: 'CookieConsent',
    tableName: 'cookie_consents',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  }
);

export default CookieConsent;
