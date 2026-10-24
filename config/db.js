const Database = require('better-sqlite3');
const path = require('path');

// Lokasi file database.sqlite di root proyek
const dbPath = path.join(__dirname, '..', 'database.sqlite');

// Buka koneksi database
const db = new Database(dbPath, { verbose: console.log });

module.exports = db;