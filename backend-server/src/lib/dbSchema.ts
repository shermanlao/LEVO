import { DataTypes, type ModelAttributeColumnOptions } from 'sequelize';
import sequelize, { dbDialect } from '../database';

type ColumnSpec = ModelAttributeColumnOptions;

function tableNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => {
    if (typeof item === 'string') return item.toLowerCase();
    if (item && typeof item === 'object' && 'tableName' in item) {
      return String((item as { tableName: string }).tableName).toLowerCase();
    }
    return String(item).toLowerCase();
  });
}

export async function tableExists(name: string): Promise<boolean> {
  const qi = sequelize.getQueryInterface();
  const names = tableNames(await qi.showAllTables());
  return names.includes(name.toLowerCase());
}

export async function ensureTable(
  name: string,
  attributes: Record<string, ColumnSpec>
): Promise<void> {
  if (await tableExists(name)) return;
  await sequelize.getQueryInterface().createTable(name, attributes);
}

export async function ensureIndex(sql: string): Promise<void> {
  try {
    await sequelize.query(sql);
  } catch (error) {
    console.warn(`Could not create index: ${sql}`, error);
  }
}

export const integerId = {
  type: DataTypes.INTEGER,
  allowNull: false,
  primaryKey: true,
  autoIncrement: true,
} as const;

export { dbDialect };
