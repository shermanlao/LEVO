import sequelize from './database';
import { ensureDefaultProductTypes } from './seed/ensureDefaults';

/**
 * Upsert product types (safe to run multiple times).
 * Usage: from backend-server folder, `npm run seed`
 */
async function main(): Promise<void> {
  await sequelize.sync();
  await ensureDefaultProductTypes();
  console.log('Seed complete: default product types ensured.');
}

main()
  .then(() => sequelize.close())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
