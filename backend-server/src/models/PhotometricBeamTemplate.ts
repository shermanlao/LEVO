import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class PhotometricBeamTemplate extends Model {}

PhotometricBeamTemplate.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    beamDegrees: { type: DataTypes.INTEGER, allowNull: false },
    family: { type: DataTypes.STRING, allowNull: false, defaultValue: 'circular' },
    fileName: { type: DataTypes.STRING, allowNull: false },
    filePath: { type: DataTypes.STRING, allowNull: false },
    fileSize: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    source: { type: DataTypes.STRING, allowNull: false, defaultValue: 'calculated' },
    uploadedAt: { type: DataTypes.DATE, allowNull: true },
    createdAt: { type: DataTypes.DATE, allowNull: true },
    updatedAt: { type: DataTypes.DATE, allowNull: true },
  },
  {
    sequelize,
    modelName: 'PhotometricBeamTemplate',
    tableName: 'photometric_beam_templates',
    timestamps: true,
    indexes: [{ unique: true, fields: ['family', 'beamDegrees'] }],
  }
);

export default PhotometricBeamTemplate;
