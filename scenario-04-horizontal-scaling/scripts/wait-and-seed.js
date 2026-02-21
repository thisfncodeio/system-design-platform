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

  // Check orders specifically — that's the 500k row table that takes time to seed.
  // Checking products alone isn't enough: products seed fast, and if the process
  // was killed between the products INSERT and the orders INSERT, products would
  // exist but orders would be empty. The next startup would silently skip seeding.
  const existing = await db.query('SELECT COUNT(*) FROM orders');
  if (parseInt(existing.rows[0].count) >= 500000) {
    console.log('✅ Database already seeded, skipping');
    console.log('\n✅ Environment ready. Open SCENARIO.md to begin.\n');
    await db.end();
    return;
  }

  console.log('🌱 Seeding data (this takes 30–60 seconds for 500k orders)...');
  await db.query(seedData);

  const count = await db.query('SELECT COUNT(*) FROM orders');
  console.log(`✅ Seeded 5,000 products and ${count.rows[0].count} orders`);
  console.log('\n✅ Environment ready. Open SCENARIO.md to begin.\n');
  await db.end();
}

waitForDb()
  .then(seed)
  .catch(err => {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  });
