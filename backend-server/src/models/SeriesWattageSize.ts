import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class SeriesWattageSize extends Model {}

SeriesWattageSize.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    series_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    wattage_value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    size_value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: 'SeriesWattageSize',
    tableName: 'series_wattage_sizes',
    timestamps: false,
    indexes: [{ unique: true, fields: ['series_id', 'wattage_value', 'size_value'] }],
  }
);

export default SeriesWattageSize;
