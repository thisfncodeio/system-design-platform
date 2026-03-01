/**
 * SEED SCRIPT
 *
 * Creates enough data to make the slow queries actually slow:
 *   - 1,000 users
 *   - 100,000 products across 6 categories
 *   - 100,000 orders spread across users
 *
 * Why these numbers?
 * With only 100 rows, every query is fast regardless of indexes.
 * 100,000 rows is enough to feel the difference between
 * a sequential scan and an index scan — for both orders AND products.
 *
 * Run: node db/seed.js
 */

const { Pool } = require("pg");

const db = new Pool({
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || "shopdb",
  user: process.env.DB_USER || "postgres",
  password: process.env.DB_PASSWORD || "postgres",
});

const USERS = 1000;
const PRODUCTS = 100000;
const ORDERS = 100000;

const categories = ["electronics", "clothing", "books", "home", "sports", "toys"];

// Weight statuses so most orders are delivered (realistic)
const statusWeights = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "delivered",
  "delivered",
  "cancelled",
];

const productNames = {
  electronics: [
    "Laptop",
    "Phone",
    "Tablet",
    "Headphones",
    "Monitor",
    "Keyboard",
    "Mouse",
    "Charger",
    "Speaker",
    "Camera",
  ],
  clothing: [
    "T-Shirt",
    "Jeans",
    "Jacket",
    "Shoes",
    "Hat",
    "Socks",
    "Dress",
    "Shorts",
    "Sweater",
    "Coat",
  ],
  books: [
    "Novel",
    "Textbook",
    "Cookbook",
    "Biography",
    "Self-Help",
    "History",
    "Science",
    "Art Book",
    "Travel Guide",
    "Poetry",
  ],
  home: ["Lamp", "Rug", "Pillow", "Blanket", "Vase", "Frame", "Clock", "Candle", "Shelf", "Mirror"],
  sports: [
    "Yoga Mat",
    "Weights",
    "Resistance Band",
    "Water Bottle",
    "Running Shoes",
    "Gloves",
    "Jump Rope",
    "Foam Roller",
    "Bag",
    "Towel",
  ],
  toys: [
    "Puzzle",
    "Board Game",
    "Action Figure",
    "Doll",
    "Lego Set",
    "Remote Car",
    "Stuffed Animal",
    "Card Game",
    "Art Kit",
    "Building Blocks",
  ],
};

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("Seeding database...\n");

  const existing = await db.query("SELECT COUNT(*) FROM orders");
  if (parseInt(existing.rows[0].count) > 0) {
    console.log("✅ Database already seeded. Skipping.");
    await db.end();
    return;
  }

  // Users
  console.log(`Creating ${USERS} users...`);
  const userIds = [];
  for (let i = 1; i <= USERS; i++) {
    const result = await db.query(
      "INSERT INTO users (email) VALUES ($1) ON CONFLICT (email) DO NOTHING RETURNING id",
      [`user${i}@example.com`],
    );
    if (result.rows[0]) userIds.push(result.rows[0].id);
  }
  if (userIds.length === 0) {
    const r = await db.query("SELECT id FROM users LIMIT $1", [USERS]);
    userIds.push(...r.rows.map((r) => r.id));
  }
  console.log(`✓ ${userIds.length} users ready\n`);

  // Products in batches
  console.log(`Creating ${PRODUCTS.toLocaleString()} products...`);
  const PRODUCT_BATCH = 1000;
  let productsCreated = 0;

  while (productsCreated < PRODUCTS) {
    const batch = [];
    const values = [];
    let idx = 1;

    for (let i = 0; i < PRODUCT_BATCH && productsCreated + i < PRODUCTS; i++) {
      const globalIdx = productsCreated + i;
      const category = categories[globalIdx % categories.length];
      const names = productNames[category];
      const name = `${names[globalIdx % names.length]} ${Math.floor(globalIdx / names.length) + 1}`;
      const priceCents = randomBetween(499, 99999);
      const stock = randomBetween(0, 500);

      batch.push(`($${idx}, $${idx + 1}, $${idx + 2}, $${idx + 3})`);
      values.push(name, category, priceCents, stock);
      idx += 4;
    }

    await db.query(
      `INSERT INTO products (name, category, price_cents, stock) VALUES ${batch.join(", ")}`,
      values,
    );

    productsCreated += PRODUCT_BATCH;
    process.stdout.write(
      `\r${Math.min(productsCreated, PRODUCTS).toLocaleString()} / ${PRODUCTS.toLocaleString()} products`,
    );
  }

  console.log(`\n✓ ${PRODUCTS.toLocaleString()} products ready\n`);

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
      `INSERT INTO orders (user_id, status, total_cents, created_at) VALUES ${batch.join(", ")}`,
      values,
    );

    created += BATCH;
    process.stdout.write(
      `\r${Math.min(created, ORDERS).toLocaleString()} / ${ORDERS.toLocaleString()} orders`,
    );
  }

  console.log(`\n✓ ${ORDERS.toLocaleString()} orders ready\n`);
  console.log("✅ Database seeded and ready for the scenario.");

  await db.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
