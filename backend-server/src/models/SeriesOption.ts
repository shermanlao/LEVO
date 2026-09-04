import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class SeriesOption extends Model {}

SeriesOption.init(
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
    kind: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    value: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    sort_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    lumen: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    system_lumen: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    dimensions: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    cutout_size: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'SeriesOption',
    tableName: 'series_options',
    timestamps: false,
  }
);

export default SeriesOption;
