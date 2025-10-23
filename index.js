import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import { Pool } from "pg";

const app = express();
const port = process.env.PORT || 3000;

// Set up PostgreSQL connection pool
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// String analysis logic (unchanged)
function analyzeString(str) {
  const length = str.length;
  const isPalindrome = str === str.split("").reverse().join("");
  const words = str.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const uniqueChars = new Set(str).size;
  const freq = {};
  for (const c of str) freq[c] = (freq[c] || 0) + 1;
  const hash = crypto.createHash("sha256").update(str).digest("hex");
  return { value: str, length, isPalindrome, wordCount, uniqueChars, freq, hash };
}

app.use(bodyParser.json());

// POST Endpoint: Add and analyze string
app.post("/strings", async (req, res) => {
  const { value } = req.body;
  if (!value) return res.status(400).json({ error: "Missing value" });
  if (typeof value !== "string") return res.status(422).json({ error: "Not a string" });

  const existing = await pool.query("SELECT value FROM strings WHERE value = $1", [value]);
  if (existing.rows.length) return res.status(409).json({ error: "Already exists" });

  const analysis = analyzeString(value);
  await pool.query(
    "INSERT INTO strings (value, length, is_palindrome, word_count, unique_chars, freq, hash) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [analysis.value, analysis.length, analysis.isPalindrome, analysis.wordCount, analysis.uniqueChars, analysis.freq, analysis.hash]
  );
  res.status(201).json(analysis);
});

// GET Endpoint: Natural language filter
app.get("/strings/filter-by-natural-language", async (req, res) => {
  const { query } = req;
  const input = query.q?.toLowerCase();
  if (!input) return res.status(400).json({ error: "Missing query text" });

  let sql = "SELECT * FROM strings";
  let conditions = [];
  let params = [];

  try {
    if (input.includes("palindromic")) {
      conditions.push("is_palindrome = TRUE");
    }
    if (input.includes("single word")) {
      conditions.push("word_count = 1");
    }
    const match = input.match(/longer than (\d+)/);
    if (match) {
      conditions.push("length > $1");
      params.push(Number(match[1]));
    }
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    res.status(422).json({ error: "Could not process query" });
  }
});

// GET Endpoint: Fetch info for one string
app.get("/strings/:string_value", async (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  const { rows } = await pool.query("SELECT * FROM strings WHERE value = $1", [str]);
  const found = rows[0];
  if (!found) return res.status(404).json({ error: "String not found" });
  res.json(found);
});

// GET Endpoint: Work with filters
app.get("/strings", async (req, res) => {
  try {
    let sql = "SELECT * FROM strings";
    let conditions = [];
    let params = [];
    let paramIndex = 1;

    if (req.query.is_palindrome) {
      conditions.push(`is_palindrome = $${paramIndex++}`);
      params.push(req.query.is_palindrome === "true");
    }
    if (req.query.min_length) {
      const len = parseInt(req.query.min_length);
      if (isNaN(len)) return res.status(400).json({ error: "Bad query: min_length must be a number" });
      conditions.push(`length >= $${paramIndex++}`);
      params.push(len);
    }
    if (req.query.contains_character) {
      conditions.push(`value LIKE $${paramIndex++}`);
      params.push(`%${req.query.contains_character}%`);
    }
    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (e) {
    res.status(400).json({ error: "Bad query" });
  }
});

// DELETE Endpoint: Remove a string
app.delete("/strings/:string_value", async (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  const result = await pool.query("DELETE FROM strings WHERE value = $1 RETURNING *", [str]);
  if (result.rowCount === 0) return res.status(404).json({ error: "String not found" });
  res.status(204).send();
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});