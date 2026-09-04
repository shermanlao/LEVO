import { Model, DataTypes, Optional } from 'sequelize';
import sequelize from '../database';
import Project from './Project';

// These are all the attributes in the ProjectParagraph model
interface ProjectParagraphAttributes {
  id: number;
  project_id: number;
  content: string;
  order: number;
  created_at?: Date;
  updated_at?: Date;
}

// Some attributes are optional in `ProjectParagraph.build` and `ProjectParagraph.create` calls
interface ProjectParagraphCreationAttributes extends Optional<ProjectParagraphAttributes, 'id'> {}

class ProjectParagraph extends Model<ProjectParagraphAttributes, ProjectParagraphCreationAttributes> implements ProjectParagraphAttributes {
  public id!: number;
  public project_id!: number;
  public content!: string;
  public order!: number;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;
}

ProjectParagraph.init(
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
    tableName: 'project_paragraphs',
    timestamps: true,
    underscored: true,
  }
);

// Setup associations
ProjectParagraph.belongsTo(Project, { foreignKey: 'project_id', as: 'project' });

export default ProjectParagraph; 