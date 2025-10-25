🧠 String Analyzer API

A simple Node.js + Express API that analyzes any given string and provides detailed insights, including:

Length of the string

Palindrome status (case-insensitive)

Word count

Unique characters

Frequency of each character

SHA256 hash for unique identification

This version uses PostgreSQL as the database

🌍 Live Demo

🚀 Deployed on Railway:
https://your-railway-app-name.up.railway.app

🧭 API Routes Overview
Method	Endpoint	Description
POST	/strings	Analyze and save a new string
GET	/strings	Get all stored strings (supports query filters)
GET	/strings/:string_value	Fetch details of one specific string
GET	/strings/filter-by-natural-language?q=...	Use natural language to filter strings
DELETE	/strings/:string_value	Delete a specific string
🚀 Features

Analyze any string completely

Check if it’s a palindrome

Count words and unique characters

Generate a SHA256 hash

Character frequency mapping

Filter using query parameters:

is_palindrome

min_length / max_length

word_count

contains_character

Natural language filtering

Delete stored strings

Persistent storage using PostgreSQL

⚙️ Setup Instructions
1. Clone the repository
git clone https://github.com/Mael-Sunny/string-analyzer-api.git
cd string-analyzer-api

2. Install dependencies
npm install

3. Configure environment variables

Create a .env file:

PORT=3000
NODE_ENV=development
DATABASE_PUBLIC_URL=<your-local-Railway-public-URL>
DATABASE_URL=<your-Railway-production-URL>

4. Run locally
node index.js


The API will run on:

http://localhost:3000

🧩 Endpoints Details
1️⃣ POST /strings

Analyze and store a string.

Request:

{
  "value": "madam"
}


Responses:

201 Created → Returns string analysis:

{
  "id": "sha256_hash_here",
  "value": "madam",
  "properties": {
    "length": 5,
    "is_palindrome": true,
    "unique_characters": 3,
    "word_count": 1,
    "sha256_hash": "sha256_hash_here",
    "character_frequency_map": {
      "m": 2,
      "a": 2,
      "d": 1
    }
  },
  "created_at": "2025-10-25T10:00:00Z"
}


400 Bad Request → Missing value field
422 Unprocessable Entity → value not a string
409 Conflict → String already exists

2️⃣ GET /strings

Fetch all analyzed strings, optionally with filters:

Query Parameters:

is_palindrome=true|false

min_length=<int> / max_length=<int>

word_count=<int>

contains_character=<single_character>

Example:

/strings?is_palindrome=true&min_length=5&contains_character=a


Response:

{
  "data": [ /* array of string objects */ ],
  "count": 3,
  "filters_applied": {
    "is_palindrome": true,
    "min_length": 5,
    "contains_character": "a"
  }
}


Error Handling:

400 Bad Request → Invalid query parameters

3️⃣ GET /strings/filter-by-natural-language

Use natural language phrases to filter strings:

Query Examples:

/strings/filter-by-natural-language?q=all single word palindromic strings
/strings/filter-by-natural-language?q=strings longer than 10 characters
/strings/filter-by-natural-language?q=strings containing the letter z
/strings/filter-by-natural-language?q=palindromic strings

Response:

{
  "data": [ /* array of matching strings */ ],
  "count": 2,
  "interpreted_query": {
    "original": "all single word palindromic strings",
    "parsed_filters": {
      "word_count": 1,
      "is_palindrome": true
    }
  }
}


Error Handling:

400 Bad Request → Query missing or unreadable
422 Unprocessable Entity → Parsed filters conflict

4️⃣ GET /strings/:string_value
Fetch analysis for a specific string (URL-encoded if needed).

Example:
/strings/hello%20world


Responses:

200 OK → Returns analysis object
404 Not Found → String does not exist

5️⃣ DELETE /strings/:string_value
Delete a stored string.

Example:
DELETE /strings/madam


Responses:

204 No Content → Successfully deleted
404 Not Found → String does not exist


☁️ Deployment (Railway)

Push your GitHub repo.
Connect repo to Railway.
Set environment variables (DATABASE_URL).
Deploy. Railway auto-detects package.json and runs node index.js.


🧑‍💻 Technologies Used

Node.js
Express.js
PostgreSQL
Crypto (SHA256 hashing)
Body-parser


🏁 Author
Sunday Igboke
Email: agentsmui@gmail.com
HNG Internship 2025 — Stage 1 Task