// DO NOT MODIFY — simulation infrastructure, not part of the exercise.
//
// Checks whether a given index exists on a table. If it doesn't, applies a
// delay to simulate what that missing index feels like at production scale.
// The delay clears itself as soon as the real index is created.

async function artificialDatabaseTableLatency(
  db,
  tablename,
  indexname = "idx_posts_created_at",
  delayMs = 500,
) {
  // Check if the index exists
  const { rows } = await db.query(
    `SELECT 1 FROM pg_indexes WHERE tablename = $1 AND indexname = $2`,
    [tablename, indexname],
  );
  // If the index does not exist, add a delay to simulate the latency
  if (rows.length === 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
}

module.exports = { artificialDatabaseTableLatency };
