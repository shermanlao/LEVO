import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class SeriesAppearancePhoto extends Model {}

SeriesAppearancePhoto.init(
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
    colour: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    trim_color: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    reflector_finish: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    main_image_A: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '',
    },
    source_product_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    generated_by_ai: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
  },
  {
    sequelize,
    modelName: 'SeriesAppearancePhoto',
    tableName: 'series_appearance_photos',
    timestamps: false,
  }
);

export default SeriesAppearancePhoto;
