import { Model, DataTypes, Optional, HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyHasAssociationMixin, Association } from 'sequelize';
import sequelize from '../database';

// These are all the attributes in the Project model
interface ProjectAttributes {
  id: number;
  slug: string;
  title: string;
  subtitle: string;
  location: string;
  category: string;
  year: string;
  description: string;
  thumbnail: string;
  client: string;
  architect: string;
  lighting_designer: string;
  photography_credits: string;
  is_featured?: boolean;
  created_at?: Date;
  updated_at?: Date;
}

// Some attributes are optional in `Project.build` and `Project.create` calls
interface ProjectCreationAttributes extends Optional<ProjectAttributes, 'id'> {}

class Project extends Model<ProjectAttributes, ProjectCreationAttributes> implements ProjectAttributes {
  public id!: number;
  public slug!: string;
  public title!: string;
  public subtitle!: string;
  public location!: string;
  public category!: string;
  public year!: string;
  public description!: string;
  public thumbnail!: string;
  public client!: string;
  public architect!: string;
  public lighting_designer!: string;
  public photography_credits!: string;
  public is_featured!: boolean;

  // Timestamps
  public readonly created_at!: Date;
  public readonly updated_at!: Date;

  // Project can have many paragraphs
  public getParagraphs!: HasManyGetAssociationsMixin<any>; // Will be populated when model is associated
  public addParagraph!: HasManyAddAssociationMixin<any, number>;
  public hasParagraph!: HasManyHasAssociationMixin<any, number>;

  public readonly paragraphs?: any[]; // Will be populated later by include

  public static associations: {
    paragraphs: Association<Project, any>;
  };
}

Project.init(
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    subtitle: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    year: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    thumbnail: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    client: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    architect: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    lighting_designer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    photography_credits: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    is_featured: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
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
    tableName: 'projects',
    timestamps: true,
    underscored: true,
  }
);

export default Project; 