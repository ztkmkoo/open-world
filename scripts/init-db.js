const { initDatabase, DB_PATH } = require("../src/lib/db");

try {
  const db = initDatabase({ applySeed: true });
  db.close();
  console.log(`Database initialized: ${DB_PATH}`);
} catch (error) {
  console.error("Failed to initialize database.");
  console.error(error.message);
  process.exit(1);
}
