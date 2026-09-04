import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';

class ContactInquiry extends Model {
  declare id: number;
  declare name: string;
  declare email: string;
  declare message: string;
  declare created_at: Date;
}

ContactInquiry.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    sequelize,
    modelName: 'ContactInquiry',
    tableName: 'contact_inquiries',
    timestamps: false,
  }
);

export default ContactInquiry;
