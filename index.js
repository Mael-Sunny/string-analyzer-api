import express from "express";
import bodyParser from "body-parser";
import crypto from "crypto";
import cors from "cors";

const app = express();
// Use the environment port (Railway) or fallback to 3000 locally
const port = process.env.PORT || 3000;

// Middlewares
app.use(bodyParser.json());
app.use(cors()); // small addition to avoid CORS issues when testing

// In-memory store (works reliably on Railway)
let data = [];

// saveData is only a logger here (we're intentionally not using fs)
function saveData() {
  console.log("✅ Data updated:", data.length, "items");
}

// Analyze function (consistent field names)
function analyzeString(str) {
  const length = str.length;
  const isPalindrome = str === str.split("").reverse().join("");
  const words = str.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const uniqueChars = new Set(str).size;
  const frequency = {};
  for (const c of str) frequency[c] = (frequency[c] || 0) + 1;
  const sha256 = crypto.createHash("sha256").update(str).digest("hex");

  return { value: str, length, isPalindrome, wordCount, uniqueChars, frequency, sha256 };
}

// POST /strings
app.post("/strings", (req, res) => {
  // Defensive: ensure body is parsed
  if (!req.body) {
    console.log("⚠️ No body received");
    return res.status(400).json({ error: "Missing body" });
  }

  const raw = req.body.value;
  const value = typeof raw === "string" ? raw : raw === undefined ? undefined : String(raw);
  console.log("📦 Received POST body:", req.body);

  if (value === undefined || value === null || String(value).trim() === "") {
    return res.status(400).json({ error: "Missing value" });
  }

  if (typeof value !== "string") {
    return res.status(422).json({ error: "Not a string" });
  }

  // Duplicate check
  if (data.find((item) => item.value === value)) {
    return res.status(409).json({ error: "Already exists" });
  }

  // Analyze
  const analysis = analyzeString(value);
  console.log("🔍 Analysis result:", analysis);

  // Save in-memory
  data.push(analysis);
  saveData();
  console.log("📊 Current data array after push:", data);

  // Return the single analyzed object (201)
  res.status(201).json(analysis);
});

// Natural language filter – keep before param route
app.get("/strings/filter-by-natural-language", (req, res) => {
  const input = (req.query.q || "").toLowerCase().trim();

  if (!input) return res.status(400).json({ error: "Missing query text" });

  let results = data;

  try {
    if (input.includes("palindromic") || input.includes("palindrome")) {
      results = results.filter((item) => item.isPalindrome);
    }

    if (input.includes("single word")) {
      results = results.filter((item) => item.wordCount === 1);
    }

    const match = input.match(/longer than (\d+)/);
    if (match) {
      const len = parseInt(match[1], 10);
      results = results.filter((item) => item.length > len);
    }

    return res.json(results);
  } catch (err) {
    return res.status(422).json({ error: "Could not process query" });
  }
});

// GET single string by value
app.get("/strings/:string_value", (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  const found = data.find((item) => item.value === str);

  if (!found) return res.status(404).json({ error: "String not found" });

  res.json(found);
});

// GET all / filters
app.get("/strings", (req, res) => {
  try {
    let results = data;

    if (req.query.is_palindrome) {
      const val = req.query.is_palindrome === "true";
      results = results.filter((item) => item.isPalindrome === val);
    }

    if (req.query.min_length) {
      const len = parseInt(req.query.min_length, 10);
      if (isNaN(len)) return res.status(400).json({ error: "Bad query: min_length must be a number" });
      results = results.filter((item) => item.length >= len);
    }

    if (req.query.contains_character) {
      const ch = req.query.contains_character;
      results = results.filter((item) => item.value.includes(ch));
    }

    res.json(results);
  } catch (e) {
    res.status(400).json({ error: "Bad query" });
  }
});

// DELETE /strings/:string_value
app.delete("/strings/:string_value", (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  const index = data.findIndex((item) => item.value === str);

  if (index === -1) return res.status(404).json({ error: "String not found" });

  data.splice(index, 1);
  saveData();
  console.log("📊 Current data array after delete:", data);
  res.status(204).send();
});

// Start server on correct port
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
