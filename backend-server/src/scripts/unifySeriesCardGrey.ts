import '../lib/loadEnv';
import sequelize from '../database';
import { unifyExistingSeriesCards } from '../lib/unifySeriesCardGrey';

async function main(): Promise<void> {
  await sequelize.authenticate();
  const result = await unifyExistingSeriesCards();
  console.log(
    `card grey: ${result.rewritten} rewritten, ${result.skipped} skipped, ${result.missing} missing`
  );
}

main()
  .then(() => sequelize.close())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
