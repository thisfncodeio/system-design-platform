const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'catalogdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function waitForDb(retries = 20, delay = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await db.query('SELECT 1');
      console.log('✅ Database ready');
      return;
    } catch (err) {
      console.log(`⏳ Waiting for database... (${i + 1}/${retries})`);
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Database never became ready');
}

async function seed() {
  const schema = fs.readFileSync(path.join(__dirname, '../db/schema.sql'), 'utf8');
  const seedData = fs.readFileSync(path.join(__dirname, '../db/seed.sql'), 'utf8');

  console.log('📦 Running schema...');
  await db.query(schema);

  const existing = await db.query('SELECT COUNT(*) FROM products');
  if (parseInt(existing.rows[0].count) > 0) {
    console.log('✅ Database already seeded, skipping');
    await db.end();
    return;
  }

  console.log('🌱 Seeding data...');
  await db.query(seedData);

  const count = await db.query('SELECT COUNT(*) FROM products');
  console.log(`✅ Seeded ${count.rows[0].count} products`);
  await db.end();
}

waitForDb()
  .then(seed)
  .catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  });
