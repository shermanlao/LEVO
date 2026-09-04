import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class AiProviderSettings extends Model {}

AiProviderSettings.init(
  {
    id: { type: DataTypes.STRING, primaryKey: true },
    provider: { type: DataTypes.STRING, allowNull: false, defaultValue: 'xai' },
    base_url: { type: DataTypes.STRING, allowNull: true },
    model_id: { type: DataTypes.STRING, allowNull: true },
    encrypted_provider_keys: { type: DataTypes.TEXT, allowNull: true },
    feature_model_routing: { type: DataTypes.TEXT, allowNull: true },
    parsing_hints: { type: DataTypes.TEXT, allowNull: true },
    size_drawing_prompt: { type: DataTypes.TEXT, allowNull: true },
    size_drawing_refine_prompt: { type: DataTypes.TEXT, allowNull: true },
    size_drawing_style_image: { type: DataTypes.STRING, allowNull: true },
  },
  {
    sequelize,
    modelName: 'AiProviderSettings',
    tableName: 'ai_provider_settings',
    timestamps: false,
  }
);

export default AiProviderSettings;
