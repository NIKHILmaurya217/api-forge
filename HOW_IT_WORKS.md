# 🔧 How APIforge Works — Plain English Guide

## The Big Picture

When you type a prompt into APIforge, here's what happens behind the scenes:

```
You type a prompt
      ↓
1. CLASSIFY  — What kind of task is this? (coding / math / writing / analysis / general)
      ↓
2. SCORE     — How complex is it? (1–100)
      ↓
3. ROUTE     — Which free AI model is best suited for this task?
      ↓
4. CALL      — Send the prompt to that model via OpenRouter
      ↓
5. RESPOND   — Return the answer + metadata to you
```

---

## Step 1 — Prompt Classification (`classifier.js`)

This is the most interesting part. The classifier reads your prompt and decides
**what category of task it is**.

### The 5 categories:

| Category | Examples |
|----------|---------|
| **CODING** | "Fix this Python bug", "Write a REST API", "Explain async/await" |
| **MATH** | "Solve this equation", "Calculate compound interest", "Prove this theorem" |
| **WRITING** | "Write a blog post", "Summarize this article", "Proofread my email" |
| **ANALYSIS** | "Compare React vs Vue", "What are the pros and cons of X", "Explain why Y happened" |
| **GENERAL** | Anything else — weather, opinions, general chat |

---

### How does it classify? — Two layers

#### 🧠 Layer 1: LLM Classifier (the new ML approach)

We send your prompt to a **small free AI model** (`liquid/lfm-2.5-2.6b:free`) running
on OpenRouter — the same API used to answer your actual prompts.

We ask it a **very specific question** with a strict system prompt:

```
System: "You are a task classifier. Given a user prompt, classify it into
         exactly one of: CODING, MATH, WRITING, ANALYSIS, GENERAL.
         Respond ONLY with: {"task":"CATEGORY"}"

User:   [your prompt, capped at 500 characters]
```

The model replies with something like:
```json
{"task":"CODING"}
```

We extract that label and use it. The whole call uses only **30 tokens max**,
so it's extremely fast and cheap (free, in fact).

**Why is this better than the old approach?**

The old classifier used keyword matching — it looked for words like "fix", "debug",
"function" to decide "this is CODING". That breaks easily:
- "Analyze this JavaScript function" → old: CODING (wrong), new: ANALYSIS (right)
- "Write a math essay" → old: confused, new: WRITING (correct)

The LLM **understands context**, not just keywords.

---

#### 🔄 Layer 2: Fallback Chain

If the LLM call fails for any reason (rate limit, timeout, model unavailable),
we automatically try the next model in line:

```
liquid/lfm-2.5-2.6b:free        ← try first (smallest, fastest)
        ↓ fails?
google/gemma-4-26b-a4b-it:free  ← try second
        ↓ fails?
qwen/qwen3.8-27b:free           ← try third
        ↓ all fail?
Regex keyword matching           ← last resort (the original approach)
```

This means **the server never crashes** due to classification failure. You always
get an answer.

---

## Step 2 — Complexity Scoring (`classifier.js`)

After classifying the task type, we also compute a **complexity score from 1 to 100**
using simple heuristics (this part is still rule-based, and that's fine):

| Signal | Points |
|--------|--------|
| Prompt length (word count) | 0–35 pts |
| Average word length (longer = harder vocabulary) | 0–20 pts |
| Number of sentences | 0–10 pts |
| Contains code blocks (``` or backticks) | +10 pts |
| Multiple questions (?) | +5 pts |
| Uses expert terms (distributed, async, neural, etc.) | +15 pts |
| Uses linking words (however, furthermore, etc.) | +10 pts |

**Score → Level:**
- 1–33 → **LOW**
- 34–66 → **MEDIUM**
- 67–100 → **HIGH**

---

## Step 3 — Model Routing (`router.js`)

Now we know: task type + complexity level. We use these to pick the **best free model**
from OpenRouter's live model list.

Each model gets a score out of 100:

```
Task compatibility    (0–40 pts)   Does this model family handle this task well?
                                   e.g. deepseek/qwen models score high for CODING
Context window        (0–30 pts)   Bigger context = can handle longer prompts
Complexity fit        (0–30 pts)   HIGH complexity needs a model with ≥32k context
```

The model with the **highest total score** gets chosen. If it fails (model down,
overloaded), the 2nd-best model is tried, then the 3rd.

---

## Step 4 — Calling the Model (`openrouter.js`)

Your actual prompt is sent to the chosen model via the OpenRouter API:

```
POST https://openrouter.ai/api/v1/chat/completions
{
  model: "deepseek/deepseek-r1:free",
  messages: [{ role: "user", content: "your prompt here" }],
  max_tokens: 2048
}
```

OpenRouter is a **free gateway** to dozens of AI models. It routes your request to
whichever provider hosts that model (Together AI, Fireworks, etc.).

---

## Step 5 — Billing & Storage (`billing.js`, `db.js`)

After getting the response:

1. **Token counting** — estimates how many input/output tokens were used
2. **Cost calculation** — converts tokens to credits (simulated billing)
3. **Database storage** — saves the full request+response to a local SQLite file
4. **Balance update** — deducts credits from your wallet atomically

---

## File Map

```
backend/
├── server.js              ← Express server, all API routes, orchestrates everything
├── src/
│   ├── classifier.js      ← ✨ LLM-powered task classification + complexity scoring
│   ├── router.js          ← Model scoring & selection logic
│   ├── openrouter.js      ← HTTP client for OpenRouter API (fetch models, send prompts)
│   ├── billing.js         ← Token estimation & credit cost calculation
│   ├── db.js              ← SQLite database (history, wallet, stats)
│   └── auth.js            ← JWT login/register
├── smoke-test.js          ← Quick test to verify the classifier is working
└── .env                   ← Your API keys (never committed to git!)
```

---

## The Full Flow in One Diagram

```
User prompt (e.g. "Fix my Python function")
         │
         ▼
┌─────────────────────┐
│   CLASSIFY (LLM)    │  → asks liquid/lfm-2.5-2.6b:free → gets {"task":"CODING"}
│   + COMPLEXITY      │  → counts words, checks for code blocks → score: 18 (LOW)
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   ROUTE             │  → scores all free models → picks deepseek-r1 (best for CODING)
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   CALL MODEL        │  → POST to openrouter.ai → gets the actual answer
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   SAVE & BILL       │  → stores to SQLite → deducts credits from wallet
└─────────────────────┘
         │
         ▼
      Response sent back to the frontend with:
      { task, complexity, level, selectedModel, response, tokens, cost }
```

---

## Quick FAQ

**Q: Does the LLM classifier cost money?**
A: No. `liquid/lfm-2.5-2.6b:free` is a free model on OpenRouter. It uses only
~30 tokens per classification, so even at paid rates it would cost fractions of a cent.

**Q: What if I'm offline or the classifier fails?**
A: It falls back to keyword regex matching automatically. The server never crashes.

**Q: Why not just let the main model classify too?**
A: The classification happens *before* we know which model to use — we need the
task type to *pick* the model. It's a chicken-and-egg problem, solved by using a
dedicated tiny classifier first.

**Q: Where are my API keys stored?**
A: In `backend/.env` locally. This file is in `.gitignore` and is **never uploaded
to GitHub**. Only `.env.example` (with placeholder values) is committed.
