const express = require("express"); // Express framework
const { Pool } = require("pg"); // PostgreSQL client library
const client = require("prom-client"); // Prometheus client library

const app = express(); // Create a new Express server
app.use(express.json()); // Parse JSON bodies from incoming requests into req.body object

const collectDefaultMetrics = client.collectDefaultMetrics;
collectDefaultMetrics(); // Collect default metrics

// Create a new database connection
function getDbConnection() {
  // Use the Pool class to create a new database connection with the following configuration
  return new Pool({
    host: process.env.DB_HOST || "localhost", // Use the host from the environment variables, default to localhost
    port: process.env.DB_PORT || 5432, // Use the port from the environment variables, default to 5432
    database: process.env.DB_NAME || "feedapp", // Use the database from the environment variables, default to feedapp
    user: process.env.DB_USER || "postgres", // Use the user from the environment variables, default to postgres
    password: process.env.DB_PASSWORD || "postgres", // Use the password from the environment variables, default to postgres
    max: 1, // Only allow 1 connection to the database
    connectionTimeoutMillis: 150, // Give up after 150ms if no connection is available
  });
}

// -- ROUTES --
app.post("/posts", async (req, res) => {
  // Get the userId and content from the request body
  const { userId, content } = req.body;

  // If the userId or content is not provided, return a 400 error
  if (!userId || !content)
    return res.status(400).json({ error: "userId and content are required" });

  // If the content is longer than 280 characters, return a 400 error
  if (content.length > 280)
    return res.status(400).json({ error: "Post content cannot exceed 280 characters" });

  // Create a new database connection
  const db = getDbConnection();

  // Try to create a new post
  try {
    // Use the query method to insert a new post into the database
    const result = await db.query(
      "INSERT INTO posts (user_id, content) VALUES ($1, $2) RETURNING *",
      [userId, content],
    );
    // Return the created post
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating post:", err.message);
    // Return a 500 error if the post creation fails
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    // Close the database connection after the post is created
    await db.end();
  }
});

app.get("/feed", async (req, res) => {
  // Create a new database connection
  const db = getDbConnection();

  // Try to fetch the feed
  try {
    // Use the query method to fetch the feed from the database
    const result = await db.query(`
      SELECT
        posts.id,
        posts.user_id,
        posts.content,
        posts.created_at,
        users.username
      FROM posts
      JOIN users ON posts.user_id = users.id
      ORDER BY posts.created_at DESC
      LIMIT 20
    `);

    // Simulates a sequential scan on a large unindexed table
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Return the feed
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching feed:", err.message);
    // Return a 500 error if the feed fetching fails
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    // Close the database connection after the feed is fetched
    await db.end();
  }
});

app.get("/users/:id/posts", async (req, res) => {
  // Get the userId from the request parameters
  const userId = parseInt(req.params.id);

  // If the userId is not a number, return a 400 error
  if (isNaN(userId)) return res.status(400).json({ error: "Invalid user ID" });

  // Create a new database connection
  const db = getDbConnection();

  // Try to fetch the user's posts
  try {
    // Use the query method to fetch the user's posts from the database
    const result = await db.query(
      "SELECT * FROM posts WHERE user_id = $1 ORDER BY created_at DESC",
      [userId],
    );
    // Return the user's posts
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user posts:", err.message);
    // Return a 500 error if the user's posts fetching fails
    res.status(500).json({ error: "Something went wrong" });
  } finally {
    // Close the database connection after the user's posts are fetched
    await db.end();
  }
});

app.get("/metrics", async (req, res) => {
  // Set the content type to the Prometheus content type
  res.set("Content-Type", client.register.contentType);
  // Send the metrics
  res.send(await client.register.metrics());
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// -- START SERVER --
const PORT = process.env.PORT || 3000; // Use the port from the environment variables, default to 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`); // Log the port the server is running on
});

module.exports = app; // Export the Express server
