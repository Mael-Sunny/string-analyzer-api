# 🧠 String Analyzer API

This a simple Node.js + Express API that analyzes any given string and provides detailed insights such as its length, palindrome status, word count, unique characters, character frequency, and SHA256 hash.


## 🌍 Live Demo

> 🚀 Deployed on Railway:  
> https://your-railway-app-name.up.railway.app  


## 🧭 API Routes Overview

|  Method |  Endpoint  | Description
|---------|------------|-------------|
| **POST**| `/strings` | Analyze and save a new string |
| **GET** | `/strings` | Get all stored strings (supports filters) |
| **GET** | `/strings/:string_value` | Fetch details of one specific string |
| **GET** | `/strings/filter-by-natural-language?q=...` | Use natural language to filter strings |
| **DELETE** | `/strings/:string_value` | Delete a specific string |


## 🚀 Features

- Analyze any string completely  
- Check if it’s a palindrome  
- Count words and unique characters  
- Get frequency of each character  
- Generate SHA256 hash  
- Filter using query parameters  
- Natural language filtering  
- Delete stored strings  


## ⚙️ Setup Instructions

1. Clone the repository:
   ```bash
   git clone https://github.com/Mael-Sunny/string-analyzer-api.git

Navigate into the folder:

-- on your git bash terminal
cd string-analyzer-api

Install dependencies:

-- on your git bash terminal
npm install

Run locally:

-- on your git bash terminal
node index.js


----- The API will run on http://localhost:3000 -----

🧩 Endpoints Details
1️⃣ POST /strings
Analyze and store a string.

Example Request:

json

{ "value": "madam" }

Responses:
201 → Returns string analysis

400 → Missing value

422 → Not a string

409 → Already exists

2️⃣ GET /strings
Fetch all analyzed strings, optionally with filters.

Example:
/strings?is_palindrome=true&min_length=5&contains_character=a


Error Handling:

400 → Bad query

3️⃣ GET /strings/filter-by-natural-language

Use simple phrases to search for strings.

Examples:
/strings/filter-by-natural-language?q=all single word palindromic strings


Error Handling:
400 or 422 → Invalid or unreadable query

4️⃣ GET /strings/:string_value
Fetch analysis for a specific string.

Example:
/strings/hello

Error Handling:

404 → String not found

5️⃣ DELETE /strings/:string_value
Delete a stored string.

Example:
DELETE /strings/madam

Response:

204 → Successfully deleted

404 → String not found

☁️ Deployment (Railway)

🧑‍💻 Technologies Used
-- Node.js 
-- Express.js
-- Crypto (for SHA256 hashing)

------- Unlike the (file system) used as DB on the main. This branch uses Postgre as its database. Railway could write the FS (data.json)-----

🏁 Author
Sunday Igboke
agentsmui@gmail.com
HNG Internship 2025 — Stage 1 Task