import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class VisitorEvent extends Model {
  declare id: number;
  declare visitor_key: string;
  declare path: string;
  declare created_at: Date;
}

VisitorEvent.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    visitor_key: { type: DataTypes.STRING, allowNull: false },
    path: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'VisitorEvent',
    tableName: 'visitor_events',
    timestamps: false,
    indexes: [{ fields: ['created_at'] }, { fields: ['visitor_key'] }, { fields: ['path'] }],
  }
);

export default VisitorEvent;
