import '../lib/loadEnv';
import path from 'path';
import { QueryTypes, Sequelize } from 'sequelize';

const COPY_TABLES = [
  'product_types',
  'product_series',
  'products',
  'series_options',
  'series_appearance_photos',
  'variant_option_catalog',
  'product_code_sequences',
  'projects',
  'project_sections',
  'project_section_images',
  'project_products',
  'project_paragraphs',
  'help_tips',
  'site_contacts',
  'external_catalog_sources',
  'contact_inquiries',
  'photometric_beam_templates',
  'ai_provider_settings',
  'ai_token_usage_log',
  'admin_users',
  'visitor_events',
] as const;

const BOOLEAN_HINTS = /^(is_|has_|active|generated_by_ai|size_image_ai)/;

function requirePostgresUrl(): string {
  const url = String(process.env.DATABASE_URL || '').trim();
  if (!/^postgres(ql)?:\/\//i.test(url)) {
    throw new Error('Set DATABASE_URL to a postgres:// connection string before copying.');
  }
  return url;
}

function sqliteStorage(): string {
  return process.env.SQLITE_PATH || path.join(__dirname, '..', '..', 'database.sqlite');
}

function postgresSsl() {
  const raw = String(process.env.DATABASE_SSL || '').trim().toLowerCase();
  if (raw !== '1' && raw !== 'true' && raw !== 'yes') return undefined;
  return {
    ssl: {
      require: true,
      rejectUnauthorized: String(process.env.DATABASE_SSL_INSECURE || '').trim() !== '1',
    },
  };
}

function asBoolean(value: unknown): boolean | null {
  if (value == null) return null;
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return Boolean(value);
}

async function tableExists(db: Sequelize, name: string): Promise<boolean> {
  const dialect = db.getDialect();
  if (dialect === 'sqlite') {
    const rows = (await db.query(
      `SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?`,
      { replacements: [name], type: QueryTypes.SELECT }
    )) as { name: string }[];
    return rows.length > 0;
  }
  const rows = (await db.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = current_schema() AND table_name = ?`,
    { replacements: [name], type: QueryTypes.SELECT }
  )) as unknown[];
  return rows.length > 0;
}

async function resetIdentity(db: Sequelize, table: string): Promise<void> {
  await db.query(
    `SELECT setval(
       pg_get_serial_sequence(?, 'id'),
       COALESCE((SELECT MAX(id) FROM ${table}), 1),
       (SELECT MAX(id) IS NOT NULL FROM ${table})
     )`,
    { replacements: [table] }
  ).catch(() => undefined);
}

async function main(): Promise<void> {
  const sqlite = new Sequelize({
    dialect: 'sqlite',
    storage: sqliteStorage(),
    logging: false,
  });
  const postgres = new Sequelize(requirePostgresUrl(), {
    dialect: 'postgres',
    logging: false,
    dialectOptions: postgresSsl(),
  });

  await sqlite.authenticate();
  await postgres.authenticate();
  console.log(`Copy ${sqliteStorage()} → ${process.env.DATABASE_URL}`);

  for (const table of [...COPY_TABLES].reverse()) {
    if (await tableExists(postgres, table)) {
      await postgres.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
    }
  }

  for (const table of COPY_TABLES) {
    if (!(await tableExists(sqlite, table))) {
      console.log(`skip ${table} (missing in SQLite)`);
      continue;
    }
    if (!(await tableExists(postgres, table))) {
      console.log(`skip ${table} (missing in PostgreSQL — start the API once so tables are created)`);
      continue;
    }

    const rows = (await sqlite.query(`SELECT * FROM ${table}`, {
      type: QueryTypes.SELECT,
    })) as Record<string, unknown>[];

    if (!rows.length) {
      console.log(`copied ${table}: 0 rows`);
      continue;
    }

    const columns = Object.keys(rows[0]);
    const quoted = columns.map((name) => `"${name}"`).join(', ');
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${table} (${quoted}) VALUES (${placeholders})`;

    for (const row of rows) {
      const values = columns.map((name) => {
        const value = row[name];
        if (BOOLEAN_HINTS.test(name)) return asBoolean(value);
        return value;
      });
      await postgres.query(sql, { replacements: values });
    }

    await resetIdentity(postgres, table);
    console.log(`copied ${table}: ${rows.length} rows`);
  }

  await sqlite.close();
  await postgres.close();
  console.log('Copy complete.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
