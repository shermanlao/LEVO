import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class AiTokenUsageLog extends Model {}

AiTokenUsageLog.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    feature: { type: DataTypes.STRING, allowNull: false },
    provider: { type: DataTypes.STRING, allowNull: true },
    model_id: { type: DataTypes.STRING, allowNull: true },
    success: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    http_status: { type: DataTypes.INTEGER, allowNull: true },
    prompt_tokens: { type: DataTypes.INTEGER, allowNull: true },
    completion_tokens: { type: DataTypes.INTEGER, allowNull: true },
    total_tokens: { type: DataTypes.INTEGER, allowNull: true },
    cost_usd: { type: DataTypes.FLOAT, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'AiTokenUsageLog',
    tableName: 'ai_token_usage_log',
    timestamps: false,
  }
);

export default AiTokenUsageLog;
