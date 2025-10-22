import express from "express"
import bodyParser from "body-parser"
import crypto from "crypto"

const app = express();
const port = 3000;

// For Body parser to access the data in Json
app.use(bodyParser.json());

// To use in memory data instead of DB or file system (fs)... better railway performance
let data = [];

// To help save the data
function saveData() {
    console.log("✅ Data updated:", data.length, "items");
};

// Function to carry out analysis on string
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
};

// POST Endpoint for sending and analyzing string
app.post("/strings", (req, res) => {
  const { value } = req.body;

  if (!value) return res.status(400).json({ error: "Missing value" });
  if (typeof value !== "string") return res.status(422).json({ error: "Not a string" });

  if (data.find((item) => item.value === value))
    return res.status(409).json({ error: "Already exists" });

  const analysis = analyzeString(value);
  data.push(analysis);
  saveData();

  res.status(201).json(analysis);
});

//GET Endpoint for Filtering by natural Language 
// >>>> Reordered to prevent getting "404 error: string not found"
app.get("/strings/filter-by-natural-language", (req, res) => {
  const { query } = req;
  const input = query.q?.toLowerCase();

  if (!input) return res.status(400).json({ error: "Missing query text" });

  let results = data;

  try {
    if (input.includes("palindromic")) {
      results = results.filter((item) => item.isPalindrome);
    }

    if (input.includes("single word")) {
      results = results.filter((item) => item.wordCount === 1);
    }

    const match = input.match(/longer than (\d+)/);
    if (match) {
      const len = parseInt(match[1]);
      results = results.filter((item) => item.length > len);
    }

    res.json(results);
  } catch (err) {
    res.status(422).json({ error: "Could not process query" });
  }
});

// GET endpoint for a string_value
app.get("/strings/:string_value", (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  const found = data.find((item) => item.value === str);

  if (!found) return res.status(404).json({ error: "String not found" });

  res.json(found);
});

//GET Endpoint where filters can be utilized
app.get("/strings", (req, res) => {
  try {
    let results = data;

    if (req.query.is_palindrome) {
      const val = req.query.is_palindrome === "true";
      results = results.filter((item) => item.isPalindrome === val);
    }

    if (req.query.min_length) {
      const len = parseInt(req.query.min_length);
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


//DELETE Request for a string
app.delete("/strings/:string_value", (req, res) => {
  const str = decodeURIComponent(req.params.string_value);
  const index = data.findIndex((item) => item.value === str);

  if (index === -1) return res.status(404).json({ error: "String not found" });

  data.splice(index, 1);
  saveData();
  res.status(204).send();
});



app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});