import { DataTypes, Model } from 'sequelize';
import sequelize from '../database';
import type { AdminPageKey, AdminRole } from '../lib/shared/admin-roles';

class AdminRolePermission extends Model {
  declare id: number;
  declare role: AdminRole;
  declare page_key: AdminPageKey;
  declare created_at: Date | null;
  declare updated_at: Date | null;
}

AdminRolePermission.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    page_key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: 'AdminRolePermission',
    tableName: 'admin_role_permissions',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [{ unique: true, fields: ['role', 'page_key'] }],
  }
);

export default AdminRolePermission;
