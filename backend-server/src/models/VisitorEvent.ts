import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class VisitorEvent extends Model {
  declare id: number;
  declare visitor_key: string;
  declare path: string;
  declare country: string | null;
  declare referrer: string | null;
  declare query_params: string | null;
  declare duration_ms: number | null;
  declare created_at: Date;
}

VisitorEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    visitor_key: { type: DataTypes.STRING, allowNull: false },
    path: { type: DataTypes.STRING, allowNull: false },
    country: { type: DataTypes.STRING(2), allowNull: true },
    referrer: { type: DataTypes.STRING(500), allowNull: true },
    query_params: { type: DataTypes.STRING(500), allowNull: true },
    duration_ms: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'VisitorEvent',
    tableName: 'visitor_events',
    timestamps: false,
    indexes: [
      { fields: ['created_at'] },
      { fields: ['visitor_key'] },
      { fields: ['path'] },
      { fields: ['country'] },
      { fields: ['referrer'] },
    ],
  }
);

export default VisitorEvent;
