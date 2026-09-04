import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../database';

// These are all the attributes in the ProjectProduct model
interface ProjectProductAttributes {
  id: number;
  project_id: number;
  name: string;
  image: string;
  url: string;
  order: number;
  created_at?: Date;
  updated_at?: Date;
}

// Some attributes are optional in `ProjectProduct.build` and `ProjectProduct.create` calls
interface ProjectProductCreationAttributes extends Optional<ProjectProductAttributes, 'id'> {}

class ProjectProduct extends Model<ProjectProductAttributes, ProjectProductCreationAttributes> implements ProjectProductAttributes {
  public id!: number;
  public project_id!: number;
  public name!: string;
  public image!: string;
  public url!: string;
  public order!: number;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ProjectProduct.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    project_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'projects',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    sequelize,
    tableName: 'project_products',
    timestamps: true,
    underscored: true,
  }
);

export default ProjectProduct; 