import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import { Pool } from "pg";
import "dotenv/config";

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());

//---------------------------------
// Setup for PostgreSQL connection
//---------------------------------
const pool = new Pool({
  connectionString:
    process.env.NODE_ENV === "production"
      ? process.env.DATABASE_URL
      : process.env.DATABASE_PUBLIC_URL,
  ssl: { rejectUnauthorized: false },
});

// ----------------------------
// Helper functions
// ----------------------------
function analyzeString(value) {
  const length = value.length;
  const lower = value.toLowerCase();
  const is_palindrome = lower === lower.split("").reverse().join("");
  const unique_characters = new Set(value).size;
  const word_count = value.trim().split(/\s+/).filter(Boolean).length;
  const sha256_hash = crypto.createHash("sha256").update(value).digest("hex");

  const character_frequency_map = {};
  for (const ch of value) {
    character_frequency_map[ch] = (character_frequency_map[ch] || 0) + 1;
  }

  return {
    id: sha256_hash,
    value,
    properties: {
      length,
      is_palindrome,
      unique_characters,
      word_count,
      sha256_hash,
      character_frequency_map,
    },
  };
}

// ----------------------------
// POST /strings
// ----------------------------
app.post("/strings", async (req, res) => {
  const { value } = req.body;

  if (value === undefined)
    return res.status(400).json({ error: "Missing 'value' field" });
  if (typeof value !== "string")
    return res.status(422).json({ error: "'value' must be a string" });

  const analysis = analyzeString(value);
  const id = analysis.properties.sha256_hash;
  const created_at = new Date().toISOString();

  try {
    const existing = await pool.query("SELECT * FROM strings WHERE value = $1", [value]);
    if (existing.rows.length > 0)
      return res.status(409).json({ error: "String already exists" });

    await pool.query(
      `INSERT INTO strings (
        id, value, length, is_palindrome, unique_characters, word_count, sha256_hash, character_frequency_map, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        id,
        value,
        analysis.properties.length,
        analysis.properties.is_palindrome,
        analysis.properties.unique_characters,
        analysis.properties.word_count,
        analysis.properties.sha256_hash,
        JSON.stringify(analysis.properties.character_frequency_map),
        created_at,
      ]
    );

    res.status(201).json({
      id,
      value,
      properties: analysis.properties,
      created_at,
    });
  } catch (err) {
    console.error("Database error:", err.message);
    res.status(500).json({ error: "Database error", details: err.message });
  }
});


// ---------------------------------------
// GET /strings/filter-by-natural-language
// ---------------------------------------
app.get("/strings/filter-by-natural-language", async (req, res) => {
  const input = req.query.q?.toLowerCase();
  if (!input) return res.status(400).json({ error: "Missing query parameter (?q=...)" });

  let filters = {};
  try {
    // To Detect keywords
    if (input.includes("palindromic")) filters.is_palindrome = true;
    if (input.includes("single word")) filters.word_count = 1;

    // "longer than 5" or "more than 5"
    const lengthMatch = input.match(/(longer|more) than (\d+)/);
    if (lengthMatch) filters.min_length = parseInt(lengthMatch[2]);

    // For other word arrangements like: "letter a" or "contains a" or "with a"
    const charMatch = input.match(/(?:letter|contains|with)\s+([a-zA-Z])/);
    if (charMatch) filters.contains_character = charMatch[1];

    if (Object.keys(filters).length === 0)
      return res.status(400).json({ error: "Unable to interpret your query" });

    // Build SQL
    let sql = "SELECT * FROM strings";
    let conditions = [];
    let params = [];
    let i = 1;

    if (filters.is_palindrome !== undefined) {
      conditions.push(`is_palindrome = $${i++}`);
      params.push(filters.is_palindrome);
    }
    if (filters.word_count !== undefined) {
      conditions.push(`word_count = $${i++}`);
      params.push(filters.word_count);
    }
    if (filters.min_length !== undefined) {
      conditions.push(`length > $${i++}`);
      params.push(filters.min_length);
    }
    if (filters.contains_character) {
      conditions.push(`value ILIKE $${i++}`); // case-insensitive
      params.push(`%${filters.contains_character}%`);
    }

    if (conditions.length > 0) sql += " WHERE " + conditions.join(" AND ");

    const { rows } = await pool.query(sql, params);
    if (rows.length === 0)
      return res.status(404).json({ message: "No results found for your query" });

    res.json({
      interpreted_query: {
        original: input,
        parsed_filters: filters,
      },
      count: rows.length,
      data: rows.map((r) => ({
        id: r.id,
        value: r.value,
        properties: {
          length: r.length,
          is_palindrome: r.is_palindrome,
          unique_characters: r.unique_characters,
          word_count: r.word_count,
          sha256_hash: r.sha256_hash,
          character_frequency_map: r.character_frequency_map,
        },
        created_at: r.created_at,
      })),
    });
  } catch (err) {
    res.status(422).json({ error: "Could not process query", details: err.message });
  }
});


// ----------------------------
// GET /strings/:string_value
// ----------------------------
app.get("/strings/:string_value", async (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  try {
    const { rows } = await pool.query("SELECT * FROM strings WHERE value = $1", [str]);
    if (rows.length === 0) return res.status(404).json({ error: "String not found" });
    const row = rows[0];
    res.json({
      id: row.id,
      value: row.value,
      properties: {
        length: row.length,
        is_palindrome: row.is_palindrome,
        unique_characters: row.unique_characters,
        word_count: row.word_count,
        sha256_hash: row.sha256_hash,
        character_frequency_map: row.character_frequency_map,
      },
      created_at: row.created_at,
    });
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});

// ----------------------------
// GET /strings (with filters)
// ----------------------------
app.get("/strings", async (req, res) => {
  let sql = "SELECT * FROM strings";
  let conditions = [];
  let params = [];
  let i = 1;

  try {
    if (req.query.is_palindrome !== undefined) {
      const val = req.query.is_palindrome === "true";
      conditions.push(`is_palindrome = $${i++}`);
      params.push(val);
    }
    if (req.query.min_length) {
      const min = parseInt(req.query.min_length);
      if (isNaN(min)) return res.status(400).json({ error: "min_length must be a number" });
      conditions.push(`length >= $${i++}`);
      params.push(min);
    }
    if (req.query.max_length) {
      const max = parseInt(req.query.max_length);
      if (isNaN(max)) return res.status(400).json({ error: "max_length must be a number" });
      conditions.push(`length <= $${i++}`);
      params.push(max);
    }
    if (req.query.word_count) {
      const wc = parseInt(req.query.word_count);
      if (isNaN(wc)) return res.status(400).json({ error: "word_count must be a number" });
      conditions.push(`word_count = $${i++}`);
      params.push(wc);
    }
    if (req.query.contains_character) {
      const c = req.query.contains_character;
      if (c.length !== 1) return res.status(400).json({ error: "contains_character must be a single character" });
      conditions.push(`value LIKE $${i++}`);
      params.push(`%${c}%`);
    }

    if (conditions.length > 0) {
      sql += " WHERE " + conditions.join(" AND ");
    }

    const { rows } = await pool.query(sql, params);
    res.json({
      data: rows.map((r) => ({
        id: r.id,
        value: r.value,
        properties: {
          length: r.length,
          is_palindrome: r.is_palindrome,
          unique_characters: r.unique_characters,
          word_count: r.word_count,
          sha256_hash: r.sha256_hash,
          character_frequency_map: r.character_frequency_map,
        },
        created_at: r.created_at,
      })),
      count: rows.length,
      filters_applied: req.query,
    });
  } catch {
    res.status(400).json({ error: "Invalid query parameters" });
  }
});


// -------------------------------
// DELETE /strings/:string_value
// -------------------------------
app.delete("/strings/:string_value", async (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  try {
    const result = await pool.query("DELETE FROM strings WHERE value = $1 RETURNING *", [str]);
    if (result.rowCount === 0) return res.status(404).json({ error: "String not found" });
    res.status(204).send();
  } catch {
    res.status(500).json({ error: "Database error" });
  }
});


// To start server at the port
app.listen(port, () => console.log(`Server running on port ${port}`));
