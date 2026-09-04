import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../database';

// These are all the attributes in the ProjectSectionImage model
interface ProjectSectionImageAttributes {
  id: number;
  section_id: number;
  image_path: string;
  order: number;
  created_at?: Date;
  updated_at?: Date;
}

// Some attributes are optional in `ProjectSectionImage.build` and `ProjectSectionImage.create` calls
interface ProjectSectionImageCreationAttributes extends Optional<ProjectSectionImageAttributes, 'id'> {}

class ProjectSectionImage extends Model<ProjectSectionImageAttributes, ProjectSectionImageCreationAttributes> implements ProjectSectionImageAttributes {
  public id!: number;
  public section_id!: number;
  public image_path!: string;
  public order!: number;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ProjectSectionImage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    section_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'project_sections',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    image_path: {
      type: DataTypes.STRING,
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
    tableName: 'project_section_images',
    timestamps: true,
    underscored: true,
  }
);

export default ProjectSectionImage; 