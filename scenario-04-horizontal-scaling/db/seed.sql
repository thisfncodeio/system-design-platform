-- Seed 5,000 products across several categories
INSERT INTO products (name, category, price_cents, stock, description)
SELECT
  'Product ' || i,
  (ARRAY['electronics', 'clothing', 'books', 'home', 'sports'])[floor(random() * 5 + 1)],
  floor(random() * 50000 + 99)::int,
  floor(random() * 500)::int,
  'Description for product ' || i || '. ' || repeat('Lorem ipsum dolor sit amet. ', 5)
FROM generate_series(1, 5000) AS i;

-- Seed 500,000 orders — enough data for the /report query to take
-- meaningful time under load, making horizontal scaling visible in Grafana
INSERT INTO orders (product_id, quantity, total_cents, status)
SELECT
  floor(random() * 5000 + 1)::int,
  floor(random() * 5 + 1)::int,
  floor(random() * 100000 + 99)::int,
  (ARRAY['pending', 'processing', 'shipped', 'delivered'])[floor(random() * 4 + 1)]
FROM generate_series(1, 500000);
