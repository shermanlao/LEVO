import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../database';

// These are all the attributes in the ProjectSection model
interface ProjectSectionAttributes {
  id: number;
  project_id: number;
  title: string;
  content: string;
  order: number;
  created_at?: Date;
  updated_at?: Date;
}

// Some attributes are optional in `ProjectSection.build` and `ProjectSection.create` calls
interface ProjectSectionCreationAttributes extends Optional<ProjectSectionAttributes, 'id'> {}

class ProjectSection extends Model<ProjectSectionAttributes, ProjectSectionCreationAttributes> implements ProjectSectionAttributes {
  public id!: number;
  public project_id!: number;
  public title!: string;
  public content!: string;
  public order!: number;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ProjectSection.init(
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
    title: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
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
    tableName: 'project_sections',
    timestamps: true,
    underscored: true,
  }
);

export default ProjectSection; 