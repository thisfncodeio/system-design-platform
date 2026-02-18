/**
 * SEED SCRIPT
 *
 * Creates enough data to make the slow queries actually slow:
 *   - 1,000 users
 *   - 500 products across 6 categories
 *   - 100,000 orders spread across users
 *
 * Why 100,000 orders?
 * With only 100 rows, every query is fast regardless of indexes.
 * 100,000 rows is enough to feel the difference between
 * a sequential scan and an index scan.
 *
 * Run: node db/seed.js
 */

const { Pool } = require('pg');

const db = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'shopdb',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

const USERS = 1000;
const PRODUCTS = 500;
const ORDERS = 100000;

const categories = ['electronics', 'clothing', 'books', 'home', 'sports', 'toys'];
const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];

// Weight statuses so most orders are delivered (realistic)
const statusWeights = ['pending', 'processing', 'shipped', 'delivered', 'delivered', 'delivered', 'cancelled'];

const productNames = {
  electronics: ['Laptop', 'Phone', 'Tablet', 'Headphones', 'Monitor', 'Keyboard', 'Mouse', 'Charger', 'Speaker', 'Camera'],
  clothing: ['T-Shirt', 'Jeans', 'Jacket', 'Shoes', 'Hat', 'Socks', 'Dress', 'Shorts', 'Sweater', 'Coat'],
  books: ['Novel', 'Textbook', 'Cookbook', 'Biography', 'Self-Help', 'History', 'Science', 'Art Book', 'Travel Guide', 'Poetry'],
  home: ['Lamp', 'Rug', 'Pillow', 'Blanket', 'Vase', 'Frame', 'Clock', 'Candle', 'Shelf', 'Mirror'],
  sports: ['Yoga Mat', 'Weights', 'Resistance Band', 'Water Bottle', 'Running Shoes', 'Gloves', 'Jump Rope', 'Foam Roller', 'Bag', 'Towel'],
  toys: ['Puzzle', 'Board Game', 'Action Figure', 'Doll', 'Lego Set', 'Remote Car', 'Stuffed Animal', 'Card Game', 'Art Kit', 'Building Blocks'],
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log('Seeding database...\n');

  // Users
  console.log(`Creating ${USERS} users...`);
  const userIds = [];
  for (let i = 1; i <= USERS; i++) {
    const result = await db.query(
      'INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING id',
      [`user${i}@example.com`]
    );
    if (result.rows[0]) userIds.push(result.rows[0].id);
  }
  if (userIds.length === 0) {
    const r = await db.query('SELECT id FROM users LIMIT $1', [USERS]);
    userIds.push(...r.rows.map(r => r.id));
  }
  console.log(`✓ ${userIds.length} users ready\n`);

  // Products
  console.log(`Creating ${PRODUCTS} products...`);
  const productIds = [];
  for (let i = 0; i < PRODUCTS; i++) {
    const category = categories[i % categories.length];
    const names = productNames[category];
    const name = `${names[i % names.length]} ${Math.floor(i / names.length) + 1}`;
    const priceCents = randomBetween(499, 99999);
    const stock = randomBetween(0, 500);

    const result = await db.query(
      'INSERT INTO products (name, category, price_cents, stock) VALUES ($1, $2, $3, $4) RETURNING id',
      [name, category, priceCents, stock]
    );
    productIds.push(result.rows[0].id);
  }
  console.log(`✓ ${productIds.length} products ready\n`);

  // Orders in batches
  console.log(`Creating ${ORDERS} orders...`);
  const BATCH = 1000;
  let created = 0;

  while (created < ORDERS) {
    const batch = [];
    const values = [];
    let idx = 1;

    for (let i = 0; i < BATCH && created + i < ORDERS; i++) {
      const userId = userIds[randomBetween(0, userIds.length - 1)];
      const status = statusWeights[randomBetween(0, statusWeights.length - 1)];
      const totalCents = randomBetween(499, 49999);
      const daysAgo = randomBetween(0, 365);
      const createdAt = new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000);

      batch.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`);
      values.push(userId, status, totalCents, createdAt.toISOString());
      idx += 4;
    }

    await db.query(
      `INSERT INTO orders (user_id, status, total_cents, created_at) VALUES ${batch.join(', ')}`,
      values
    );

    created += BATCH;
    process.stdout.write(`\r${Math.min(created, ORDERS).toLocaleString()} / ${ORDERS.toLocaleString()} orders`);
  }

  console.log(`\n✓ ${ORDERS.toLocaleString()} orders ready\n`);
  console.log('✅ Database seeded and ready for the scenario.');

  await db.end();
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
