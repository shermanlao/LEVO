/**
 * Database connection module
 */

const Database = require('better-sqlite3');
const path = require('path');

// Set the path to the SQLite database
const DB_PATH = path.join(__dirname, '../database/database.sqlite');

// Connect to the database
let db;
try {
  db = new Database(DB_PATH);
  
  // Simple database validation
  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all();
  if (tables.length === 0) {
    console.error('No tables found in the database.');
  }
} catch (err) {
  console.error(`Failed to connect to database: ${err.message}`);
  process.exit(1);
}

// Export the database instance
module.exports = db; 