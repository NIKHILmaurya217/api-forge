# APIforge — College Mini Project

Automatic LLM model routing. Given a user prompt, APIforge classifies the task type, estimates complexity, scores all available free models, and sends the request to the best match. The routing decision is fully visible in the UI.

---

## Project Structure

```
api-forge/
├── backend/
│   ├── src/
│   │   ├── classifier.js     Task type detection + 0–100 complexity scoring
│   │   ├── router.js         100-point model scoring algorithm
│   │   ├── openrouter.js     OpenRouter API client (fetch free models + completions)
│   │   └── db.js             SQLite storage via better-sqlite3
│   ├── data/
│   │   └── apiforge.db       Auto-created on first run
│   ├── server.js             Express server (default port 4000)
│   ├── .env                  API key + port config  ← edit this
│   ├── .env.example          Template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx   Stats + charts
│   │   │   ├── Playground.jsx  Primary page — prompt + routing panel
│   │   │   ├── Models.jsx      Free model browser
│   │   │   ├── History.jsx     Request history table
│   │   │   └── About.jsx       Algorithm explanation
│   │   ├── components/
│   │   │   ├── Layout.jsx      Sidebar navigation
│   │   │   └── Toast.jsx       Notification system
│   │   ├── api.js              Fetch client (points to backend)
│   │   └── index.css           Design system + all styles
│   ├── index.html
│   └── package.json
├── .gitignore
├── README.md
└── APIforge_UI_College_Project_Addendum.md
```

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- An [OpenRouter](https://openrouter.ai/keys) account (free tier is sufficient)

---

## Setup

### 1. Install backend dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

Copy the example file and fill in your key:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env`:

```env
OPENROUTER_API_KEY=sk-or-...your key here...
PORT=4000
```
> **Note:** Port 4000 is the recommended default.

### 3. Install frontend dependencies

```bash
cd frontend
npm install
```

---

## Running

Open two terminals from the `api-forge/` folder:

**Terminal 1 — Backend:**
```bash
cd backend
npm start
# Server starts at http://localhost:4000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
# UI starts at http://localhost:5173 (or 5174 if 5173 is in use)
```

Then open the URL shown in the terminal output.

---

## How It Works

Each request goes through the following pipeline:

```
User Prompt
    ↓
Task Classification         (CODING / MATH / WRITING / ANALYSIS / GENERAL)
    ↓
Complexity Estimation        (0–100 score → LOW / MEDIUM / HIGH)
    ↓
Fetch Free Models            (OpenRouter API, cached 10 min)
    ↓
Score Every Model            (100-point breakdown per model)
    ↓
Select Highest Scorer        (fallback to 2nd/3rd if primary fails)
    ↓
Call Model via OpenRouter
    ↓
Store in SQLite + Respond
```

### Scoring Breakdown (100 pts total)

| Criterion | Max pts | How it's measured |
|---|---|---|
| Task compatibility | 40 | Does the model family match the detected task? |
| Context capacity | 30 | Does the model's context window fit the prompt? |
| Complexity fit | 30 | Is the model large enough for the complexity level? |

The model with the highest score is selected. This is not a claim that it is objectively "best" — it received the highest score under APIforge's defined criteria.

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/query` | Classify, route, and call a model |
| `GET` | `/api/models` | List free models from OpenRouter (cached) |
| `GET` | `/api/stats` | Dashboard statistics |
| `GET` | `/api/history` | Paginated request history |
| `GET` | `/api/history/:id` | Single request record |
| `GET` | `/api/health` | Health check |

---

## Pages

| Page | Description |
|---|---|
| **Playground** *(primary)* | Enter a prompt, see the routing decision, receive the response |
| **Dashboard** | Request count, average latency, fallbacks, activity chart, complexity distribution, model usage |
| **Models** | Searchable list of free models from OpenRouter with context window info |
| **History** | Table of all past requests; click a row to view full routing explanation |
| **About** | How the algorithm works, tech stack, limitations |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Node.js + Express |
| Database | SQLite (better-sqlite3) |
| LLM API | OpenRouter (free tier) |
| Frontend | React + Vite |
| Charts | Recharts |
| Icons | Lucide React |
| Font | Inter (Google Fonts) |

---

## Limitations

- Task classification uses keyword heuristics, not a trained model.
- Complexity estimation is rule-based, not empirically calibrated.
- Free model availability depends on OpenRouter's free tier, which changes over time.
- The routing algorithm has not been benchmarked against ground-truth data.

---

## Data & Privacy

All requests and responses are stored locally in `backend/data/apiforge.db`. No data is sent to any external service other than OpenRouter (which processes the prompt to generate a response).

---

## Uploading to GitHub

### What `.gitignore` excludes

| Path | Reason |
|---|---|
| `backend/.env` | Contains your secret API key |
| `backend/data/` | Local SQLite database (generated at runtime) |
| `node_modules/` | Installed via `npm install` |
| `frontend/dist/` | Build output, regenerated on demand |
| `.DS_Store`, `Thumbs.db` | OS metadata files |
| `.vscode/`, `.idea/` | Editor config files |

### First push

```bash
# Run from the api-forge/ root
git init
git add .
git commit -m "Initial commit — APIforge college mini project"
git branch -M main
git remote add origin https://github.com/<your-username>/api-forge.git
git push -u origin main
```

### For someone cloning this repo

```bash
git clone https://github.com/<your-username>/api-forge.git
cd api-forge

# Install dependencies
cd backend && npm install
cd ../frontend && npm install && cd ..

# Configure environment
cp backend/.env.example backend/.env
# Open backend/.env and add your own OpenRouter API key

# Start
cd backend && npm start        # Terminal 1 → http://localhost:4000
cd frontend && npm run dev     # Terminal 2 → http://localhost:5173
```
