-- Seed data for Scenario 3
-- 5 workers, 10,000 pending jobs across different types and priorities

INSERT INTO workers (name, jobs_processed) VALUES
  ('worker-01', 1432),
  ('worker-02', 1287),
  ('worker-03', 983),
  ('worker-04', 1541),
  ('worker-05', 876);

-- Generate 10,000 jobs with realistic distribution
INSERT INTO jobs (type, payload, status, priority)
SELECT
  (ARRAY['image_resize', 'send_email', 'generate_report', 'process_payment', 'sync_inventory'])[floor(random() * 5 + 1)],
  jsonb_build_object(
    'user_id', floor(random() * 1000 + 1)::int,
    'resource_id', floor(random() * 5000 + 1)::int
  ),
  (ARRAY['pending', 'done', 'failed'])[floor(random() * 3 + 1)],
  floor(random() * 3)::int
FROM generate_series(1, 10000);

-- Make sure there are plenty of pending jobs to process
UPDATE jobs SET status = 'pending' WHERE id % 3 = 0;
